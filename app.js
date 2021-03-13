var express = require("express");
var passport = require("passport");
var util = require("util");
var session = require("express-session");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var GitHubStrategy = require("passport-github2").Strategy;
var partials = require("express-partials");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/my-database", {
  useMongoClient: true,
});
mongoose.Promise = global.Promise;
const db = mongoose.connection;

var GITHUB_CLIENT_ID = "c20edb23445abb44fc0d";
var GITHUB_CLIENT_SECRET = "f723f3a955fa5e494b2494786d3faf5e5be274db";

var TEMP_RRP_DB = {};

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: "http://127.0.0.1:3000/auth/github/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      //   User.findOrCreate({ githubId: profile.id }, function (err, user) {
      //     return done(err, user);
      //   });
      //Arey bushky i am using a in memory database to save the users you save/load from mongo
      let user = {};
      if (!TEMP_RRP_DB[profile.id]) {
        user = TEMP_RRP_DB[profile.id] = {
          id: profile.id,
          username: profile.username,
          roles: ["ROLE_USER"],
        };
      } else {
        user = TEMP_RRP_DB[profile.id];
      }
      return done(null, user);
    }
  )
);

var app = express();
// configure Express
app.use(partials());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(
  session({
    secret: "rrp the pisher",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send("error");
  console.log(err);
});

app.get("/", function (req, res) {
  res.json({ status: "App Running!" });
});

app.get("/api/account", ensureAuthenticated, function (req, res) {
  res.json(req.user);
});

app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] }),
  function (req, res) {}
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth/github" }),
  function (req, res) {
    // Successful authentication, redirect home.
    console.log("Authenticated with the github.");
    res.redirect("/");
  }
);

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/github");
}

app.listen(3000);
