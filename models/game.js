var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema({
	createdAt: {type: Date, required: true, default: Date.now},
	category: {type: Number, min: 0, required: true}, // 0: vsComputer, 1: vsHuman, 2: (part of) tournament
	winningScore: {type: Number, min: 0, required: true, default: 3},
	prize: {type: Number, required: true},
	gameHistory: [{
		_id: false,
		playerId: String,
		weaponsSequence: []
	}], // Array of 2 Objects (1 per Player). Each Object has 2 fields: playerId and weaponsSequence ( [{playerId: "...", weaponsSequence:[...]}, {playerId: "...", weaponsSequence:[...]}] )
	winnerId: String,
	endedAt: Date
});

module.exports = mongoose.model("Game", schema);