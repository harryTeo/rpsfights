// Socket.io
var socket = io();
$(document).ready(function() {
  // Get the Game Id and join the corresponding room
  if($("#playground").length) { // => a Game page was loaded
  	var gameId = $("#playground").attr("data-game-id");
  	if(gameId!="demo") {
  		socket.emit("join-room", gameId);
  	}
  }
});
socket.on("joined-room-msg", function(msg){
	console.log(msg);
});
socket.on("left-room-msg", function(msg){
	console.log(msg);
});
socket.on("active-player-left-room", function(playerId){
	if($(".player").attr("data-player-id")===playerId) { 
		$(".player-image").parent().parent().fadeTo(200, 0.6); 
		$(".player-choice").fadeTo(200, 0.6);
	}
	else if($(".enemy").attr("data-enemy-id")===playerId) {
	 $(".enemy-image").parent().parent().fadeTo(200, 0.6);
	 $(".enemy-choice").fadeTo(200, 0.6); 
	}	
	$("#playground .player-game-buttons-container .btn-circle").blur().removeClass("keep-focus").prop("disabled", true);
	$("#playground .players-general-image-container.timed-game-image-container").removeClass("valid-selection-animation reverse-valid-timer-animation timer-animation reverse-timer-animation");	
	$("#playground .vs-span").fadeTo(400, 0);
	setTimeout(function(){ // Add the "Game Closed" div
		$(".game-closed-container").append('<div class="game-closed">Game Closed</div>').addClass("animated bounceIn");
	}, 200);	
});
socket.on("opponent-found", function(){
	$("#searchingForOpponentModal .cancelButtonContainer button").prop("disabled", true);
});
socket.on("new-game", function(data){
	$("#searchingForOpponentModal .finding-opponent").addClass("animated bounceOut");
	$("#searchingForOpponentModal .cancelButtonContainer").addClass("animated bounceOut");

	$("#searchingForOpponentModal .loaderContainer").css("opacity", 0);
	$("#searchingForOpponentModal .challenge-img").css("opacity", 0);
	$("#searchingForOpponentModal .opponent-img").attr("src", data.opponentProfilePictureUrl);
	$("#searchingForOpponentModal .opponent-img").load(function(){ $("#searchingForOpponentModal .opponent-img").css("opacity", 1); });
	$("#searchingForOpponentModal .opponent-username").text(data.opponentName);
	$("#searchingForOpponentModal .opponent-fights").text("Fights: " + data.opponentFights);
	if(Number(data.opponentFights)>0) {$("#searchingForOpponentModal .opponent-win-rate").text("Win Rate: " + Math.round((data.opponentWins/data.opponentFights)*100) + "%");}
	$("#searchingForOpponentModal .opponent-info-container").css("opacity", 1);	

	setTimeout(function(){ 
    $("#searchingForOpponentModal .finding-opponent").css("display", "none");
    $("#searchingForOpponentModal .cancelButtonContainer").css("display", "none");		
		$("#searchingForOpponentModal .ready-set-go").text("Ready").addClass("animated bounceIn");
		setTimeout(function(){
			$("#searchingForOpponentModal .ready-set-go").removeClass("bounceIn").addClass("zoomOut");
			setTimeout(function(){
				$("#searchingForOpponentModal .ready-set-go").removeClass("zoomOut").text("Set").addClass("bounceIn");
				setTimeout(function(){
					$("#searchingForOpponentModal .ready-set-go").removeClass("bounceIn").addClass("zoomOut");
					setTimeout(function(){
						$("#searchingForOpponentModal .ready-set-go").removeClass("zoomOut").text("Go!").addClass("bounceIn");
							setTimeout(function(){
								if(data.newGameCategory===1){ // => "head-to-head" game
									window.location.href = "/head-to-head/" + data.newGameId;
								}		
								// $("#searchingForOpponentModal").modal("hide");
							}, 250);						
					}, 400);
				}, 500);				
			}, 400);
		}, 500);
	}, 1750);
});
socket.on("start-timer", function(data){
	$("#playground .player-game-buttons-container .btn-circle").blur().removeClass("keep-focus").prop("disabled", false);	
	$("#playground .players-general-image-container.timed-game-image-container").removeClass("valid-selection-animation reverse-valid-timer-animation timer-animation reverse-timer-animation");
	$("#playground .players-general-image-container.timed-game-image-container").addClass("timer-animation");
});
socket.on("time-is-up-disable-buttons", function(){
	$("#playground .player-game-buttons-container .btn-circle").blur().removeClass("keep-focus").prop("disabled", true);
});
socket.on("time-is-up-current-game-state", function(data){
	var playerId = $(".player").attr("data-player-id");
	var isActivePlayer = ($(".player").attr("data-is-active-player") === "true");
	if(playerId===data.leftPlayerId){ // Maintain the order of player1 data and player2 data
		updateGameState(data.player1Weapon, data.player2Weapon, data.winningScore, data.currentRound, data.currentPlayer1Score, data.currentPlayer2Score, isActivePlayer);
	}
	else{ // Reverse player1 data with player2 data
		updateGameState(data.player2Weapon, data.player1Weapon, data.winningScore, data.currentRound, data.currentPlayer2Score, data.currentPlayer1Score, isActivePlayer);
	}
});
socket.on("validSelectionAnimation", function(playerId){
	if($(".player").attr("data-player-id")===playerId) { validSelectionAnimation($(".player-image").parent()); }
	else if($(".enemy").attr("data-enemy-id")===playerId) { validSelectionAnimation($(".enemy-image").parent()); }
});
socket.on("initializeToRockPosition", function(){
  initializeToRockPosition();
});
socket.on("weaponSelectionAnimation", function(data){
	var playerId = $(".player").attr("data-player-id");
	var isActivePlayer = ($(".player").attr("data-is-active-player") === "true");
	if(playerId===data.leftPlayerId) { // No need to change data order
		weaponSelectionAnimation(data.playerWeapon, data.enemyWeapon, data.timeoutDuration, data.winningScore, data.currentRound, data.currentPlayerScore, data.currentEnemyScore, isActivePlayer);
	}
	else { // In this case reverse player data with enemy data
		weaponSelectionAnimation(data.enemyWeapon, data.playerWeapon, data.timeoutDuration, data.winningScore, data.currentRound, data.currentEnemyScore, data.currentPlayerScore, isActivePlayer);
	}
});
socket.on("interactionEmotion", function(data){ // Reminder: This event was broadcasted (to everyone in the room except for the emitter)
	if($(".player").attr("data-player-id")===data.emitterId) { 
		interactionEmotionAnimation(data.timeId, data.btnPressDuration, data.emotionImageSrc, data.emotionImageAlt, data.xPosRand, data.yPosRand, "player");
	}
	else if($(".enemy").attr("data-enemy-id")===data.emitterId) {
		interactionEmotionAnimation(data.timeId, data.btnPressDuration, data.emotionImageSrc, data.emotionImageAlt, data.xPosRand, data.yPosRand, "enemy");
	}
	// else { // Event emitted by a Spectator
	// 	// Not implemented so far
	// 	interactionEmotionAnimation(data.timeId, data.btnPressDuration, data.emotionImageSrc, data.emotionImageAlt, data.xPosRand, data.yPosRand, "spectator");
	// }
});
socket.on("chatInput", function(data){ // Reminder: This event was broadcasted (to everyone in the room except for the emitter)
	if($(".player").attr("data-player-id")===data.emitterId) { 
		chatInputAnimation(data.timeId, data.chatMsg, "player");
	}
	else if($(".enemy").attr("data-enemy-id")===data.emitterId) {
		chatInputAnimation(data.timeId, data.chatMsg, "enemy");
	}
	// else { // Event emitted by a Spectator
	// 	// Not implemented so far
	// 	chatInputAnimation(data.timeId, data.chatMsg, "spectator");
	// }
});
// Handle failure to connect to server (e.g. when server is down)
socket.once("connect_error", function(error) { 
  // console.log("Failed to connect to server");
	if($("#playground").length) { // => Game Page
		if($("#playground").attr("data-game-id") != "demo") { 
			if(($("#searchingForOpponentModal").data("bs.modal") || {}).isShown){
				$("#searchingForOpponentModal").modal("hide");
			}
			if(($("#gameOverModal").data("bs.modal") || {}).isShown){
				$("#gameOverModal").modal("hide");
			}			
			connect_error_template("playground");
		}
	}
	socket.once("reconnect", function() { // This event will only fire once, once reconnected
	  // console.log("reconnected"); 
	  window.location.reload(); // Refresh Page on reconnection
	});  
});
function connect_error_template(parentElemById) {
	$("#" + parentElemById).fadeOut(500);
	setTimeout(function(){
		$("#" + parentElemById).remove();
		$("body").append('<div div id="error" style="opacity:0;">' +
											'<div class="container">' +
												'<div class="row">' +
													'<div class="col-xs-12 text-center">' +
														'<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
														'<h1>ERROR <span>500</span></h1>' +
														'<p>Internal Server Error</p>' +
														'<p class="error-sub1">This is not your fault.</p>' +
														'<p class="error-sub2">We are working hard</p>' +
														'<p class="error-sub3">to fix the problem</p>' +
														'<p class="error-sub4">asap</p>' +
														'<p class="error-sub-icon"><i class="fa fa-heart animated infinite pulse" aria-hidden="true"></i></p>' +
													'</div>' +
												'</div>' +
											'</div>' +
										'</div>');
		$("#error").fadeTo(500, 1);	
	}, 500);
}

// Initialize Bootstrap Tooltips
$('[data-toggle="tooltip"]').tooltip();

// The following chunk of code is to simply remove the "#_=_" which appears in url after a facebook login (aesthetical reasons only)
if (window.location.hash == '#_=_'){
	// Check if the browser supports history.replaceState
	if (history.replaceState) {
		// Keep the exact URL up to the hash
		var cleanHref = window.location.href.split('#')[0];
		// Replace the URL in the address bar without messing with the back button.
		history.replaceState(null, null, cleanHref);
	} 
	else {
		// Well, you're on an old browser, we can get rid of the _=_ but not the #
		window.location.hash = '';
	}
}

// Star-Rating Configuration - Reviews Section in About Page
$("#ratingStarsInput").rating({
	min:0, 
	max:5, 
	step:1, 
	size:'md',
	emptyStar: '<i class="fa fa-star-o" aria-hidden="true"></i>',
	filledStar: '<i class="fa fa-star" aria-hidden="true"></i>',
	starCaptions: function(val) {
		if (val<=1) {
			return "Very Poor";
		} 
		else if (val<=2) {
			return "Poor";
		}
		else if (val<=3) {
			return "Good";
		}
		else if (val<=4) {
			return "Very Good";
		}
		else {
			return "Excellent";
		}        
	},
	starCaptionClasses: function(val) {
		if (val<=0) {
			return "caption-general-class caption0-color";
		} 
		else if (val<=1) {
			return "caption-general-class caption1-color";
		}
		else if (val<=2) {
			return "caption-general-class caption2-color";
		}
		else if (val<=3) {
			return "caption-general-class caption3-color";
		}
		else if (val<=4) {
			return "caption-general-class caption4-color";
		}
		else {
			return "caption-general-class caption5-color";
		}        
	},
	showClear: false
});
$("#ratingStarsAverage").rating({
	min:0, 
	max:5, 
	step:0.1, 
	size:'xs',
	emptyStar: '<i class="fa fa-star-o" aria-hidden="true"></i>',
	filledStar: '<i class="fa fa-star" aria-hidden="true"></i>',
	showCaption: false,
	showClear: false,
	displayOnly: true,
});
$(".ratingStarsReview").rating({
	min:0, 
	max:5, 
	step:1, 
	size:'xxs',
	emptyStar: '<i class="fa fa-star-o" aria-hidden="true"></i>',
	filledStar: '<i class="fa fa-star" aria-hidden="true"></i>',
	showCaption: false,
	showClear: false,
	displayOnly: true,
});
$("#ratingStarsInput").on("rating.change", function(event, value, caption) {
	console.log(value);
});

// Handle the onError event for an image (Profile Picture) to reassign its source
// function profilePictureError(image) {
//   image.onerror = "";
//   image.src = "/images/users/user.png";
// }

// Handle the onload event for images
// function onImageLoad(image) {
// 	image.style.opacity = 1;
// }

/*
// Navbar
*/

$(".navbar-brand").click(function(event){
	if($(this).attr("href")===window.location.pathname) { event.preventDefault(); }
});
$(".nav-link").click(function(event){
	if($(this).attr("href")===window.location.pathname) { event.preventDefault(); }
});

/*
// Home Page
*/

$("#game-menu-human-vs-human").parent().click(function(event){
	if($(this).attr("href")==="#") { event.preventDefault(); }
});
$("#game-menu-tournament").parent().click(function(event){
	if($(this).attr("href")==="#") { event.preventDefault(); }
});
$(document).ready(function() {
  if($("#homepage").length) { // => homepage was loaded
  	var tournamentStartTime = $("#timeToNextTournament").attr("data-tournament-start-time");
  	var tournamentEndTime = $("#timeToNextTournament").attr("data-tournament-end-time");
  	var tournamentCountdownArray = tournamentCountdown(tournamentStartTime, tournamentEndTime);
  	if(tournamentCountdownArray[0]===0) { $("#timeToNextTournament").html('Next tournament starts in <strong>' + tournamentCountdownArray[1] + '</strong>'); }
  	else if(tournamentCountdownArray[0]===1){ $("#timeToNextTournament").html('Last tournament ended <strong>' + tournamentCountdownArray[1] + '</strong> ago'); }
  	else if(tournamentCountdownArray[0]===2){ $("#timeToNextTournament").html('Tournament <strong>in progress</strong>'); }

  	var tempTournamentCountdownArray;

  	setInterval(function(){ 
	  	tournamentStartTime = $("#timeToNextTournament").attr("data-tournament-start-time");
	  	tournamentEndTime = $("#timeToNextTournament").attr("data-tournament-end-time");
	  	tempTournamentCountdownArray = tournamentCountdown(tournamentStartTime, tournamentEndTime);
	  	if(tempTournamentCountdownArray[0]!=tournamentCountdownArray[0] || tempTournamentCountdownArray[1]!=tournamentCountdownArray[1]) {
	  		tournamentCountdownArray = tempTournamentCountdownArray;
		  	if(tournamentCountdownArray[0]===0) { $("#timeToNextTournament").html('Next tournament starts in <strong>' + tournamentCountdownArray[1] + '</strong>'); }
		  	else if(tournamentCountdownArray[0]===1){ $("#timeToNextTournament").html('Last tournament ended <strong>' + tournamentCountdownArray[1] + '</strong> ago'); }
		  	else if(tournamentCountdownArray[0]===2){ $("#timeToNextTournament").html('Tournament <strong>in progress</strong>'); }
	  	}		
  	}, 1000);
  }
});
// Get current tournamentCountdown. This function returns [tournamentState, timeDiffText], where tournamentState ->  0: "upcoming", 1: "ended", 2: "in progress" and timeDiffText -> the time difference between current time and last tournament event
function tournamentCountdown(tournamentStartTime, tournamentEndTime) {
  var timeDiffInSeconds = tournamentEndTime ? Math.ceil((Date.now()-tournamentEndTime)/1000) : Math.ceil((tournamentStartTime - Date.now())/1000);
  var timeDiffInMinutes = Math.ceil(timeDiffInSeconds/60);  	
  var timeDiffInHours = Math.floor(timeDiffInMinutes/60);
  var timeDiffInDays = Math.floor(timeDiffInHours/24);
  var timeDiffText = ""; 

  if (timeDiffInDays>1) { timeDiffText = timeDiffInDays + " days"; }
  else if (timeDiffInHours>1) { timeDiffText = timeDiffInHours + " hours"; }
  else if (timeDiffInMinutes>1) { timeDiffText = timeDiffInMinutes + " minutes"; }
  else if (timeDiffInMinutes===1) { 
  	if(timeDiffInSeconds>10) { timeDiffText = "less than a minute"; }
  	else { timeDiffText = "a few seconds"; }
  }

  var tournamentState; // 0: "upcoming", 1: "ended", 2: "in progress"
  if(tournamentEndTime) { tournamentState = 1; } // tournament ended
  else { // => tournament not ended yet
		if (timeDiffInSeconds>0) { tournamentState = 0; } // upcoming tournament(0)
		else { tournamentState = 2; } // tournament in progress
  }

  return [tournamentState, timeDiffText];
}

/*
// Game Page
*/

// Countdown (via background-color) Animation
// var countdownAnimationSetInterval;
// var countdownAnimationDuration = 5000;
// var countdownAnimationCurrentValuePlayer = countdownAnimationDuration;
// var countdownAnimationCurrentValueEnemy = countdownAnimationDuration;
// var countdownAnimationStep = 20;

// function countdownAnimationFunction(elem) {
// 	if(elem.has(".player-image").length){
// 		elem.css("background","linear-gradient(#333 " + (countdownAnimationCurrentValuePlayer/countdownAnimationDuration)*100 + "%, #ff4d4d " + (countdownAnimationCurrentValuePlayer/countdownAnimationDuration)*100 + "%)");
// 	  countdownAnimationCurrentValuePlayer -= countdownAnimationStep;
// 	  if(countdownAnimationCurrentValuePlayer < 0) clearInterval(countdownAnimationSetIntervalPlayer);
// 	}
// 	if(elem.has(".enemy-image").length){
// 		elem.css("background","linear-gradient(#333 " + (countdownAnimationCurrentValueEnemy/countdownAnimationDuration)*100 + "%, #ff4d4d " + (countdownAnimationCurrentValueEnemy/countdownAnimationDuration)*100 + "%)");
// 	  countdownAnimationCurrentValueEnemy -= countdownAnimationStep;
// 	  if(countdownAnimationCurrentValueEnemy < 0) clearInterval(countdownAnimationSetIntervalEnemy);
// 	}	
// }

$(window).load(function() {
	if($("#playground").length) { // => a Game page was loaded
		$(".player-image").addClass("rollFromLeft");
		$(".enemy-image").addClass("rollFromRight");
		$(".player-choice-rock").fadeTo(150,1);
		$(".enemy-choice-rock").fadeTo(150,1);
		$(".interaction-buttons-container").fadeTo(400,1);
		$(".player-game-buttons-container").fadeTo(400,1);
		$(".interaction-chat-input-container").fadeTo(400,1);
		if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true") { // => Timed Game (for all viewers Active and Non-Active)
			setTimeout(function(){
				$("#playground .players-general-image-container.timed-game-image-container").css({"borderWidth": "3px", "backgroundColor": "#333"});
			}, 1000);
		}
		if($("#playground").attr("data-is-game-closed") != "true" && $(".player").attr("data-is-active-player") === "true") { // Game NOT already closed and Active Player
			setTimeout(function(){
				$(".player-game-buttons-container button").addClass("animated tada"); 
				setTimeout(function(){
					$(".player-game-buttons-container button").removeClass("animated tada"); 
					if(Number($("#playground").attr("data-game-category")) != 0) { // Timed games only if game category is NOT 0 (<=> not "against-the-machine")
						socket.emit("start-new-round");
						// countdownAnimationSetIntervalPlayer = setInterval(function(){countdownAnimationFunction($(".player-image").parent());}, countdownAnimationStep);
						// countdownAnimationSetIntervalEnemy = setInterval(function(){countdownAnimationFunction($(".enemy-image").parent());}, countdownAnimationStep);
			  	}
			  	else { // Not a timed game
			  		$("#playground .player-game-buttons-container .btn-circle").prop("disabled", false);
			  	}
				}, 1000);
			}, 1000);			
		}
	}
});

// Game Page - Interaction Emotions Button Click
var interactionBtnMousedownAt; // Will be used in order to time button press duration
$(".interaction-btn").on("mousedown", function () {
	interactionBtnMousedownAt = Date.now();
}).on("mouseup", function () {
	var timeId = Date.now();
	var btnPressDuration = timeId - interactionBtnMousedownAt;
	var emotionImageSrc = $(this).find("img").attr("src");
	var emotionImageAlt = $(this).find("img").attr("alt");	
	var xPosRand = Math.random();
	var yPosRand = Math.random();	
	if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true") { // => Timed Game (for all viewers Active and Non-Active(spectators))
		if($(".player").attr("data-is-active-player") === "true") { // => (Active) Player mode
			interactionEmotionAnimation(timeId, btnPressDuration, emotionImageSrc, emotionImageAlt, xPosRand, yPosRand, "player");
			socket.emit("interactionEmotion", {timeId: timeId, btnPressDuration: btnPressDuration, emotionImageSrc: emotionImageSrc, emotionImageAlt: emotionImageAlt, xPosRand: xPosRand, yPosRand: yPosRand});
		}
		// else { // => Spectator mode
		// 	// Not implemented so far
		// 	socket.emit("interactionEmotion", {timeId: timeId, btnPressDuration: btnPressDuration, emotionImageSrc: emotionImageSrc, emotionImageAlt: emotionImageAlt, xPosRand: xPosRand, yPosRand: yPosRand});			
		// }
	}
});
// Game Page - "interactionEmotionAnimation" Function -> Note that bubbleClass should only be: "player", "enemy" or "spectator"
function interactionEmotionAnimation(timeId, btnPressDuration, emotionImageSrc, emotionImageAlt, xPosRand, yPosRand, bubbleClass) {
	var windowWidth = $(window).width();
	var maxImgDim = windowWidth<768 ? 80 : (windowWidth<992 ? 100 : 128);
	var minImgDim = windowWidth<768 ? 28 : 32;
	var imgDim = Math.min(maxImgDim, Math.floor(minImgDim + (btnPressDuration/5000)*(maxImgDim-minImgDim))); // => maxImgDim occurs when btnPressDuration >= 5000ms
	var xPosMin = windowWidth<768 ? -50 : (windowWidth<992 ? -150 : (windowWidth<1200 ? -200 : -275));
	var xPosMax = windowWidth<768 ? -22 : (windowWidth<992 ? -100 : -150);
	var yPosMin = -90;
	var yPosMax = windowWidth<768 ? (imgDim<64 ? -10 : -30) : (imgDim<64 ? 10 : -10);	
	var xPos = xPosMin + Math.round((xPosMax-xPosMin)*xPosRand);
	var yPos = yPosMin + Math.round((yPosMax-yPosMin)*yPosRand);
	var xPosDirection = bubbleClass==="player" ? "left" : "right";
	var animatedEntranceClass = bubbleClass==="player" ? "zoomInLeft" : "zoomInRight";

	$(".messages-container").append("<div id=" + timeId + " class='messages-container-aux'><div class='message-general chat-bubble " + bubbleClass + "-bubble' style='" + xPosDirection + ":" + xPos + "px; top:" + yPos + "px;'><img width=" + imgDim + " height=" + imgDim + " src=" + emotionImageSrc + " alt=" + emotionImageAlt +" /></div></div>");	

	$("#"+timeId + " .chat-bubble").addClass("animated " + animatedEntranceClass);
	setTimeout(function(){
		$("#"+timeId + " .chat-bubble").removeClass(animatedEntranceClass).addClass("bounceOut");
		setTimeout(function(){
			$("#"+timeId).remove();
		}, 1000);
	}, 1000);	
}

// Game Page - Chat Input Enter(submit) or Esc(delete input content and blur) actions
$("#interaction-chat-input").keyup(function(event) {
	var key = event.keyCode || event.which;
  if(key === 13) { // enter(return) key maps to keycode 13 => submit message
    chatInputSubmit();
  }
  else if(key === 27) { // escape key maps to keycode 27 => delete input content and blur(remove focus)
  	$("#interaction-chat-input").val("");
  	$("#interaction-chat-input-char-counter").text("0/50");
  	$("#interaction-chat-input").blur();
  }
});
// Game Page - Char Input Letter Counter
$("#interaction-chat-input").on("input", function(){ // This function triggers whenever there is a change in input
	var currentInputLength = $("#interaction-chat-input").val().length;
	$("#interaction-chat-input-char-counter").text(currentInputLength + "/50");
});
$("#interaction-chat-input").on("focus", function() {
  if($("#interaction-chat-input").val().length===0){ $("#interaction-chat-input-char-counter").fadeIn(400); }
});
$("#interaction-chat-input").on("blur", function() {
  if($("#interaction-chat-input").val().length===0){ $("#interaction-chat-input-char-counter").fadeOut(400); }
});
// Game Page - Chat Input Send Button Click
$("#interaction-chat-input-send-btn").on("click", function() {
	if($("#interaction-chat-input").val().length===0) { $("#interaction-chat-input-char-counter").fadeOut(400); }
	else { $("#interaction-chat-input-char-counter").css("display", "none"); }
	chatInputSubmit();
});
// Game Page - Interaction Chat Input Button "mouseenter" and "mouseleave" events (simply for visual purposes)
$("#interaction-chat-input-send-btn").on("mouseenter", function(){
  $("#interaction-chat-input-send-btn .fa").addClass("tada");
  setTimeout(function(){ $("#interaction-chat-input-send-btn .fa").removeClass("tada"); }, 1000);
});
// Game Page - "chatInputSubmit" Function
function chatInputSubmit() {
	var chatMsg = $("#interaction-chat-input").val().trim();
	$("#interaction-chat-input").val("");
	$("#interaction-chat-input-char-counter").text("0/50");
	if(chatMsg && chatMsg.length<=50) {
		var timeId = Date.now();
		if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true") { // => Timed Game (for all viewers Active and Non-Active(spectators))
			if($(".player").attr("data-is-active-player") === "true") { // => (Active) Player mode
				chatInputAnimation(timeId, chatMsg, "player");
				socket.emit("chatInput", {timeId: timeId, chatMsg: chatMsg});
			}
			// else { // => Spectator mode
			// 	// Not implemented so far
			// 	socket.emit("chatInput", {timeId: timeId, chatMsg: chatMsg});
			// }
		}	
		$("#interaction-chat-input-send-btn .fa").removeClass("tada");
		$("#interaction-chat-input-send-btn .fa").addClass("bounceOut");
		setTimeout(function(){
			$("#interaction-chat-input-send-btn .fa").removeClass("bounceOut");
			$("#interaction-chat-input-send-btn .fa").addClass("bounceIn");
			setTimeout(function(){
				$("#interaction-chat-input-send-btn .fa").removeClass("bounceIn");
			}, 700);
		}, 900);
	}	
}
// Game Page - "chatInputAnimation" Function -> Note that bubbleClass should only be: "player", "enemy" or "spectator"
function chatInputAnimation(timeId, chatMsg, bubbleClass) {
	$(".messages-container").append("<div id=" + timeId + " class='messages-container-aux'><div class='message-general chat-bubble " + bubbleClass + "-bubble " + bubbleClass + "-bubble-animation'>" + chatMsg + "</div></div>");
	setTimeout(function(){ $("#"+timeId).remove(); }, 5000); // Note: setTimeout duration should be >= playerBubbleAnimation & enemyBubbleAnimation duration	
}


// Game Page - Weapon Choice
$(".player-game-buttons-container button").click(function(event){
	$(this).addClass("keep-focus");
	$("#playground .player-game-buttons-container .btn-circle").prop("disabled", true);

	if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true" && $(".player").attr("data-is-active-player") === "true") { // <=> Not "against-the-machine" && Active Game && Active Player ( => Timed Game )
		socket.emit("weaponSelection"); // Check if "weaponSelection" is valid (within time limits) and emit corresponding time animation
	}

	// var currentPlayerWeaponSrc = $(".player-choice").attr("src");
	// var currentEnemyWeaponSrc = $(".enemy-choice").attr("src");
	// $(".player-choice").attr("src", newWeaponSrc (currentPlayerWeaponSrc, "rock"));
	// $(".enemy-choice").attr("src", newWeaponSrc (currentEnemyWeaponSrc, "rock"));

	var playerWeapon = this.id;
	var timeoutDuration = 250;
	var gameCategory = Number($("#playground").attr("data-game-category"));
	var gameId = $("#playground").attr("data-game-id");

	if (gameCategory===0 && gameId==="demo") { // Unregistered Player Demo Mode "against-the-machine"
		initializeToRockPosition();
		var enemyWeapon = randomWeaponSelection();
		var winningScore = $(".player-lives .fa-heart").length;
		var currentRound = Number($(".game-history-current-round span").text());
		var currentPlayerScore = Number($("#player-wins .score-counter .score-counter-span").text());
		var currentEnemyScore = Number($("#enemy-wins .score-counter .score-counter-span").text());
		var winningWeapon = getWinningWeapon(playerWeapon, enemyWeapon);
		if (winningWeapon === playerWeapon) { currentPlayerScore = currentPlayerScore + 1; }
		else if (winningWeapon===enemyWeapon) { currentEnemyScore = currentEnemyScore + 1; }
		setTimeout( () => weaponSelectionAnimation(playerWeapon, enemyWeapon, timeoutDuration, winningScore, currentRound, currentPlayerScore, currentEnemyScore, true), 200);
	}
	else { // Registered Player => Game saved in database
		if (gameCategory===0) { // => "against-the-machine" => no need to wait for opponent's choice before initiating procedure
			socket.emit("initializeToRockPosition");
		}
		// initializeToRockPosition();
		var csrf = $("input[name=_csrf]").val();
		$.ajax({
			type: "POST",
			url: window.location.pathname, 
			data: { playerWeapon: playerWeapon },
			dataType: "json",
			headers: {
				'X-CSRF-TOKEN': csrf
			}	  	
		})
		.done(function(data, textStatus, jqXHR){ 
			if (gameCategory===0) { //=> "against-the-machine" => no need to wait for opponent's choice before proceeding
				socket.emit("weaponSelectionAnimation", {leftPlayerId: data.leftPlayerId, playerWeapon: data.playerWeapon, enemyWeapon: data.enemyWeapon, timeoutDuration: timeoutDuration, winningScore: data.winningScore, currentRound: data.currentRound, currentPlayerScore: data.currentPlayerScore, currentEnemyScore: data.currentEnemyScore});
			}
			else { // need to ensure both players' "submition" before proceeding
				if(data.playerWeapon && data.enemyWeapon) { // => both players submited
					socket.emit("initializeToRockPosition");
					setTimeout( () => socket.emit("weaponSelectionAnimation", {leftPlayerId: data.leftPlayerId, playerWeapon: data.playerWeapon, enemyWeapon: data.enemyWeapon, timeoutDuration: timeoutDuration, winningScore: data.winningScore, currentRound: data.currentRound, currentPlayerScore: data.currentPlayerScore, currentEnemyScore: data.currentEnemyScore}), 200);					
				}
				else if(!(data.playerWeapon && data.enemyWeapon) && (data.playerWeapon || data.enemyWeapon)) { // => First player to submit. Will be useful if only one player submits
					socket.emit("weapon-selection-saved-in-database");
				}
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){ // Failure
			var errorStatus = (jqXHR.responseJSON && jqXHR.responseJSON.errorStatus) ? jqXHR.responseJSON.errorStatus : (jqXHR.status ? jqXHR.status : "");
			var errorMessage = (jqXHR.responseJSON && jqXHR.responseJSON.errorMessage) ? jqXHR.responseJSON.errorMessage : (jqXHR.statusText ? jqXHR.statusText : "");
			$("#playground").attr("id", "error").html('<div class="container">' +
																									'<div class="row">' +
																										'<div class="col-xs-12 text-center">' +
																											'<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
																											'<h1>ERROR <span>' + errorStatus + '</span></h1>' +
																											'<p>' + (errorMessage!="error" ? errorMessage : "") + '</p>' +
																										'</div>' +
																									'</div>' +
																								'</div>');
		});
	}  
});

// Game Page - gameOverModal Buttons
$(".play-again-btn").click(function(event){
	// var currentPlayerWeaponSrc = $(".player-choice").attr("src");
	// var currentEnemyWeaponSrc = $(".enemy-choice").attr("src");
	// $(".player-choice").attr("src", newWeaponSrc (currentPlayerWeaponSrc, "rock"));
	// $(".enemy-choice").attr("src", newWeaponSrc (currentEnemyWeaponSrc, "rock"));
	// clearGameHistory();
	// $(".player-lives .fa").removeClass("active-life inactive-life");
	// $(".enemy-lives .fa").removeClass("active-life inactive-life");
	// $(".player-lives .fa").addClass("active-life restore_life_animation");
	// $(".enemy-lives .fa").addClass("active-life restore_life_animation");
	// $(event.target).closest(".modal").modal("hide");
	window.location.replace("/against-the-machine");
});
$(".new-challenge-btn").click(function(event){
	$("#gameOverModal").modal("hide");
	$("#searchingForOpponentModal").modal("show");
	searchForOpponentSetTimeoutFunction = setTimeout(function(){ socket.emit("searhing-for-opponent"); }, Math.floor(Math.random() * 6000)); // Add a random delay (0-5999 ms) in request, in order to reduce the chance of the same 2 players meeting again in next game
});
$(".exit-game-btn").click(function(event){
	// window.location.href = "/";
	window.location.replace("/"); // Removes the current page from history => can't retrieve page with back button
});


/*
// About Page
*/

// About Page - Reviews Section
$("#reviewUsButton").click(function(event){ // Show/Hide Review Form on Click
	if ( $("#reviewUsForm").css("display") == "none") {
		$("#reviewUsForm").slideDown();
		$("#reviewUsButton").addClass("activeReviewUsForm");
	}
	else {
		$("#reviewUsForm").slideUp();
		$("#reviewUsButton").removeClass("activeReviewUsForm");
	}
	$("#reviewUsButton").blur();
});
$("#cancelReview").click(function(event){ // Cancel Review Click
	$("#reviewUsForm").slideUp();
	$("#reviewUsButton").removeClass("activeReviewUsForm");	
	$("#reviewUsTextarea").val("");
	$("#ratingStarsInput").rating("clear");
});
$("#reviewUsSubmitButton").click(function(event){
	event.preventDefault();
});

// Form Validation Variables Declaration
var alreadyValidated = false, alreadyValidatedLogin = false, alreadyValidatedRegister = false, nameSuccess = false, emailSuccess = false, subjectSuccess = false, messageSuccess = false, passwordSuccess = false, passwordConfirmSuccess = false;

// About Page - Contact Us Section
$("#contactForm .form-group .form-input").on("focus", function() {
	$(this).siblings("label").addClass("active-label");
	$(this).removeClass("has-error");
});
$("#contactForm .form-group .form-input").on("blur", function() {
	if($(this).val().trim()==="") {
		$(this).siblings("label").removeClass("active-label");
	}
});
$("#contact-form-name").on("blur", function() { if(alreadyValidated) isValidName(); });
$("#contact-form-email").on("blur", function() { if(alreadyValidated) isValidEmail(); });
$("#contact-form-subject").on("blur", function() { if(alreadyValidated) isValidSubject(); });
$("#contact-form-message").on("blur", function() { if(alreadyValidated) isValidMessage(); });

$("#contact-form-submit").click(function(event){
	event.preventDefault();
	if(!alreadyValidated) alreadyValidated = true;
	isValidName();
	isValidEmail();
	isValidSubject();
	isValidMessage();
	if(nameSuccess && subjectSuccess && messageSuccess && emailSuccess) { // AJAX Call here...
		console.log("Success!!");
		$("#contact-form-submit").prop("disabled", true);
		$("#contact-form-submit").text("Sending...");
		setTimeout(function() {
			$("#contact-form-submit").text("Thank you!");
			setTimeout(function() {
				alreadyValidated = false; nameSuccess = false; emailSuccess = false; subjectSuccess = false; messageSuccess = false;
				$("#contact-form-name").val("");
				$("#contact-form-email").val("");
				$("#contact-form-subject").val("");
				$("#contact-form-message").val("");    
				$("#contactForm .form-group .form-input").blur();
				$("#contact-form-submit").text("Send Message");
				$("#contact-form-submit").prop("disabled", false);
			}, 1500);
		}, 2000);
	}
	else if(!nameSuccess) $("#contact-form-name").focus();
	else if(!emailSuccess) $("#contact-form-email").focus();
	else if(!subjectSuccess) $("#contact-form-subject").focus();	
	else $("#contact-form-message").focus();
});

function isValidName() {
	nameSuccess = $("#contact-form-name").val().trim().length > 0;
	if (!nameSuccess) $("#contact-form-name").addClass("has-error");
	else $("#contact-form-name").removeClass("has-error");
}
function isValidSubject() {
	subjectSuccess = $("#contact-form-subject").val().trim().length > 0;
	if (!subjectSuccess) $("#contact-form-subject").addClass("has-error");
	else $("#contact-form-subject").removeClass("has-error");
}
function isValidMessage() {
	messageSuccess = $("#contact-form-message").val().trim().length > 0;
	if (!messageSuccess) $("#contact-form-message").addClass("has-error");
	else $("#contact-form-message").removeClass("has-error");
}
function isValidEmail() {
	var pattern = new RegExp(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i);
	emailSuccess = pattern.test($("#contact-form-email").val().trim());
	if (!emailSuccess) $("#contact-form-email").addClass("has-error");
	else $("#contact-form-email").removeClass("has-error");  
}

/*
// Head To Head Page
*/

var searchForOpponentSetTimeoutFunction;

// Handle random fight (challenge) button click
$("#random-fight-button").click(function() {
	$("#searchingForOpponentModal").modal("show");
	searchForOpponentSetTimeoutFunction = setTimeout(function(){ socket.emit("searhing-for-opponent"); }, 2000);
});

// Handle cancellation/closing of "#searchingForOpponentModal"
$("#searchingForOpponentModal").on("hide.bs.modal", function () {
	socket.emit("cancel-searhing-for-opponent");
	clearTimeout(searchForOpponentSetTimeoutFunction);
});

// After hiding "#searchingForOpponentModal" make sure everything is in order
$("#searchingForOpponentModal").on("hidden.bs.modal", function () {
	$("#searchingForOpponentModal .finding-opponent").removeClass("animated bounceOut").css({"display":"block", "opacity": 1});
	$("#searchingForOpponentModal .cancelButtonContainer").removeClass("animated bounceOut").css({"display":"block", "opacity": 1});
	$("#searchingForOpponentModal .cancelButtonContainer button").prop("disabled", false);
	$("#searchingForOpponentModal .ready-set-go").text("").removeClass("animated bounceIn zoomOut").css("opacity", 0);	
	$("#searchingForOpponentModal .loaderContainer").css("opacity", 1);
	$("#searchingForOpponentModal .challenge-img").css("opacity", 1);	
	$("#searchingForOpponentModal .opponent-img").attr("src", "");
	$("#searchingForOpponentModal .opponent-img").css("opacity", 0);	
	$("#searchingForOpponentModal .opponent-username").text("");
	$("#searchingForOpponentModal .opponent-fights").text("");
	$("#searchingForOpponentModal .opponent-win-rate").text("");	
	$("#searchingForOpponentModal .opponent-info-container").css("opacity", 0);
});

/*
// Log In Page
*/

$(document).ready(function() {
  if($("#login").length) { // => Login page was loaded
  	if($("#login-form-email").val().trim()!=""){
  		$("#login-form-email").focus();
  		$("#login-form-password").focus();
  		$("#login-form-email").blur();
  		$("#login-form-password").blur();  		
  	}
  }
});

$('#login .tab a').on('click', function (e) {
	e.preventDefault();
	$(this).parent().addClass('active');
	$(this).parent().siblings().removeClass('active');
	target = $(this).attr('href');
	$('.tab-content > div').not(target).hide();
	$(target).fadeIn(600);
});

$("#login .form-group .form-input").on("focus", function() {
	$(this).siblings("label").addClass("active-label");
	$(this).removeClass("has-error");
});
$("#login .form-group .form-input").on("blur", function() {
	if($(this).val().trim()==="") {
		$(this).siblings("label").removeClass("active-label");
	}
});

// Login Form
$(".forgot-password a").click(function(event){ // Activate "Forgot Password" procedure...
	event.preventDefault();
});

$("#login").on("click", ".loginTryAgainMsg a", function(event) { // Activate "Register" Tab. This way of handling the "click" event, makes it available on dynamically appended elements
	event.preventDefault();
	$("#login .tab-group .tab:last-child a").click();
});

$("#login-form-email").on("blur", function() { if(alreadyValidatedLogin) isValidEmailLogin(); });
$("#login-form-password").on("blur", function() { if(alreadyValidatedLogin) isValidPasswordLogin(); });

$("#login-form-submit").click(function(event){
	event.preventDefault();
	if(!alreadyValidatedLogin) { alreadyValidatedLogin = true; }
	isValidEmailLogin();
	isValidPasswordLogin();
	if(emailSuccess && passwordSuccess) { // AJAX Call here...
		$("#login-form-submit").prop("disabled", true);
		$("#login-form-submit").text("Authenticating...");

		var csrf = $("#login-form input[name=_csrf]").val();

		$.ajax({
			type: "POST",
			url: "/signin",
			data: { email: $("#login-form-email").val(), password: $("#login-form-password").val() },
			dataType: "json",	    
			headers: {
				'X-CSRF-TOKEN': csrf
			}
		})
		.done(function(data, textStatus, jqXHR){ // Success
			if (data.message == "Missing credentials") { 
				if ($("#login-form-email").val().trim().length===0) { $("#login-form-email").focus(); }
				else $("#login-form-password").focus();

				$("#login-form-submit").text("Log In"); 
				$("#login-form-submit").prop("disabled", false); 
			}
			else if (data.error) {
				if (data.message=="Invalid Email.") { $("#login-form-email").focus(); }
				else if (data.message=="Invalid Password.") { $("#login-form-password").focus(); }
				else if (data.message=="Email not found.") {	
					$("#login-form-email").focus();
					$(".loginTryAgainMsg").html('<span class="show_msg_animation">Email not found. </span>Please try again, or <a href="#">create a new account</a>.'); 
					if ($(".loginTryAgainMsgContainer").css("display") == "none") { $(".loginTryAgainMsgContainer").css({"display": "block"}); }	
					setTimeout(function() { $(".loginTryAgainMsg span").removeClass("show_msg_animation"); }, 3000);			
				}
				else { // Incorrect Password
					$("#login-form-password").focus();
					$(".loginTryAgainMsg").html('<span class="show_msg_animation">Incorrect Password. </span>Please try again.'); 
					if ($(".loginTryAgainMsgContainer").css("display") == "none") { $(".loginTryAgainMsgContainer").css({"display": "block"}); }
					setTimeout(function() { $(".loginTryAgainMsg span").removeClass("show_msg_animation"); }, 3000);			
				}

				$("#login-form-submit").text("Log In");
				$("#login-form-submit").prop("disabled", false);     				
			}
			else { // Successful Validation
				alreadyValidatedLogin = false; emailSuccess = false; passwordSuccess = false;
				$("#login-form-submit").text("Thank you!");
				setTimeout(function() {
					window.location.replace("/"); // Removes the current page from history => can't retrieve page with back button
				}, 200);   
			}	
		})
		.fail(function(jqXHR, textStatus, errorThrown){ // Failure
			// window.location.href = "/";
			$("#generalErrorModal").modal("show");
			$("#login-form-submit").text("Log In"); 
			$("#login-form-submit").prop("disabled", false);
		})
		.always(function(){ // Always executed upon completion of ajax request
			// console.log("This part will be executed always!");
		});    
	}
	else if(!emailSuccess) $("#login-form-email").focus();
	else $("#login-form-password").focus();	
});

function isValidEmailLogin() {
	var pattern = new RegExp(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i);
	emailSuccess = pattern.test($("#login-form-email").val().trim());
	if (!emailSuccess) $("#login-form-email").addClass("has-error");
	else $("#login-form-email").removeClass("has-error");  
}
function isValidPasswordLogin() {
	passwordSuccess = $("#login-form-password").val().trim().length >= 6;
	if (!passwordSuccess) $("#login-form-password").addClass("has-error");
	else $("#login-form-password").removeClass("has-error");
}

// Register Form
$("#terms-and-conditions-link").click(function(event){ 
	event.preventDefault();
});

$("#login").on("click", ".register-existing-email-message a", function(event) { // Activate "Log In" Tab
	event.preventDefault();
	$("#login .tab-group .tab:first-child a").click();
});

$("#register-form-name").on("blur", function() { if(alreadyValidatedRegister) isValidNameRegister(); });
$("#register-form-email").on("blur", function() { if(alreadyValidatedRegister) isValidEmailRegister(); });
$("#register-form-password").on("blur", function() { if(alreadyValidatedRegister) isValidPasswordRegister(); });
$("#register-form-confirm-password").on("blur", function() { if(alreadyValidatedRegister) isValidConfirmPasswordRegister(); });

$("#register-form-submit").click(function(event){
	event.preventDefault();
	if(!alreadyValidatedRegister) { alreadyValidatedRegister = true; }
	isValidNameRegister();
	isValidEmailRegister();
	isValidPasswordRegister();
	isValidConfirmPasswordRegister();
	if(nameSuccess && emailSuccess && passwordSuccess && passwordConfirmSuccess) { // AJAX Call here...
		$("#register-form-submit").prop("disabled", true);
		$("#register-form-submit").text("Creating Account...");

		var csrf = $("#register-form input[name=_csrf]").val();

		$.ajax({
			type: "POST",
			url: "/signup",
			data: { name: $("#register-form-name").val(), email: $("#register-form-email").val(), password: $("#register-form-password").val() },
			dataType: "json",
			headers: {
				'X-CSRF-TOKEN': csrf
			}
		})
		.done(function(data, textStatus, jqXHR){ // Success
			if (data.message == "Missing credentials") { 
				if ($("#register-form-name").val().trim().length===0) { $("#register-form-name").focus(); }
				else if ($("#register-form-email").val().trim().length===0) { $("#register-form-email").focus(); }
				else $("#register-form-password").focus();
				$("#register-form-submit").text("Create Account"); 
				$("#register-form-submit").prop("disabled", false); 
			}
			else if (data.error) {
				if (data.message=="Invalid Username.") { $("#register-form-name").focus(); }
				else if (data.message=="Invalid Email.") { $("#register-form-email").focus(); }
				else if (data.message=="Invalid Password.") { $("#register-form-password").focus(); }
				else {
					$("#register-form-email").focus();
					$(".register-existing-email-message span").addClass("show_msg_animation");
					$(".register-existing-email-message").css({"display": "block"});
					setTimeout(function() { $(".register-existing-email-message span").removeClass("show_msg_animation"); }, 3000);					
				}

				$("#register-form-submit").text("Create Account");
				$("#register-form-submit").prop("disabled", false);     				
			}
			else { // Successful Validation
				alreadyValidatedRegister = false; nameSuccess = false; emailSuccess = false; passwordSuccess = false; passwordConfirmSuccess = false;
				$("#register-form-submit").text("Thank you!");
				setTimeout(function() {
					window.location.replace("/");
				}, 200);   
			}	    
		})
		.fail(function(jqXHR, textStatus, errorThrown){ // Failure
			$("#generalErrorModal").modal("show");
			$("#register-form-submit").text("Create Account"); 
			$("#register-form-submit").prop("disabled", false); 			
		})
		.always(function(){ // Always executed upon completion of ajax request
			// console.log("This part will be executed always!");
		});    
	}
	else if(!nameSuccess) $("#register-form-name").focus();
	else if(!emailSuccess) $("#register-form-email").focus();
	else if(!passwordSuccess) $("#register-form-password").focus();	
	else $("#register-form-confirm-password").focus();
});

function isValidNameRegister() {
	nameSuccess = $("#register-form-name").val().trim().length > 0 && $("#register-form-name").val().trim().length <= 50;
	if (!nameSuccess) $("#register-form-name").addClass("has-error");
	else $("#register-form-name").removeClass("has-error");
}
function isValidEmailRegister() {
	var pattern = new RegExp(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i);
	emailSuccess = pattern.test($("#register-form-email").val().trim());
	if (!emailSuccess) $("#register-form-email").addClass("has-error");
	else $("#register-form-email").removeClass("has-error");  
}
function isValidPasswordRegister() {
	passwordSuccess = $("#register-form-password").val().trim().length >= 6;
	if (!passwordSuccess) $("#register-form-password").addClass("has-error");
	else $("#register-form-password").removeClass("has-error");
}
function isValidConfirmPasswordRegister() {
	passwordConfirmSuccess = $("#register-form-confirm-password").val().trim().length >= 6 && $("#register-form-confirm-password").val().trim() == $("#register-form-password").val().trim();
	if (!passwordConfirmSuccess) $("#register-form-confirm-password").addClass("has-error");
	else $("#register-form-confirm-password").removeClass("has-error");
}

/*
// Profile Page
*/

// Handle .logout-profile click
$(".logout-profile").click(function(event) {
	window.location.replace("/logout");
});
// Handle .edit-profile click
$(".edit-profile").click(function(event) {
	$("#editProfileModal").modal("show");
});
// Handle #editProfileModal hide
$("#editProfileModal").on("hidden.bs.modal", function () {
	$("#profile-image-preview").attr("src", $("#profile-image-preview").attr("data-src"));
	$("#profile-username-preview").text($("#profile-username-preview").attr("data-name"));
	$("#profilePictureInputFile").val("");
	$(".file-name-span").text("Upload Profile Picture");
	$("#editProfileNameInput").attr("value", $("#profile-username-preview").attr("data-name"));
	$("#editProfileNameInput").val($("#profile-username-preview").attr("data-name"));
});
// #editProfileModal -> #editProfileNameInput keypress
$("#editProfileModal").on("keyup", "#editProfileNameInput", function() { // This way of handling the "click" event, makes it available on dynamically appended elements
	if($("#editProfileNameInput").val().trim()==="") { 
		$("#profile-username-preview").css({opacity: 0}); 
		$("#profile-username-preview").text($("#profile-username-preview").attr("data-name")); 
	}
	else { 
		$("#profile-username-preview").css({opacity: 1}); 
		$("#profile-username-preview").text($("#editProfileNameInput").val().trim()); 
	}
});
// #editProfileModal -> #editProfileNameInput blur
$("#editProfileNameInput").on("blur", function() { 
	if($("#editProfileNameInput").val().trim()==="") {
		$("#editProfileNameInput").val($("#profile-username-preview").attr("data-name")); 
		$("#profile-username-preview").css({opacity: 1});
	}
});
// Handle #editProfileModal -> #editProfileForm submission
$("#editProfileForm").submit(function(event) {
	event.preventDefault();
	if ($("#profilePictureInputFile").val()!=="" || ($("#editProfileNameInput").val().trim()!=="" && $("#editProfileNameInput").val().trim()!==$("#profile-username-preview").attr("data-name"))) {
		$("#editProfileForm button").prop("disabled", true);

		var csrf = $("#editProfileForm input[name=_csrf]").val();
		var postURL = $("#editProfileForm").attr("action");

		var formData = new FormData();
		formData.append('profilePictureInputFile', document.getElementById("profilePictureInputFile").files[0]);
		formData.append('editProfileNameInput', $("#editProfileNameInput").val().trim());

		$.ajax({
			type: "POST",
			url: postURL, 
			data : formData,
			processData: false,  // tell jQuery not to process the data
			contentType: false,  // tell jQuery not to set contentType
			headers: {
				'X-CSRF-TOKEN': csrf
			}		    
		})
		.done(function(data, textStatus, jqXHR){ // Success
			console.log("Success!!");
			if(data.msg==="Error") {
				$("#editProfileModal").modal("hide");
				$("#editProfileForm button").prop("disabled", false); 
				$("#generalErrorModal").modal("show");
			}
			else {
				if (data.newProfilePictureFilename) {
					// window.location.reload(); // In this case rerender the whole page with the new data (in order to also avoid browser caching issues)
					$(".profile-image").css({"opacity":"0"});
					$(".nav-link-profile-img").css({"opacity":"0"});
					$(".profile-image").attr("src", data.newProfilePictureFilename);
					$(".nav-link-profile-img").attr("src", data.newProfilePictureFilename);
					$("#profile-image-preview").attr("data-src", data.newProfilePictureFilename);
				}
				if (data.newUsername) {
					$(".profile-username").text(data.newUsername);
					$("#profile-username-preview").attr("data-name", data.newUsername);
				}
				$("#editProfileModal").modal("hide");
				$("#editProfileForm button").prop("disabled", false);
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){ // Failure
			console.log("Failure...");
			$("#editProfileModal").modal("hide");
			$("#editProfileForm button").prop("disabled", false);
			$("#generalErrorModal").modal("show");
		})
	}
	else {
		$("#editProfileModal").modal("hide");
	}
});
// #editProfileModal -> Function triggered on file upload (before #editProfileForm submission)
function previewImage() {
	var imageSrc = $("#profile-image-preview").attr("data-src");
	var fileName = $("#profilePictureInputFile").val().trim().toLowerCase();
	var regex = /(\.jpg|\.jpeg|\.gif|\.png)$/i;
	var fileSize = document.getElementById("profilePictureInputFile").files[0] ? document.getElementById("profilePictureInputFile").files[0].size : 0;

	if(fileName!=="") {
		if(!regex.exec(fileName) || fileSize>1000000) { // File extension not supported OR fileSize>1MB
			$("#profilePictureInputFile").val("");
			$(".file-name-span").text("Upload Profile Picture");
			if($("#profile-image-preview").attr("src") !== imageSrc) {
				$("#profile-image-preview").attr("src", imageSrc);
			}		
			$("#fileHelp").fadeOut(300).fadeIn(300).fadeOut(300).fadeIn(300).fadeOut(300).fadeIn(300);
		}  
		else { // Valid file extension AND fileSize<=1MB
			$(".file-name-span").text(document.getElementById("profilePictureInputFile").files[0].name);
			var oFReader = new FileReader();
			oFReader.readAsDataURL(document.getElementById("profilePictureInputFile").files[0]);
			oFReader.onload = function (oFREvent) {
				$("#profile-image-preview").attr("src", oFREvent.target.result);
			};
		}  	
	}
}

// Handle First Visit to Profile Page
$(document).ready(function() {

	Chart.pluginService.register({ // This plugin is added in order to be able to add text in the center of a (doughnut) chart
		beforeDraw: function (chart) {
			if (chart.config.options.elements.center) {
				//Get ctx from string
				var ctx = chart.chart.ctx;

				//Get options from the center object in options
				var centerConfig = chart.config.options.elements.center;
				var fontStyle = centerConfig.fontStyle || 'Arial';
				var txt = centerConfig.text;
				var color = centerConfig.color || '#000';
				var sidePadding = centerConfig.sidePadding || 20;
				var sidePaddingCalculated = (sidePadding/100) * (chart.innerRadius * 2)
				//Start with a base font of 30px
				ctx.font = "30px " + fontStyle;

				//Get the width of the string and also the width of the element minus 10 to give it 5px side padding
				var stringWidth = ctx.measureText(txt).width;
				var elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;

				// Find out how much the font can grow in width.
				var widthRatio = elementWidth / stringWidth;
				var newFontSize = Math.floor(30 * widthRatio);
				var elementHeight = (chart.innerRadius * 2);

				// Pick a new font size so it will not be larger than the height of label.
				var fontSizeToUse = Math.min(newFontSize, elementHeight);

				//Set font settings to draw it correctly.
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
				var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
				ctx.font = fontSizeToUse+"px " + fontStyle;
				ctx.fillStyle = color;

				//Draw text in center
				ctx.fillText(txt, centerX, centerY);
			}
		}
	});

	// Draw the Fights (total for all games) Doughnut Chart
	if($("#totalGamesData").val()){
		var totalGamesData = $("#totalGamesData").val();
		totalGamesData = JSON.parse(totalGamesData);
		var totalGamesWins = 0;
		var totalGamesLosses = 0;
		for (var i=0; i<totalGamesData.length; i++) {
			totalGamesWins += totalGamesData[i][0];
			totalGamesLosses += totalGamesData[i][1];
		}		
		var totalGames = totalGamesWins + totalGamesLosses;
		var ctx1 = document.getElementById("totalGamesChart").getContext('2d');
		if(totalGames === 0) {
			var totalGamesChart = new Chart(ctx1, {
				type: "doughnut",
				data: {	
					labels: ["No Games Played"],
					datasets: [{
						data: [1],
						backgroundColor: ["#333"]
					}]
				},
				options: {
					title: {
						display: true,
						text: "Fights",
						fontSize: 18,
						fontColor: "#333"
					},
					legend: { display: false },
					tooltips: { enabled: false },
					elements: {
						center: {
							text: totalGames,
							color: "#333",
							fontStyle: "Helvetica",
							sidePadding: totalGames < 10 ? 70 : (totalGames < 100 ? 50 : 35)
						}
					}			      
				}
			});
		}
		else {
			var totalGamesChart = new Chart(ctx1, {
					type: "doughnut",
					data: {	
						labels: ["Won","Lost"],
						datasets: [{
							data: [totalGamesWins, totalGamesLosses],
							backgroundColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"]
						}]
					},
					options: {
						title: {
							display: true,
							text: "Fights",
							fontSize: 18,
							fontColor: "#333"
						},
						legend: {
							display: false
						},
						tooltips: {
							footerFontStyle: "normal",
							callbacks: { 
								footer: function(tooltipItems, data) {
									var numerator = tooltipItems[0].index === 0 ? totalGamesWins : totalGamesLosses;
									return "Rate: " + Math.round((numerator/totalGames)*100) + "%";
								}				   
							}
						},		      
						elements: { // Add Text in Center of Chart
								center: {
								text: totalGames,
								color: "#333", //Default black
								fontStyle: "Helvetica", //Default Arial
								sidePadding: totalGames < 10 ? 70 : (totalGames < 100 ? 50 : 35) //Default 20 (as a percentage)
							}
						}					  			      
					}
			});
		}
	}

	// Draw the Rounds (for all games - per weapon) Stacked Bar Chart
	if($("#totalRoundsData").val()){
		var ctx2 = document.getElementById("totalRoundsChart").getContext('2d');
		var totalRoundsData = $("#totalRoundsData").val();
		totalRoundsData = JSON.parse(totalRoundsData); // 3*3 matrix: [0][0] -> rock wins, [0][1] -> rock losses, [0][2] -> rock ties, [1][0] -> paper wins,...,[2][2] -> scissors ties
		var winsData = []; // [0]->rock wins, [1]->paper wins, [2]->scissors wins
		var lossesData = []; // [0]->rock losses, [1]->paper losses, [2]->scissors losses
		var tiesData = []; // [0]->rock ties, [1]->paper ties, [2]->scissors ties
		for (var i=0; i<totalRoundsData.length; i++) {
			winsData.push(totalRoundsData[i][0]);
			lossesData.push(totalRoundsData[i][1]);
			tiesData.push(totalRoundsData[i][2]);
		}
		var myChart = new Chart(ctx2, {
			type: "bar",
			data: {
				labels: ["\uf255", "\uf256", "\uf257"],
				// labels: ["Rock", "Paper", "Scissors"],
				datasets: [
					{
						label: "Won",
						data: winsData,
						backgroundColor: "rgba(75, 192, 192, 1)",
						borderColor: "rgba(75, 192, 192, 1)",
						borderWidth: 1
					},
					{
						label: "Tied",
						data: tiesData,
						backgroundColor: "rgba(70, 70, 70, 1)",
						borderColor: "rgba(70, 70, 70, 1)",
						borderWidth: 1
					}, 
					{
						label: "Lost",
						data: lossesData,
						backgroundColor: "rgba(255, 99, 132, 1)",
						borderColor: "rgba(255, 99, 132, 1)",
						borderWidth: 1
					}	        	       	        	       	
				]
			},
			options: {
				title: {
					display: true,
					text: "Rounds",
					fontSize: 18,
					fontColor: "#333"
				},    
				legend: {
					display: false
				},      	
				scales: {
					xAxes: [{
						stacked: true,
						gridLines: {
							display: false
						},
						ticks: {
							fontFamily: "FontAwesome",
							fontSize: 22,
							padding: 0
						},
					}],
					yAxes: [{
						stacked: true,
						gridLines: {
							display: true
						},  	      		
						ticks: {
							min: 0, // it is for ignoring negative step
							beginAtZero:true,
							callback: function(value, index, values) { // only show integer values on yAxes
								if (totalRoundsData[0].reduce(function(a,b){return a + b})===0 && totalRoundsData[1].reduce(function(a,b){return a + b})===0 && totalRoundsData[2].reduce(function(a,b){return a + b})===0) { // No Data yet
									return Math.floor(value*10); // Integer Step
								}
								else { // Available Data
									if (Math.floor(value) === value) {
										return value;
									}
								}
							}	            
						}   
					}]
				},
				tooltips: {
					footerFontStyle: "normal",
					callbacks: { 
						title: function(tooltipItems, data) {
							return tooltipItems[0].index === 0 ? "Rock" : (tooltipItems[0].index === 1 ? "Paper" : "Scissors");
						},
						footer: function(tooltipItems, data) {
							var totalRoundsWithWeapon = totalRoundsData[tooltipItems[0].index].reduce(function(a,b){return a + b});
							if (totalRoundsWithWeapon) { // Only show "Rate" if data available
								return "Rate: " + Math.round((tooltipItems[0].yLabel / totalRoundsWithWeapon)*100) + "%";
							}
						}				   
					}
				}
			}
		});
	}

}); // End of $(document).ready function 

/*
// Helper Functions
*/

// Weapon Selection Animation
function weaponSelectionAnimation (playerWeapon, enemyWeapon, timeoutDuration, winningScore, currentRound, currentPlayerScore, currentEnemyScore, isActivePlayer) {
	$(".player-choice").toggleClass("player-choice-rotated");
	$(".enemy-choice" ).toggleClass("enemy-choice-rotated");
	setTimeout(function(){
		$(".player-choice").toggleClass("player-choice-rotated");
		$(".enemy-choice").toggleClass("enemy-choice-rotated");
		setTimeout(function(){
			$(".player-choice").toggleClass("player-choice-rotated");
			$(".enemy-choice").toggleClass("enemy-choice-rotated");
			setTimeout(function(){
				$(".player-choice").toggleClass("player-choice-rotated"); 
				$(".enemy-choice").toggleClass("enemy-choice-rotated");
					setTimeout(function(){
						$(".player-choice").toggleClass("player-choice-rotated");
						$(".enemy-choice").toggleClass("enemy-choice-rotated");
						setTimeout(function(){
							$(".player-choice").toggleClass("player-choice-rotated"); 
							$(".enemy-choice").toggleClass("enemy-choice-rotated");
							if (playerWeapon !== "rock") { // If rock, no changes needed
								setTimeout(function(){
									$(".player-choice").css({"display":"none", "opacity":"0"});
									$(".player-choice.player-choice-" + playerWeapon).css({"display":"block", "opacity":"1"});	
								}, 100);					
							}
							if (enemyWeapon !== "rock") { // If rock, no changes needed
								setTimeout(function(){
									$(".enemy-choice").css({"display":"none", "opacity":"0"});
									$(".enemy-choice.enemy-choice-" + enemyWeapon).css({"display":"block", "opacity":"1"});
								}, 100);									
							}	
							// var currentWeaponSrc1 = $(".player-choice").attr("src");
							// var currentWeaponSrc2 = $(".enemy-choice").attr("src");
							// $(".player-choice").attr("src", newWeaponSrc (currentWeaponSrc1, playerWeapon));
							// $(".enemy-choice").attr("src", newWeaponSrc (currentWeaponSrc2, enemyWeapon));											  	
														
							updateGameState(playerWeapon, enemyWeapon, winningScore, currentRound, currentPlayerScore, currentEnemyScore, isActivePlayer);
				  	
						}, timeoutDuration); 				  	
					}, timeoutDuration); 		  	
			}, timeoutDuration); 	  	 
		}, timeoutDuration); 
	}, timeoutDuration);	
}

// Change Weapon Image Source
// function newWeaponSrc (currentWeaponSrc, newWeapon) {
// 	if (currentWeaponSrc.indexOf("-" + newWeapon + ".") < 0) { // newWeapon different from the old one
// 		var currentWeaponSrcArray = currentWeaponSrc.split("-");
// 		var currentWeaponAndFileExtensionArray = currentWeaponSrcArray[currentWeaponSrcArray.length-1].split(".");
// 		var newWeaponSrc=currentWeaponSrcArray[0];
// 		for(var i=1; i<currentWeaponSrcArray.length-1; i++) { newWeaponSrc = newWeaponSrc + "-" + currentWeaponSrcArray[i]; }
// 		newWeaponSrc = newWeaponSrc + "-" + newWeapon + "." + currentWeaponAndFileExtensionArray[currentWeaponAndFileExtensionArray.length-1];
// 		return newWeaponSrc;
// 	}
// 	else { // newWeapon same as old one
// 		return currentWeaponSrc;
// 	}
// }

// Computer Random Weapon Selection
function randomWeaponSelection () {
	var weapon;
	var randomNumber = Math.random();

	if (randomNumber < 0.33333) { weapon = "rock"; }
	else if(randomNumber < 0.66666) { weapon = "paper"; }
	else{ weapon = "scissors"; }

	return weapon;
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

function validSelectionAnimation(elem) {
	var yPos = elem.css('backgroundPositionY');
	elem.addClass("timer-animation-pause").css("backgroundPosition", "0% " + yPos).addClass("reverse-timer-animation-transition").removeClass("timer-animation-pause timer-animation");
	setTimeout(function(){
		elem.css("backgroundPosition", "0% 0%");
		setTimeout(function(){
			elem.removeClass("reverse-timer-animation-transition").addClass("valid-selection-animation");
		}, 275);
	}, 25);
}

function initializeToRockPosition() {
	if ($(".player-choice.player-choice-rock").css("display") === "none") { // Start from "rock" position (player)
		$(".player-choice").css({"display":"none", "opacity":"0"});
		$(".player-choice.player-choice-rock").css({"display":"block", "opacity":"1"});
	}
	if ($(".enemy-choice.enemy-choice-rock").css("display") === "none") { // Start from "rock" position (enemy)
		$(".enemy-choice").css({"display":"none", "opacity":"0"});
		$(".enemy-choice.enemy-choice-rock").css({"display":"block", "opacity":"1"});	
	}
}

function updateGameState(playerWeapon, enemyWeapon, winningScore, currentRound, currentPlayerScore, currentEnemyScore, isActivePlayer) {

	if(currentPlayerScore != winningScore && currentEnemyScore != winningScore) { // No Game Winner yet

		if($(".player-image").parent().hasClass("valid-selection-animation")) {$(".player-image").parent().addClass("reverse-valid-timer-animation");}			
		else if($(".player-image").parent().hasClass("timer-animation")) {$(".player-image").parent().addClass("reverse-timer-animation");}	
		if($(".enemy-image").parent().hasClass("valid-selection-animation")) {$(".enemy-image").parent().addClass("reverse-valid-timer-animation");}			
		else if($(".enemy-image").parent().hasClass("timer-animation")) {$(".enemy-image").parent().addClass("reverse-timer-animation");}	

		if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true" && $(".player").attr("data-is-active-player") === "true") { // <=> Not "against-the-machine" (=>timed game) && Active Game && Active Player
			setTimeout(function(){socket.emit("start-new-round")}, 1000);
		}		
		else { // Not a timed game => we can be faster since there is no need to wait for animations to finish
			setTimeout(function(){ $("#playground .player-game-buttons-container .btn-circle").blur().removeClass("keep-focus").prop("disabled", false); }, 250);
		}			
	}
	else { // We have a Game Winner
		if(Number($("#playground").attr("data-game-category")) != 0 && $("#playground").attr("data-is-game-closed") != "true" && $(".player").attr("data-is-active-player") === "true") { // <=> NOT "against-the-machine" && Active Game && Active Player => Add an additional delay before "#gameOverModal" shows up (in order to give players some time for a last interaction)
			setTimeout(function(){ $("#gameOverModal").modal("show"); }, 500);
		}	
		else if(Number($("#playground").attr("data-game-category")) === 0 && $("#playground").attr("data-is-game-closed") != "true" && $(".player").attr("data-is-active-player") === "true") { // <=> "against-the-machine" && Active Game && Active Player => No need to add any delay before "#gameOverModal" shows up
			setTimeout(function(){ $("#gameOverModal").modal("show"); }, 200);
		}
		setTimeout(function(){ $("#playground .player-game-buttons-container .btn-circle").blur().removeClass("keep-focus").prop("disabled", true); }, 250); // Keep buttons disabled, simply remove last choice focus
		setTimeout(function(){ // Add the "Game Over" div
			$("#playground .vs-span").fadeTo(400, 0);
			setTimeout(function(){ $(".game-closed-container").append('<div class="game-closed">Game Over</div>').addClass("animated bounceIn"); }, 200);
		}, $(".player").attr("data-is-active-player") === "true" ? 1500 : 200);	// Add an additional delay in case of active player in order to allow for the "#gameOverModal" to show up first
	}

	var winningWeapon = getWinningWeapon(playerWeapon, enemyWeapon);

	if (winningWeapon === playerWeapon) { // Player (left side) is the Round winner
		$(".player-choice-container .win-msg-div").fadeIn(250);
		setTimeout(function(){ $(".player-choice-container .win-msg-div").fadeOut(500); }, 1250);
		$("#player-wins .score-counter").fadeOut(200, function(){
			$("#player-wins .score-counter .score-counter-span").text(currentPlayerScore);
			$("#player-wins .score-counter").fadeIn(300);
		});
		updateGameHistory(currentRound, playerWeapon, true, enemyWeapon, false);

		$(".enemy-lives .active-life").last().removeClass("active-life restore_life_animation").addClass("inactive-life life_loss_animation");

		if(currentPlayerScore === winningScore) { // Player (left side) is the Game winner
			if(isActivePlayer) {
				$("#gameOverModal .modal-body p.modal-title.modal-title-win").css("display", "block");
				$("#gameOverModal .modal-body p.message.message-win").css("display", "block");
				$("#gameOverModal .modal-body .modal-img.modal-img-win").css("display", "inline-block");
			}
		}
	}
	else if (winningWeapon === enemyWeapon) { // Enemy (right side) is the Round winner
		$(".enemy-choice-container .win-msg-div").fadeIn(250);
		setTimeout(function(){ $(".enemy-choice-container .win-msg-div").fadeOut(500); }, 1250);
		$("#enemy-wins .score-counter").fadeOut(200, function(){
			$("#enemy-wins .score-counter .score-counter-span").text(currentEnemyScore);						  		
			$("#enemy-wins .score-counter").fadeIn(300);
		});
		updateGameHistory(currentRound, playerWeapon, false, enemyWeapon, true);		

		$(".player-lives .active-life").last().removeClass("active-life restore_life_animation").addClass("inactive-life life_loss_animation");

		if(currentEnemyScore === winningScore) { // Enemy (right side) is the Game winner
			if(isActivePlayer) {
				$("#gameOverModal .modal-body p.modal-title.modal-title-lose").css("display", "block");
				$("#gameOverModal .modal-body p.message.message-lose").css("display", "block");
				$("#gameOverModal .modal-body .modal-img.modal-img-lose").css("display", "inline-block");
			}			  			
		}					  			  		
	}
	else { // Tie
		$(".tie-msg-div").fadeIn(250);
		setTimeout(function(){ $(".tie-msg-div").fadeOut(500); }, 1250);					  		
		$("#ties .score-counter").fadeOut(200, function(){
			$("#ties .score-counter").html(Number($("#ties .score-counter").text()) + 1);
			$("#ties .score-counter").fadeIn(300);
		});		
		updateGameHistory(currentRound, playerWeapon, false, enemyWeapon, false);							  		
	}	

}

// Update Game History in HTML DOM
function updateGameHistory(currentRound, weapon1, isWeapon1Winner, weapon2, isWeapon2Winner) {

	$(".game-history-current-round span").text(currentRound + 1);

	if(isWeapon1Winner) {
		var elem = $('<div class="game-history-rounds-item"><i class="fa fa-hand-' + weapon1 + '-o fa-left fa-win" aria-hidden="true"></i><i class="fa fa-check fa-left" aria-hidden="true"></i><span>Round ' + currentRound + '</span><i class="fa ' + (weapon2!=="" ? 'fa-hand-' + weapon2 + '-o' : 'fa-minus') + ' fa-right" aria-hidden="true"></i></div>').hide();
	}
	else if(isWeapon2Winner) {
		var elem = $('<div class="game-history-rounds-item"><i class="fa ' + (weapon1!=="" ? 'fa-hand-' + weapon1 + '-o' : 'fa-minus') + ' fa-left" aria-hidden="true"></i><span>Round ' + currentRound + '</span><i class="fa fa-hand-' + weapon2 + '-o fa-right fa-win" aria-hidden="true"></i><i class="fa fa-check fa-right" aria-hidden="true"></i></div>').hide();
	}
	else {
		var elem = $('<div class="game-history-rounds-item"><i class="fa ' + (weapon1!=="" ? 'fa-hand-' + weapon1 + '-o' : 'fa-minus') + ' fa-left" aria-hidden="true"></i><span>Round ' + currentRound + '</span><i class="fa ' + (weapon2!=="" ? 'fa-hand-' + weapon2 + '-o' : 'fa-minus') + ' fa-right" aria-hidden="true"></i></div>').hide();
	}

	$(".game-history-rounds-container").prepend(elem);
	elem.slideDown(500);

}

// Clear Game History from HTML DOM
// function clearGameHistory() {
// 	// $(".game-history-rounds-container").fadeOut(1500, function(){
// 		$("#player-wins .score-counter .score-counter-span").text("0");
// 		$("#enemy-wins .score-counter .score-counter-span").text("0");
// 		$("#ties .score-counter").text("0");
// 		$(".game-history-current-round span").text("1");
// 	 	$(".game-history-rounds-container").empty().fadeIn();
// 	// });
// }