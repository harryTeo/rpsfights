var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema({
	totalOnlineUsers: {type: Number, min: 0, required: true, default: 0}, // Number of total online users (Auth + Unauth)
	onlineAuthenticatedUsers: [String] // Array of IDs (string format) of all online Authenticated users
});

module.exports = mongoose.model("Online", schema, "online");