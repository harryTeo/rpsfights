var mongoose = require("mongoose");
var User = require("../models/user");
var Game = require("../models/game");
var Tournament = require("../models/tournament");

// socket.io logic 

var onlineUsers = {
  totalOnlineUsers: 0, // Number of total online users (Auth + Unauth)
  onlineAuthenticatedUsers: [], // Array of IDs of all online Authenticated users
  searchingForOpponent: [], // Array of objects: IDs and socketIDs of (Authenticated) users searching for an opponent (normally, shouldn't contain more than 1 element)
  activeTimedGames: {} // Object of Objects representing each currently active timed game. Keys: gameId(string), Fields: players([player1Id, player2Id]), ...
};

// Close(<=>cancel) active timed games upon server reconnection 
Game.find({ category: {$gt: 0}, winnerId: { $exists: false }, endedAt: { $exists: false }  }, function(err, games) { 
	if (!err && games.length>0 ) { 
		for(var i=0; i<games.length; i++) {
	    games[i].endedAt = Date.now();
		  games[i].save();		    
		}
	}
});

// "connection" event
io.on('connection', function(socket){

  // General setup on every socket connection
  onlineUsers.totalOnlineUsers++;
  if(socket.request.user.logged_in) { // => authenticated user
    onlineUsers.onlineAuthenticatedUsers.push(socket.request.user._id.toString());
  }
  // console.log("Client IP Address: " + socket.request.connection.remoteAddress);
  // console.log(onlineUsers);

  // "join-room" event
  socket.on("join-room", function(room){
    socket.join(room, function(){

      io.to(room).emit("joined-room-msg", (socket.request.user.logged_in ? socket.request.user.name : socket.id) + " has joined the room");
      // socket.broadcast.to(room).emit("join-msg", 'a new user has joined the room'); // broadcast to everyone in the room (except for the user who initiated the emission)  

      var playerId = socket.request.user.logged_in ? socket.request.user._id.toString() : socket.id;

      if(onlineUsers.activeTimedGames[room] && onlineUsers.activeTimedGames[room].activePlayers.findIndex(function(elem){return elem===playerId;})>=0 && onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.findIndex(function(elem){return elem.playerId===playerId;})<0) { // Ensure that an active player has joined the room (<=> the game) for the first time
        onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.push({
          playerId: socket.request.user._id.toString(),
          socketId: socket.id
        });
      }

			// "start-new-round" event (as soon as both players are ready)
			socket.on("start-new-round", function(){
      	if(onlineUsers.activeTimedGames[room] && onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.findIndex(function(elem){return (elem.playerId===playerId && elem.socketId===socket.id);})>=0 && onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.findIndex(function(elem){return elem===playerId;})<0) { // Ensure that action is coming from an active player and also that the specific player has not already emitted the event
    			if(onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.length + 1 === 2) { // => Both Players Emitted the Event
    				io.to(room).emit("start-timer");
    				onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent = [];
    				onlineUsers.activeTimedGames[room].isFirstWeaponSelectionSavedInDatabase = false;
    				onlineUsers.activeTimedGames[room].currentEventStartTime = Date.now();
    				onlineUsers.activeTimedGames[room].timeMonitoringFunction = setTimeout(function(){ // If this event fires => at least one player didn't submit within time limits       					
    					io.to(room).emit("time-is-up-disable-buttons");
    				  // socket.to(onlineUsers.activeTimedGames[room].activePlayersSocketId[0]).emit("time-is-up-disable-buttons");
			        // socket.emit("time-is-up-disable-buttons"); 
			        if(!(onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.length===1 && !onlineUsers.activeTimedGames[room].isFirstWeaponSelectionSavedInDatabase)) { // => In this case no need to wait until player's weapon of choice is saved in database
							  Game.findOne({ _id: room }, function(err, game) {
									modifyGameOnTimeOutAndEmitCurrentGameState(err, game);
							  });
			        }
    					onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent = [];
    				}, onlineUsers.activeTimedGames[room].timerDuration);
    			}
    			else { // First Player to submit within time limits
    				onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.push(playerId);
    			}      			
      	}	
			});		

      // Check if "weaponSelection" is valid (within time limits) and emit corresponding time animation
			socket.on("weaponSelection", function(){
				var currentTimeInMiliseconds = Date.now();
				if(onlineUsers.activeTimedGames[room] && onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.findIndex(function(elem){return (elem.playerId===playerId && elem.socketId===socket.id);})>=0 && onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.findIndex(function(elem){return elem===playerId;})<0) { // Ensure that action is coming from an active player and also that the specific player has not already submited					
					console.log(currentTimeInMiliseconds - onlineUsers.activeTimedGames[room].currentEventStartTime); // Useful if speed matters...
					if(currentTimeInMiliseconds - onlineUsers.activeTimedGames[room].currentEventStartTime <= onlineUsers.activeTimedGames[room].timerDuration) { // Within time limits => Valid action 
						io.to(room).emit("validSelectionAnimation", playerId);
						if(onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.length + 1 === 2) { // => Both Players submited within time limits
							clearTimeout(onlineUsers.activeTimedGames[room].timeMonitoringFunction);
							onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent = [];
						}
						else { // First Player to submit within time limits
							onlineUsers.activeTimedGames[room].activePlayersCurrentlyEmittedEvent.push(playerId);
						}
					}
					else { // Out of time => Invalid action

					}
				}
			});		

			// Set "isFirstWeaponSelectionSavedInDatabase" to true upon this event. Will be useful if only one player submits
    	socket.on("weapon-selection-saved-in-database", function(){
				var currentTimeInMiliseconds = Date.now();
				if(onlineUsers.activeTimedGames[room] && onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.findIndex(function(elem){return (elem.playerId===playerId && elem.socketId===socket.id);})>=0) { // Ensure that action is coming from an active player
					if(currentTimeInMiliseconds - onlineUsers.activeTimedGames[room].currentEventStartTime > onlineUsers.activeTimedGames[room].timerDuration) { // => Current Round has already timed-out => game waits for this event in order to proceed
					  Game.findOne({ _id: room }, function(err, game) {
							modifyGameOnTimeOutAndEmitCurrentGameState(err, game);
					  });    			
    			}
    			else { // => Current round not expired yet => time-out function not fired yet => simply set "isFirstWeaponSelectionSavedInDatabase" value to true
    				onlineUsers.activeTimedGames[room].isFirstWeaponSelectionSavedInDatabase = true;
    			}
    		};
    	});				

      // "initializeToRockPosition" event
      socket.on("initializeToRockPosition", function(){
        // var url = socket.handshake.headers.referer;
        io.to(room).emit("initializeToRockPosition");
        // socket.broadcast.to(room).emit("initializeToRockPosition");
      });  

      // "weaponSelectionAnimation" event
      socket.on("weaponSelectionAnimation", function(data){
        io.to(room).emit("weaponSelectionAnimation", data);
        // socket.broadcast.to(room).emit("weaponSelectionAnimation", data);
      }); 

			// "interactionEmotion" event  
      socket.on("interactionEmotion", function(data){
      	data.emitterId = playerId;
      	if(onlineUsers.activeTimedGames[room]) { // => Game still active
      		if(onlineUsers.activeTimedGames[room].activePlayers.findIndex(function(elem){return elem===playerId;})>=0) { // => Event Emitted from Active Player => Animation already performed on emitter side => broadcast to everyone else except for emitter
      			socket.broadcast.to(room).emit("interactionEmotion", data);
      		}
      		// else { // => Event Emitted from Spectator => emit to everyone (including emitter)
      		// 	io.to(room).emit("interactionEmotion", data); // Not implementet so far
      		// }
      	}
      }); 	

      // "chatInput" event
      socket.on("chatInput", function(data){
      	data.emitterId = playerId;
      	if(onlineUsers.activeTimedGames[room]) { // => Game still active
      		if(onlineUsers.activeTimedGames[room].activePlayers.findIndex(function(elem){return elem===playerId;})>=0) { // => Event Emitted from Active Player => Animation already performed on emitter side => broadcast to everyone else except for emitter
      			socket.broadcast.to(room).emit("chatInput", data);
      		}
      		// else { // => Event Emitted from Spectator => emit to everyone (including emitter)
      		// 	io.to(room).emit("chatInput", data); // Not implementet so far
      		// }
      	}
      });   

      // in this case "disconnect" event only deals with the exit of the room
      socket.on("disconnect", function(){
        io.to(room).emit("left-room-msg", (socket.request.user.logged_in ? socket.request.user.name : socket.id) + " has left the room");
        if(onlineUsers.activeTimedGames[room] && onlineUsers.activeTimedGames[room].activePlayersCurrentlyJoined.findIndex(function(elem){return (elem.playerId===playerId && elem.socketId===socket.id);})>=0) { // => An active player has left the room (for the first time) => End game (with no winner)
        	clearTimeout(onlineUsers.activeTimedGames[room].timeMonitoringFunction);
				  Game.findOne({ _id: room }, function(err, game) {
					  if (!err && game && !game.winnerId && !game.endedAt ) { // => Game is still "active"
					  	io.to(room).emit("active-player-left-room", playerId);
					    game.endedAt = Date.now();
						  game.save(function(err, updatedGame) {
						    // if (!err) { 
						    	
						    // }
						  });					    
					  }    
				  });           	
        }
        if(onlineUsers.activeTimedGames[room] && !io.sockets.adapter.rooms[room]) { // => All players and visitors left the room => we can "deactivate" game by removing it from "activeTimedGames"
        	delete onlineUsers.activeTimedGames[room]; // Room is not considered "active" anymore
        }
      });

    });
  });

  socket.on("searhing-for-opponent", function() {
    if(socket.request.user.logged_in){ // Authenticated user
      if(onlineUsers.searchingForOpponent.length > 0) { // Someone is already waiting for an opponent
      	if(onlineUsers.searchingForOpponent.findIndex(function(elem){return elem.playerId===socket.request.user._id.toString();})<0) { // The player who emitted the event is not already in the searchingForOpponent "queue" 
	        var player1 = onlineUsers.searchingForOpponent.shift();
	        var player2Id = socket.request.user._id.toString();
	        socket.to(player1.socketId).emit("opponent-found");
	        socket.emit("opponent-found");        
	        // Initiate a New Game
			    var newGame = new Game({
			      category: 1,
			      // winningScore: 5,
			      prize: 10,
			      gameHistory: [{ playerId: player1.playerId, weaponsSequence:[] }, { playerId: player2Id, weaponsSequence:[] }]
			    });
			    newGame.save(function(err, result) {
			      // if (err) return res.status(500).render("error", { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
			      // Get "name" and "profilePictureUrl" of each opponent
			      User.find({_id:{$in:[mongoose.Types.ObjectId(player1.playerId), mongoose.Types.ObjectId(player2Id)]}}, function(err, users) {
			      	// if (err) return res.status(500).render("error", { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
			      	// if(users.length<2) {emit error}
			      	var player1Name = users[0]._id.toString()===player1.playerId ? users[0].name : users[1].name;
			      	var player1ProfilePictureUrl = users[0]._id.toString()===player1.playerId ? users[0].profilePictureUrl : users[1].profilePictureUrl;
			      	var player2Name = users[0]._id.toString()===player2Id ? users[0].name : users[1].name;
			      	var player2ProfilePictureUrl = users[0]._id.toString()===player2Id ? users[0].profilePictureUrl : users[1].profilePictureUrl;
			      	// Get total Fights and total Wins of each opponent
			      	Game.find({ "gameHistory.playerId":{$in: [player1.playerId.toString(), player2Id.toString()] } }, function(err, games) {
			      		var player1Fights = 0;
			      		var player1Wins = 0;
			      		var player2Fights = 0;
			      		var player2Wins = 0;		      		
			      		for(var i=0; i<games.length; i++){
			      			if(games[i].winnerId){ // Only take into account closed/finished games
			      				if(games[i].gameHistory[0].playerId===player1.playerId.toString() || games[i].gameHistory[1].playerId===player1.playerId.toString()){ 
			      					player1Fights++; 
			      					if(games[i].winnerId===player1.playerId.toString()) { player1Wins++; }
			      				}
			      				if(games[i].gameHistory[0].playerId===player2Id.toString() || games[i].gameHistory[1].playerId===player2Id.toString()){ 
			      					player2Fights++; 
			      					if(games[i].winnerId===player2Id.toString()) { player2Wins++; }
			      				}
			      			}
			      		}
				        socket.to(player1.socketId).emit("new-game", { newGameCategory: result.category, newGameId: result._id.toString(), opponentName: player2Name, opponentProfilePictureUrl: player2ProfilePictureUrl, opponentFights: player2Fights, opponentWins: player2Wins });
				        socket.emit("new-game", { newGameCategory: result.category, newGameId: result._id.toString(), opponentName: player1Name, opponentProfilePictureUrl: player1ProfilePictureUrl, opponentFights: player1Fights, opponentWins: player1Wins }); 
								onlineUsers.activeTimedGames[result._id.toString()] = { // Add the new activeTimedGames object with the newlly saved gameId as key and the following fields:
									activePlayers: [player1.playerId, player2Id],
									activePlayersCurrentlyJoined: [], // Array of max 2 objects with the fields: playerId and socketId of currently joined active players
									activePlayersCurrentlyEmittedEvent: [], // Will be used to synchronize events ("start-new-round" and "weaponSelection" event)
									isFirstWeaponSelectionSavedInDatabase: false, // Will be useful if only one player submits
									timerDuration: 10000 // The duration of each round (should coincide with css "timer-animation" duration)
									// currentEventStartTime: -> will be added dynamically
									// timeMonitoringFunction: -> will be added dynamically								
								}							
			      	});
			      });		      
			    });         
      	}
      }
      else { // First one waiting for an opponent
        onlineUsers.searchingForOpponent.push({
          playerId: socket.request.user._id.toString(),
          socketId: socket.id
        });
      } 
    }
  });

  socket.on("cancel-searhing-for-opponent", function(){
    if(socket.request.user.logged_in){ // Authenticated user
      var indexOfUser = onlineUsers.searchingForOpponent.findIndex(function(elem){ return elem.playerId === socket.request.user._id.toString();});
      if(indexOfUser >= 0) {
        onlineUsers.searchingForOpponent.splice(indexOfUser, 1);
      }
    }
  });

  // "disconnect" event
  socket.on("disconnect", function(){
    onlineUsers.totalOnlineUsers--;
    if(socket.request.user.logged_in) {
      onlineUsers.onlineAuthenticatedUsers.splice(onlineUsers.onlineAuthenticatedUsers.indexOf(socket.request.user._id.toString()), 1);
      var indexOfUser = onlineUsers.searchingForOpponent.findIndex(function(elem){ return elem.playerId === socket.request.user._id.toString();});
      if(indexOfUser >= 0) {
        onlineUsers.searchingForOpponent.splice(indexOfUser, 1);
      }      
    }    
  });

});

// Helper Function to modify (and save) game on timeout and emit the current game state
function modifyGameOnTimeOutAndEmitCurrentGameState(err, game) {
	if (!err && game && !game.winnerId) {
	  if(game.gameHistory[0].weaponsSequence.length === game.gameHistory[1].weaponsSequence.length) { // => none of the players submited on time
	  	game.gameHistory[0].weaponsSequence.push("");
	  	game.gameHistory[1].weaponsSequence.push("");
	  }							    
	  else if(game.gameHistory[0].weaponsSequence.length-game.gameHistory[1].weaponsSequence.length === 1){ // => player1 submited on time but player2 did not
	  	game.gameHistory[1].weaponsSequence.push("");
	  }
	  else if(game.gameHistory[1].weaponsSequence.length-game.gameHistory[0].weaponsSequence.length === 1) { // => player2 submited on time but player1 did not
	  	game.gameHistory[0].weaponsSequence.push("");
	  }
	  var winningScore = game.winningScore;
	  var currentRound = game.gameHistory[0].weaponsSequence.length;
	  var currentPlayer1Score = 0;
	  var currentPlayer2Score = 0;     
	  var winningWeapon = "";
	  for(var i=0; i<game.gameHistory[0].weaponsSequence.length; i++) {
	    winningWeapon = getWinningWeapon(game.gameHistory[0].weaponsSequence[i], game.gameHistory[1].weaponsSequence[i]);
	    if (winningWeapon === game.gameHistory[0].weaponsSequence[i]) { currentPlayer1Score += 1; }
	    else if (winningWeapon === game.gameHistory[1].weaponsSequence[i]) { currentPlayer2Score += 1; }
	  }
	  if (currentPlayer1Score === winningScore) { 
	    game.winnerId = game.gameHistory[0].playerId;
	    game.endedAt = Date.now();
	  }
	  else if (currentPlayer2Score === winningScore) { 
	    game.winnerId = game.gameHistory[1].playerId;
	    game.endedAt = Date.now();
	  }    
	  game.save(function(err, updatedGame) {
	    if (!err) { 
	    	io.to(game._id.toString()).emit("time-is-up-current-game-state", {leftPlayerId: game.gameHistory[0].playerId.toString(), player1Weapon: game.gameHistory[0].weaponsSequence[game.gameHistory[0].weaponsSequence.length-1], player2Weapon: game.gameHistory[1].weaponsSequence[game.gameHistory[1].weaponsSequence.length-1], winningScore: winningScore, currentRound: currentRound, currentPlayer1Score: currentPlayer1Score, currentPlayer2Score: currentPlayer2Score});
	    }
	  });   
	}
}

// Get Winning Choice/Weapon (or "tie")
function getWinningWeapon(choice1,choice2) {
  if(choice1===choice2) {
    return "tie";
  }
  if(choice1==="rock") {
    if(choice2==="scissors" || choice2==="") {
      return "rock";
    }
    else {
      return "paper";
    }
  }
  if(choice1==="paper") {
    if(choice2==="rock" || choice2==="") {
      return "paper";
    }
    else {
      return "scissors";
    }
  }
  if(choice1==="scissors") {
    if(choice2==="paper" || choice2==="") {
      return "scissors";
    }
    else {
      return "rock";
    }
  }
  if(choice1==="" && (choice2==="rock" || choice2==="paper" || choice2==="scissors")) {
    return choice2;
  }
}