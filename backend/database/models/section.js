const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: String,
  description: String,
  creationDateTime: Date,
  lastEditDateTime: Date,
  noteList: [{
    _id: false,
    pitch : Number,
    time: Number,
    duration: Number,
    instrument: Number,
  }],
  loopPoint: Number,
  bpm: Number,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  editors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

/* 
* Instrument id's:
* 0: Electric Guitar
* 1: Electric Bass
* 2: Drums
* 3: Hammond Organ
*/

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
