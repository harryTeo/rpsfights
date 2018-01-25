var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema({
	startTime: {type: Date, required: true}, 
	// correctAnswerPointsArray: [], // correctPointsArray[0]: correct answer && "lose" case, correctPointsArray[1]: correct answer && "tie" case, correctPointsArray[2]: correct answer && "win" case, eg. correctPointsArray: [25, 50, 100]
	// incorrectAnswerPointsArray: [], // incorrectAnswerPointsArray[0]: incorrect answer && "lose" case, incorrectAnswerPointsArray[1]: incorrect answer && "tie" case, incorrectAnswerPointsArray[2]: incorrect answer && "win" case, eg. incorrectAnswerPointsArray: [0, 25, 50]
	duration: {type: Number}, // Tournament duration (in milliseconds)
	players: [{
		playerId: {type: String},
		score: {type: Number},
		scoreTimeStamp: {type: Date},
		gameId: {type: String}
	}], 
	prize: {type: Number},
	winnerId: {type: String},
	endedAt: {type: Date}
});

module.exports = mongoose.model("Tournament", schema);