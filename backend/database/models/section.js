const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: String,
  description: String,
  creationDateTime: Date,
  lastEditDateTime: Date,
  noteList: [{ pitch : Number, time: Number, duration: Number }],
  loopPoint: Number,
  instrument: Number,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  editors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  lastUserChangeDateTime: Date,
});

/* 
* Instrument id's:
* 0: Electric Guitar
* 1: Electric Bass
* 2: Drums
*/

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;