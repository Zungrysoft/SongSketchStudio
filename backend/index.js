// Code written by Calvin Martinez and Grayson Doshier

require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const api = require('./api');
const database = require('./database');
const User = require('./database/models/user');
/* Application Variables */
const port = process.env.EXPRESS_PORT || 3001;

// The Express Server
const app = express();
app.use(cors({
  credentials: true,
  origin: 'http://127.0.0.1',
  cookie: { sameSite: 'strict' },
}));
// Application Middleware

/* Parses JSON formatted request bodies */
app.use(express.json());
/* Parses requests with url-encoded values */
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('appSecretladwqd027&**iwm'));
app.use(session({
  secret: 'We mean it, man!',
  resave: false,
  saveUninitialized: true
}));

/* Use Passport for Authentication */
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use('/api', api);

/* Event handler for failed reconnection to database */
database.on('reconnectFailed', () => {
  console.log('After retries, failed to reconnect to database. Gracefully closing Express server');
  app.close(() => console.log('Express server closed'));
});

/**
 * Only start the server the first time this event is emitted
 * Mongoose emits this signal every time the database connects,
 * even after successful reconnects
 */
database.once('connected', () => {
  console.log('Database connected, starting Express');
  // Starts the Express server
  app.listen(port, () => {
    console.log(`Express API server started on port ${port}`);
  });
});
