const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  description: String,
  creationDateTime: Date,
  lastEditDateTime: Date,
  sectionList: [{type: mongoose.Schema.Types.ObjectId, ref: 'Section'}],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  },
  lastUserChangeDateTime: Date,
});

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
