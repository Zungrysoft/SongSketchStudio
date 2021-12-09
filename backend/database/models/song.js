const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  description: String,
  creationDateTime: Date,
  lastEditDateTime: Date,
  bpm: Number,
  sectionPlacements: [{
    _id: false,
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
    },
    time: Number,
  }],
  sectionsAvailable: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  editors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
