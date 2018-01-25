var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var Schema = mongoose.Schema;

var schema = new Schema({
	createdAt: { type: Date, default: Date.now },
	email: { type: String, required: true },
	name: { type: String, required: true },
	profilePictureUrl: { type: String, default: "/images/users/user.png" },
	local: {
		password: String
	},
	facebook: {
		facebookId: String,
		token: String
	},
	xp: {type: Number, required: true, default: 0}
});

schema.methods.encryptPassword = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
};

schema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password); // "this", refers to the current user
};

module.exports = mongoose.model("User", schema);