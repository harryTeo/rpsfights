var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var User = require("../models/user");

passport.serializeUser(function(user, done) { // This will basically tell the "passport" how to store the user in the session
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use("local.signup", new LocalStrategy({
	usernameField: "email", // Should coincide with the data fieldname of AJAX request
	passwordField: "password", // Should coincide with the data fieldname of AJAX request
	passReqToCallback: true	
}, function(req, email, password, done) {
		// console.log(req.body);
		if (req.body.name.trim().length <= 0 || req.body.name.trim().length > 50) { return done(null, false, {error: true, message: "Invalid Username."}); }
		if (!isValidEmail(email.trim())) { return done(null, false, {error: true, message: "Invalid Email."}); }
		if (password.trim().length < 6) { return done(null, false, {error: true, message: "Invalid Password."}); }
		User.findOne({"email": email}, function(err, user) {
			if(err) {
				return done(err);
			}
			if(user) {
				return done(null, false, {error: true, message: "Email already exists."}); // By using the "false" argument, we are saying although no error occured we are not succesful since the email already exists
			}
			var newUser = new User();
			newUser.email = email;
			newUser.name = req.body.name;
			newUser.local.password = newUser.encryptPassword(password); // Note: the "encryptPassword" method was implemented in "user.js"
			newUser.save(function(err, result) {
				if(err) {
					return done(err);
				}
				return done(null, newUser);
			});
		});
}));

passport.use("local.signin", new LocalStrategy({
	usernameField: "email",
	passwordField: "password",
	passReqToCallback: true	
}, function(req, email, password, done) {
	if (!isValidEmail(email.trim())) { return done(null, false, {error: true, message: "Invalid Email."}); }
	if (password.trim().length < 6) { return done(null, false, {error: true, message: "Invalid Password."}); }	
	User.findOne({"email": email}, function(err, user) {
		if(err) {
			return done(err);
		}
		if(!user) {
			return done(null, false, {error: true, message: "Email not found."});
		}
		if(!user.validPassword(password)) { // The "validPassword" function was defined in "user.js"
			return done(null, false, {error: true, message: "Wrong password."});
		}
		return done(null, user);
	});			
}));

passport.use("facebook", new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    // callbackURL: "http://localhost:8000/auth/facebook/callback",
    callbackURL: "https://rpsfights.herokuapp.com/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'displayName', 'gender', 'profileUrl', 'picture.type(large)']
  },
  function(accessToken, refreshToken, profile, done) {
  	User.findOne( { $or:[{"email": profile.emails[0].value}, {"facebook.facebookId": profile.id}] }, function(err, user) {
  		if (err) { return done(err); }
  		if (user) { // Revisiting User -> Already exists in database
  			// console.log(user);
  			if (!user.facebook.facebookId) { // First time login with facebook account
  				user.facebook.token = accessToken;
  				user.facebook.facebookId = profile.id;
  				user.save(function(err, result) {
						if(err) { return done(err); }
						return done(null, user);
					});
  			}
  			else {
  				return done(null, user);
  			}
  		}
  		else { // First visit of this user
  			// console.log(profile);
				var newUser = new User();
				newUser.email = profile.emails ? profile.emails[0].value : profile.id; // If, for some reason, email is not provided put profile.id instead
				newUser.name = profile.displayName;
				newUser.facebook.token = accessToken;
				newUser.facebook.facebookId = profile.id;			
				if (profile.photos) { newUser.profilePictureUrl = profile.photos[0].value; }
				newUser.save(function(err, result) {
					if(err) { return done(err); }
					return done(null, newUser);
				});  			
  		}
  	});
  }
));

function isValidEmail(email) {
  var pattern = new RegExp(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i);
  return pattern.test(email);
}