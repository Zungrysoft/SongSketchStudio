const express = require('express');
const user = require('./user');
const auth = require('./auth');
const section = require('./section');
const song = require('./song');

const api = express.Router();

api.use('/user', user);
api.use('/auth', auth);
api.use('/section', section);
api.use('/song', song);

module.exports = api;
