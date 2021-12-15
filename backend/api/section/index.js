const express = require('express');
const Section = require('../../database/models/section');
const User = require('../../database/models/user');
const middleware = require('../middleware');
const helpers = require('../helpers');
const editNotes = require('./notes');

const section = express.Router();

// Pusher stuff
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: "1314793",
  key: "89d75d5bd73462337ba8",
  secret: "5997e01be62a75b01e31",
  cluster: "us3",
  useTLS: true
});

// ================
// Helper Functions
// ================

// Handles returning a section JSON object
async function sectionReturn(req, res, obj) {
  // Get the user data of this user
  const ownerObj = await helpers.getUserDataById(obj.owner);

  // Tell the frontend if this user is authorized to edit this object
  var userIsOwner = false;
  var userIsEditor = false;
  if (helpers.isOwner(req, obj)) {
    userIsOwner = true;
  }
  if (helpers.isEditor(req, obj)) {
    userIsEditor = true;
  }

  // Return
  return {
    isOwner: userIsOwner,
    isEditor: userIsEditor,
    section: obj,
    owner: {
      username: ownerObj.username,
      _id: ownerObj._id,
    },
  };
}

// ======
// Routes
// ======

/**
 * Creates a new section and returns its data
 * @param {Hex} id - The id of the section, must be only hexadecimal
 * @body {String} title - The title of the section
 * @body {String} description - User notes about the section
**/
section.post('/create', middleware.authenticateUser, async (req, res) => {
  // Create the section
  const sectionData = new Section({
    title: req.body.title || 'Unnamed section',
    description: req.body.description || '',
    creationDateTime: Date.now(),
    lastEditDateTime: Date.now(),
    notes: '',
    owner: req.user.id,
    loopPoint: 15,
    bpm: 120,
  });

  // Save it to the database
  try {
    await sectionData.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Response
  return res.status(200).json(await sectionReturn(req, res, sectionData));
});

/**
 * Edits section metadata by id
 * @param {Hex} id - The id of the section, must be only hex digits
**/
section.post('/edit/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the section to edit
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Object not found',
    });
  }

  // Ensure the authenticated user is an editor of this section
  result = helpers.checkIsEditor(req, res, getObj);
  if (result) {return result;}

  // Change the section data
  getObj.title = req.body.title || getObj.title;
  getObj.description = req.body.description || getObj.description;
  getObj.loopPoint = req.body.loopPoint || getObj.loopPoint;
  getObj.bpm = req.body.bpm || getObj.bpm;
  getObj.lastEditDateTime = Date.now();

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Pusher
  pusher.trigger("section_" + req.params.id, "update", await sectionReturn(req, res, getObj));

  // Response
  return res.status(200).json(await sectionReturn(req, res, getObj));
});

/**
 * Adds a user to the list of users that can edit this section
 * @param {Hex} id - The id of the section, must be only hex digits
 * @body {String} username - The username of the editor
**/
section.post('/addEditor/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the section to edit
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Object not found',
    });
  }

  // Ensure the authenticated user is the owner of this section
  result = helpers.checkIsOwner(req, res, getObj);
  if (result) {return result;}

  // Find the user with the username
  req.body.username = req.body.username || "";
  let userObj;
  try {
    userObj = await User.findOne({ username: req.body.username }).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual user was found
  if (!userObj) {
    return res.status(404).json({
      error: 'User not found',
    });
  }

  // Make sure user is not already an editor or owner
  if (getObj.owner == userObj.id) {
    return res.status(400).json({
      error: 'User is already the owner',
    });
  }
  if (getObj.editors.includes(userObj.id)) {
    return res.status(400).json({
      error: 'User is already an editor',
    });
  }

  // Add the user's id to the list of allowed users
  getObj.editors.push(userObj.id);

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Response
  return res.status(200).json(await sectionReturn(req, res, getObj));
});

/**
 * Adds a note to a section
 * @param {Hex} id - The id of the section, must be only hex digits
 * @body {Int} pitch - The MIDI pitch of the note
 * @body {Float} time - What time the note will play (measured in bars)
 * @body {Float} duration - How long the note will play
 * @body {Float} instrument - Note's instrument
**/
section.post('/addNote/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the section to edit
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Object not found',
    });
  }

  // Ensure the authenticated user is an editor of this section
  result = helpers.checkIsEditor(req, res, getObj);
  if (result) {return result;}

  // Ensure note info was specified
  pitch = req.body.pitch || 0;
  time = req.body.time || 0;
  duration = req.body.duration || 1;
  instrument = req.body.instrument || 0;

  // Change the section data and get the id of the new note
  getObj.lastEditDateTime = Date.now();
  const retId = editNotes.addNote(getObj.noteList, pitch, time, instrument, duration);

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Pusher
  pusher.trigger("section_" + req.params.id, "update", await sectionReturn(req, res, getObj));

  // Response
  return res.status(200).json({
    result: "Success",
  });
});

/**
 * Removes a note from a section
 * @param {Hex} id - The id of the section, must be only hex digits
 * @body {Int} pitch - The MIDI pitch of the note
 * @body {Float} time - The time the note will play (measured in bars)
**/
section.post('/removeNote/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the section to edit
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Object not found',
    });
  }

  // Ensure the authenticated user is an editor of this section
  result = helpers.checkIsEditor(req, res, getObj);
  if (result) {return result;}

  // Ensure note info was specified
  pitch = req.body.pitch || 0;
  time = req.body.time || 0;

  // Change the section data and get the id of the new note
  getObj.lastEditDateTime = Date.now();
  editNotes.removeNote(getObj.noteList, pitch, time);

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Pusher
  pusher.trigger("section_" + req.params.id, "update", await sectionReturn(req, res, getObj));

  // Response
  return res.status(200).json({
    result: "Success",
  });
});


/**
 * Deletes a section
 * @param {Hex} id - The id of the section, must be only hex digits
**/
/*section.post('/delete/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the section to delete
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Object not found',
    });
  }

  // Ensure the authenticated user is owner of this section
  result = helpers.checkIsOwner(req, res, getObj);
  if (result) {return result;}

  // Delete it
  try {
    await Section.deleteOne({ _id: getObj._id });
  } catch (error) {
    return res.status(500).json({
      error: 'Error deleting object',
    });
  }

  // Response
  return res.status(200).json({
    result: "Success",
  });
});*/

 
/**
 * Returns section data by id
 * @param {Hex} id - The id of the section, must be only hexadecimal
**/
section.get('/get/:id([a-f0-9]+)', async (req, res) => {
  // Get the section from the database
  let getObj;
  try {
    getObj = await Section.findById(req.params.id).exec();
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }
  
  // Ensure an actual object was found
  if (!getObj) {
    return res.status(404).json({
      error: 'Not found',
    });
  }

  // Response
  return res.status(200).json(await sectionReturn(req, res, getObj));
});

/**
 * Lists all sections the user has access to
**/
section.get('/list', middleware.authenticateUser, async (req, res) => {
  // Get the items they own
  try {
    getOwned = await Section.find({ owner: req.user.id });
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Get the items they can edit
  try {
    getInvited = await Section.find({ editors: req.user.id });
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Response
  return res.status(200).json({
    sections_owned: getOwned,
    sections_invited: getInvited,
  });
});
 


module.exports = section;
