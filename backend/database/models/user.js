// Code written by Calvin Martinez and Grayson Doshier

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  primaryEmail: String,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
