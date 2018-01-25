var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hbs = require('hbs');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var passportSocketIo = require('passport.socketio');
var MongoStore = require('connect-mongo')(session); // Note: this should be placed after acquiring the "express-session".

require('dotenv').config();

var index = require('./routes/index');

var app = express();
var server = require('http').Server(app); // This is normally done in ./bin/www but we're going to move it here and export it

global.io = require('socket.io')(server); //  Set up our websockets server to run in the same app. Set "io" as Global Variable, in order to be able to access socket.io from all files in our server

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

require("./config/passport"); // Note: this should be placed after "mongoose.connect". We don't assign it to a var since we simply want to load the file and make it accessible to our app

require("./config/socket"); 

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
// Register handlebars(hbs) partials
hbs.registerPartials(__dirname + '/views/partials');
// Register handlebars(hbs) helpers
hbs.registerHelper("ifCond", function (v1, operator, v2, options) { // Conditional "if" helper
  switch (operator) {
    case "==":
      return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case "===":
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case "!=":
      return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case "!==":
      return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case "<":
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case "<=":
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case ">":
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case ">=":
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case "&&":
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case "||":
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});
hbs.registerHelper("math", function(v1, operator, v2, options) { // Basic mathematical operations helper
  v1 = parseFloat(v1);
  v2 = parseFloat(v2);
  return {
    "+": v1 + v2,
    "-": v1 - v2,
    "*": v1 * v2,
    "/": v1 / v2,
    "%": v1 % v2
  }[operator];
});
hbs.registerHelper("times", function(n, block) { // In order to do something n times
    var accum = "";
    for(var i = 0; i < n; ++i)
      accum += block.fn(i);
    return accum;
});
hbs.registerHelper("timesdif", function(n, m, block) { // In order to do something n-m times (n>=m)
    var accum = "";
    for(var i = 0; i < n-m; ++i)
      accum += block.fn(i);
    return accum;
});

app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
var sessionStore = new MongoStore({mongooseConnection: mongoose.connection});
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
  store: sessionStore,
  cookie: {maxAge: 24*60*60*1000}
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.locals.isLoggedIn = req.isAuthenticated(); 
  res.locals.userId = req.isAuthenticated() ? req.user._id.toString() : "";
  res.locals.userImageUrl = req.isAuthenticated() ? req.user.profilePictureUrl : "";
  res.locals.session = req.session; // Make the "session" variable object available to all views
  // res.locals.rootURL = req.protocol + '://' + req.get('host'); // In localhost -> http://localhost:8000
  next();
});

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var errorStatus = err.status || 500;
  var errorMessage = errorStatus == 500 ? "Internal Server Error - Please try again later" : "Page Not Found";
  // set locals, only providing error in development
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(errorStatus).render('error', { errorStatus: errorStatus, errorMessage: errorMessage });
});

// socket.io middleware in order to access passport.js user info from socket.io
io.use(passportSocketIo.authorize({ 
  cookieParser: cookieParser, // the same middleware registrered in express
  key: 'connect.sid', // the name of the cookie where express/connect stores its session_id 
  secret: process.env.SESSION_SECRET, // the session_secret to parse the cookie 
  store: sessionStore, // we NEED to use a sessionstore. NO memorystore
  success: function(data, accept) { accept(); },  // *optional* callback on success - default behaviour
  fail: function(data, message, error, accept) { accept(); } // *optional* callback on fail/error - default is: accept(null, false), however, at this point, we want all connections (even unauthenticated) to be accepted
}));

module.exports = {app: app, server: server};