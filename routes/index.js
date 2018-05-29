var express = require("express");
var router = express.Router();
// var fs = require("fs");
var path = require("path");
var AWS = require("aws-sdk");
var multer  = require("multer");
var multerS3 = require("multer-s3");
var csrf = require("csurf");
var passport = require("passport");

var User = require("../models/user");
var Game = require("../models/game");
var Tournament = require("../models/tournament");

// AWS (Amazon Web Services) and MulterS3 configuration
AWS.config.update({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: 'us-east-2'
});
var s3 = new AWS.S3();
var storage = multerS3({
  s3: s3,
  bucket: 'rps-fights',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, callback) {
    callback(null, "public/images/users/" + req.user._id.toString() + "-" + Date.now() + path.extname(file.originalname).toLowerCase());
  }
});

// Multer configuration
// var storage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     callback(null, './public/images/users/');
//   },
//   filename: function (req, file, callback) {
//     callback(null, req.user._id.toString() + path.extname(file.originalname).toLowerCase());
//   }
// });

var csrfProtection = csrf();
router.use(csrfProtection);

/* Routes */
router.get("/", function(req, res, next) { 
  Tournament.find({}).sort({startTime:1}).exec(function(err,tournaments){
    if (err) { return res.status(500).render("error", { errorStatus: 500, errorMessage: "Internal Server Error" }); }
    var tournamentId = tournaments[tournaments.length-1]._id.toString();
    var tournamentStartTime = tournaments[tournaments.length-1].startTime.getTime(); // time in milliseconds
    var tournamentEndTime = tournaments[tournaments.length-1].endedAt ? tournaments[tournaments.length-1].endedAt.getTime() : "";
    res.render("index", {tournamentId: tournamentId, tournamentStartTime: tournamentStartTime, tournamentEndTime: tournamentEndTime });
  });
});

router.get("/about", function(req, res, next) {
  res.render("about");
});

router.get("/against-the-machine", function(req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect("/against-the-machine/demo");
  }
  else {
    var newGame = new Game({
      category: 0,
      // winningScore: 5,
      prize: 10,
      gameHistory: [{ playerId: req.user._id.toString(), weaponsSequence:[] }, { playerId: "Computer", weaponsSequence:[] }]
    });
    newGame.save(function(err, result) {
      if (err) return res.status(500).render("error", { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
      res.redirect("/against-the-machine/" + result._id);
    }); 
  } 
});

router.get("/against-the-machine/demo", function(req, res, next) {
  res.render("game", { activePlayerMode: true, profilePictureUrl: "/images/users/warrior.jpg", game: {winningScore: 3}, gameId: "demo", gameHistoryArray: [], gameScoreArray: [0, 0, 0] });
});

router.get("/against-the-machine/:id", function(req, res, next) {
  var gameCategory = 0;
  renderGame(req, res, gameCategory);
});

router.post("/against-the-machine/:id", isLoggedIn, function(req, res, next) {
  postWeapon(req, res);
});

router.get("/head-to-head", isLoggedIn, function(req, res, next) {
  res.render("head-to-head");
});

router.get("/head-to-head/:id", function(req, res, next) {
  var gameCategory = 1;
  renderGame(req, res, gameCategory);
});

router.post("/head-to-head/:id", isLoggedIn, function(req, res, next) {
  postWeapon(req, res);
});

// router.get("/tournament", isLoggedIn, function(req, res, next) {
//   res.render("tournament");
// });

router.get("/tournament/:id", isLoggedIn, function(req, res, next) {
  var tournamentId = req.params.id;
  Tournament.findOne({ _id: tournamentId }, function(err, tournament) {
    if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Tournament Not Found" });
    if (!tournament) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Tournament Not Found" });  
    res.render("tournament", { 
      csrfToken: req.csrfToken(), 
      tournamentId: tournamentId, 
      tournamentStartTime: tournament.startTime.getTime(),
      tournamentEndTime: tournament.endedAt ? tournament.endedAt.getTime() : ""
    });
  });
});

router.get("/terms-conditions", function(req, res, next) {
  res.render("terms-conditions", { websiteName: "RPS Fights", websiteURL: "https://rpsfights.herokuapp.com", country: "Cyprus" });
});

router.get("/privacy-policy", function(req, res, next) {
  res.render("privacy-policy", { websiteName: "RPS Fights", websiteURL: "https://rpsfights.herokuapp.com", country: "Cyprus" });
});

router.get("/login", notLoggedIn, function(req, res, next) {
	res.render("login", { csrfToken: req.csrfToken() });
});

router.get("/logout", isLoggedIn, function(req, res, next) {
	req.logout();
	res.redirect("/");
});

router.get("/profile/:id", isLoggedIn, function(req, res, next) {
  var userId = req.params.id;
  User.findOne({ _id: userId }, function(err, user) {
    if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "User Not Found" });
    if (!user) return res.status(404).render("error", { errorStatus: 404, errorMessage: "User Not Found" });
    Game.find({ "gameHistory.playerId": userId.toString() }, function(err, games) {  
      var roundsArray = new Array(3).fill(0).map(()=>new Array(3).fill(0)); // 3*3 matrix: [0][0] -> rock wins, [0][1] -> rock losses, [0][2] -> rock ties, [1][0] -> paper wins,...,[2][2] -> scissors ties
      var gamesArray = new Array(3).fill(0).map(()=>new Array(2).fill(0)); // 3*2 matrix: [0][0] -> vsComputer wins, [0][1] -> vsComputer losses, [1][0] -> vsHuman wins,...,[2][1] -> Tournament Games losses
      for(var i=0; i<games.length; i++) {
        if(games[i].winnerId) {
          // Fill in the roundsArray (need to iterate over each individual round of each game)
          var playerWeaponsSequence = games[i].gameHistory[games[i].gameHistory.findIndex(function(obj) { return obj.playerId === userId.toString(); })].weaponsSequence;
          var enemyWeaponsSequence = games[i].gameHistory[games[i].gameHistory.findIndex(function(obj) { return obj.playerId !== userId.toString(); })].weaponsSequence;
          for(var j=0; j<playerWeaponsSequence.length; j++) {
            var rowIndex = playerWeaponsSequence[j] === "rock" ? 0 : (playerWeaponsSequence[j] === "paper" ? 1 : 2);
            var winningWeapon = getWinningWeapon(playerWeaponsSequence[j],enemyWeaponsSequence[j]);
            var colIndex = playerWeaponsSequence[j] === winningWeapon ? 0 : (enemyWeaponsSequence[j] === winningWeapon ? 1 : 2);
            roundsArray[rowIndex][colIndex] += 1;
          }
          // Fill in the gamesArray
          gamesArray[games[i].category][games[i].winnerId.toString() === userId.toString() ? 0 : 1] += 1;
        }
      }
      res.render("profile", {
        csrfToken: req.csrfToken(),
        profileOwnerId: user._id.toString(),
        profileOwnerName: user.name,
        profileOwnerImageUrl: user.profilePictureUrl,
        gamesData: { roundsArray: JSON.stringify(roundsArray), gamesArray: JSON.stringify(gamesArray)}
      });
    });
  });
});

router.post("/editprofile", isLoggedIn, function (req, res, next) {
  var upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: function(req, file, callback) {
      var regex = /(\.jpg|\.jpeg|\.gif|\.png)$/i;
      var fileName = file ? file.originalname : "";
      if (!regex.exec(fileName)) { return callback(new Error('Only JPG, JPEG, GIF and PNG files are allowed.')); }
      else { callback(null, true); }
    } 
  }).single('profilePictureInputFile'); 
  upload(req,res,function(err) {

    // req.file will hold the uploaded file info
    // req.body will hold the text fields
    
    if(err) return res.send({msg: "Error", errorMessage: "Invalid Request"});
   
    User.findById(req.user._id, function(err, user) {
      if(err || !user) return res.send({msg: "Error", errorMessage: "User Not Found!"});

      var newUsername = req.body.editProfileNameInput.trim();
      var responseData = {msg: "Success", newUsername: (newUsername!=="" && newUsername!==user.name) ? newUsername : null, newProfilePictureFilename: req.file ? req.file.location : null};

      if (newUsername!=="" && newUsername!==user.name) { user.name = newUsername; }

      if (req.file) {
        // Delete previous (unnecessary) image file - First make sure it is not a Facebook or the Default User image
        var currentFileNameArray = path.basename(user.profilePictureUrl).split("-");
        var newFileNameArray = path.basename(req.file.location).split("-"); // var newFileNameArray = req.file.filename.split(".");
        if(currentFileNameArray[0]===newFileNameArray[0]) {
          // var currentFileNamePath = path.join(__dirname, '../public' + user.profilePictureUrl);
          // fs.unlinkSync(currentFileNamePath);
          s3.deleteObject({
            Bucket: req.file.bucket,
            Key: path.dirname(req.file.key) + "/" + path.basename(user.profilePictureUrl)
          },function (err,data){ });
        }
        user.profilePictureUrl = req.file.location; // "/images/users/" + req.file.filename
      }
      user.save(function (err, updatedUser) {
        if(err) return res.send({msg: "Error", errorMessage: "Internal Server Error - Please try again later"});
        else return res.send(responseData);
      });
    });  
  });
});

router.post("/signup", notLoggedIn, function(req, res, next) {
  passport.authenticate("local.signup", function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.json(info); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.json(user);
    });
  })(req, res, next);
});

router.post("/signin", notLoggedIn, function(req, res, next) {
  passport.authenticate("local.signin", function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.json(info); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.json(user);
    });
  })(req, res, next);
});

// Facebook Authentication
// Redirect the user to Facebook for authentication. When complete, Facebook will redirect the user back to the application at /auth/facebook/callback
router.get("/auth/facebook", notLoggedIn, passport.authenticate("facebook", {scope: ["email"]}));
// Finish the authentication process by attempting to obtain an access token. If access was granted, the user will be logged in. Otherwise, authentication has failed.
router.get("/auth/facebook/callback", notLoggedIn, passport.authenticate("facebook", {
 	// successRedirect: "/",
 	failureRedirect: "/login" 
}), function(req, res) {
	// if (req.session.oldUrl) { res.redirect(req.session.oldUrl); }
	// else { res.redirect("/"); }
	res.redirect("/");
});

module.exports = router;

// Middleware Functions
function isLoggedIn(req, res, next) { // We will use this "middleware" function to all the routes we want to protect!
	if (req.isAuthenticated()) { // The "isAuthenticated" method is provided by the "passport" package
		return next();
	}
	res.redirect("/");
}

function notLoggedIn(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}
	res.redirect("/");
}

// Helper Functions

// Find game by id and render with appropriate data
function renderGame(req, res, gameCategory) {

  var gameId = req.params.id;

  Game.findOne({ _id: gameId }, function(err, game) {
    if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
    if (!game) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
    if (game.category != gameCategory) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
    var gameHistoryArray = [];
    var leftPlayerIndex = (req.isAuthenticated() && game.gameHistory[1].playerId.toString() === req.user._id.toString()) ? 1 : 0;
    var rightPlayerIndex = leftPlayerIndex === 1 ? 0 : 1;
    var winningWeapon = "";
    var gameScoreArray = [0, 0, 0]; // [0]: leftPlayerWins, [1]: ties, [2]: rightPlayerWins
    for (var i=game.gameHistory[0].weaponsSequence.length-1; i>=0; i--) {
      winningWeapon = getWinningWeapon(game.gameHistory[0].weaponsSequence[i],game.gameHistory[1].weaponsSequence[i]);
      gameHistoryArray[game.gameHistory[0].weaponsSequence.length-1-i]= {
        currentRound: i+1,
        weapon1: game.gameHistory[leftPlayerIndex].weaponsSequence[i],
        isWeapon1Winner: game.gameHistory[leftPlayerIndex].weaponsSequence[i] === winningWeapon,
        weapon2: game.gameHistory[rightPlayerIndex].weaponsSequence[i],
        isWeapon2Winner: game.gameHistory[rightPlayerIndex].weaponsSequence[i] === winningWeapon
      };
      if (gameHistoryArray[game.gameHistory[0].weaponsSequence.length-1-i].isWeapon1Winner) {gameScoreArray[0]++;}
      else if (gameHistoryArray[game.gameHistory[0].weaponsSequence.length-1-i].isWeapon2Winner) {gameScoreArray[2]++;}
      else {gameScoreArray[1]++;}
    }
    if (req.isAuthenticated() && game.gameHistory.find(function(obj) { return obj.playerId === req.user._id.toString(); })) { // Active Player Mode
      if (game.category===1) { // head-to-head => we also need to get enemyId, enemyProfilePictureUrl and enemyName
        User.findOne({ _id: game.gameHistory[rightPlayerIndex].playerId }, function(err, user) { 
          if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          if (!user) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          res.render("game", { csrfToken: req.csrfToken(), activePlayerMode: true, playerId: req.user._id.toString(), playerProfilePictureUrl: req.user.profilePictureUrl, enemyId: user._id.toString(), enemyProfilePictureUrl: user.profilePictureUrl, enemyName: user.name, game: game, gameId: gameId, gameHistoryArray: gameHistoryArray, gameScoreArray: gameScoreArray });
        }); 
      }
      else { // against-the-machine => no need to get enemyProfilePictureUrl and enemyName
        res.render("game", { csrfToken: req.csrfToken(), activePlayerMode: true, playerId: req.user._id.toString(), playerProfilePictureUrl: req.user.profilePictureUrl, enemyId: "Computer", game: game, gameId: gameId, gameHistoryArray: gameHistoryArray, gameScoreArray: gameScoreArray });
      }
    }
    else { // Spectator Mode
      if (game.category===1) { // head-to-head => we need to get both, leftPlayer and rightPlayer, info
        User.findOne({ _id: game.gameHistory[leftPlayerIndex].playerId }, function(err, leftPlayer) { 
          if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          if (!leftPlayer) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          User.findOne({ _id: game.gameHistory[rightPlayerIndex].playerId }, function(err, rightPlayer) { 
            if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
            if (!rightPlayer) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });         
            res.render("game", { activePlayerMode: false, playerId: leftPlayer._id.toString(), playerProfilePictureUrl: leftPlayer.profilePictureUrl, playerName: leftPlayer.name, enemyId: rightPlayer._id.toString(), enemyProfilePictureUrl: rightPlayer.profilePictureUrl, enemyName: rightPlayer.name, game: game, gameId: gameId, gameHistoryArray: gameHistoryArray, gameScoreArray: gameScoreArray });
          });
        }); 
      }
      else { // against-the-machine => only need to get leftPlayer info
        User.findOne({ _id: game.gameHistory[leftPlayerIndex].playerId }, function(err, user) { 
          if (err) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          if (!user) return res.status(404).render("error", { errorStatus: 404, errorMessage: "Game Not Found" });
          res.render("game", { activePlayerMode: false, playerId: user._id.toString(), playerProfilePictureUrl: user.profilePictureUrl, playerName: user.name, enemyId: "Computer", game: game, gameId: gameId, gameHistoryArray: gameHistoryArray, gameScoreArray: gameScoreArray });
        }); 
      }
    }
  });

}

// Post new weapon and return the new game state
function postWeapon(req, res) {

  var gameId = req.params.id;
  var playerWeapon = req.body.playerWeapon;
  if (playerWeapon!=="rock" && playerWeapon!=="paper" && playerWeapon!=="scissors") { return res.status(403).json({ errorStatus: 403, errorMessage: "Invalid Action" }); }

  Game.findOne({ _id: gameId }, function(err, game) {

    if (err || !game ) { return res.status(404).json({ errorStatus: 404, errorMessage: "Game Not Found" }); }  
    if (!game.gameHistory.find(function(obj) { return obj.playerId === req.user._id.toString(); })) { return res.status(403).json({ errorStatus: 403, errorMessage: "Invalid Action" }); } // Invalid Action - Request from Non-Active Player
    if (game.winnerId || game.endedAt) { return res.status(403).json({ errorStatus: 403, errorMessage: "Invalid Action - Game Already Closed" }); } // Invalid Action - Game Closed
    
    var gameHistoryPlayerIndex = game.gameHistory.findIndex(function(obj) { return obj.playerId === req.user._id.toString(); });
    var gameHistoryEnemyIndex = game.gameHistory.findIndex(function(obj) { return obj.playerId !== req.user._id.toString(); });
    
    if(game.category!=0 && game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.length===game.gameHistory[gameHistoryEnemyIndex].weaponsSequence.length) { // => against human && first player to submit => we should also wait for the second one
      game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.push(playerWeapon);
      game.save(function(err, updatedGame) {
        if (err) { return res.status(500).json({ errorStatus: 500, errorMessage: "Internal Server Error" }); }
        return res.json({playerWeapon: playerWeapon, enemyWeapon: null});
      });      
    }
    else if(game.category!=0 && game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.length>game.gameHistory[gameHistoryEnemyIndex].weaponsSequence.length) { // => against human and player tries to resubmit before opponent submits => don't make any changes in database, but instead simply resend the initially submited weapon
      return res.json({playerWeapon: game.gameHistory[gameHistoryPlayerIndex].weaponsSequence[game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.length - 1], enemyWeapon: null});
    }
    else { // Either against-the-machine, either both players "submited" => we can proceed
      if (game.category===0) { // against-the-machine
        var enemyWeapon = randomWeaponSelection();
        game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.push(playerWeapon);
        game.gameHistory[gameHistoryEnemyIndex].weaponsSequence.push(enemyWeapon);      
      }
      else { // against human
        var enemyWeapon = game.gameHistory[gameHistoryEnemyIndex].weaponsSequence[game.gameHistory[gameHistoryEnemyIndex].weaponsSequence.length - 1];
        game.gameHistory[gameHistoryPlayerIndex].weaponsSequence.push(playerWeapon);
      }
      var winningScore = game.winningScore;
      var currentRound = game.gameHistory[0].weaponsSequence.length;
      var currentPlayerScore = 0;
      var currentEnemyScore = 0;     
      var winningWeapon = "";
      for(var i=0; i<game.gameHistory[0].weaponsSequence.length; i++) {
        winningWeapon = getWinningWeapon(game.gameHistory[gameHistoryPlayerIndex].weaponsSequence[i], game.gameHistory[gameHistoryEnemyIndex].weaponsSequence[i]);
        if (winningWeapon === game.gameHistory[gameHistoryPlayerIndex].weaponsSequence[i]) { currentPlayerScore += 1; }
        else if (winningWeapon === game.gameHistory[gameHistoryEnemyIndex].weaponsSequence[i]) { currentEnemyScore += 1; }
      }
      if (currentPlayerScore === winningScore) { 
        game.winnerId = game.gameHistory[gameHistoryPlayerIndex].playerId;
        game.endedAt = Date.now();
      }
      else if (currentEnemyScore === winningScore) { 
        game.winnerId = game.gameHistory[gameHistoryEnemyIndex].playerId;
        game.endedAt = Date.now();
      }    
      game.save(function(err, updatedGame) {
        if (err) { return res.status(500).json({ errorStatus: 500, errorMessage: "Internal Server Error" }); }
        if(game.gameHistory[0].playerId.toString() === req.user._id.toString()) { // No need for any change since data order is consistent
          return res.json({leftPlayerId: game.gameHistory[0].playerId.toString(), playerWeapon: playerWeapon, enemyWeapon: enemyWeapon, winningScore: winningScore, currentRound: currentRound, currentPlayerScore: currentPlayerScore, currentEnemyScore: currentEnemyScore});
        }
        else { // In this case reverse player with enemy data in order to keep a consistent order
          return res.json({leftPlayerId: game.gameHistory[0].playerId.toString(), playerWeapon: enemyWeapon, enemyWeapon: playerWeapon, winningScore: winningScore, currentRound: currentRound, currentPlayerScore: currentEnemyScore, currentEnemyScore: currentPlayerScore});
        }
      });      
    }
  });

}

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