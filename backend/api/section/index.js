const express = require('express');
const Section = require('../../database/models/section');
const User = require('../../database/models/user');
const middleware = require('../middleware');
const helpers = require('../helpers');
const editNotes = require('./notes');

const section = express.Router();

// ================
// Helper Functions
// ================

// Checks if the user making this request is the owner of the section
function isOwner(req, object) {
  if (!req.user) {
    return false;
  }
  if (object.owner.toString() !== req.user.id) {
    return false;
  }
  return true;
}
function checkIsOwner(req, res, object) {
  if (isOwner(req, object)) {
    return false;
  }
  return res.status(403).json({
    error: 'This account is not authorized for this object',
  });
}

// Checks if the user making this request is allowed to edit this section
function isEditor(req, object) {
  if (isOwner(req, object)) {
    return true;
  }
  if (!req.user) {
    return false;
  }
  var editors = object.editors;
  for (let i = 0; i < editors.length; i ++) {
    var item = editors[i];
    if (item.toString() === req.user.id.toString()) {
      return true;
    }
  }
  return false;
}
function checkIsEditor(req, res, object) {
  if (isEditor(req, object)) {
    return false;
  }
  return res.status(403).json({
    error: 'This account is not authorized for this object',
  });
}

// Handles returning a section JSON object
async function sectionReturn(req, res, obj) {
  // Get the user data of this user
  const ownerObj = await helpers.getUserDataById(obj.owner);

  // Tell the frontend if this user is authorized to edit this object
  var userIsOwner = false;
  var userIsEditor = false;
  if (isOwner(req, obj)) {
    userIsOwner = true;
  }
  if (isEditor(req, obj)) {
    userIsEditor = true;
  }

  // Return
  return res.status(200).json({
    isOwner: userIsOwner,
    isEditor: userIsEditor,
    section: obj,
    owner: {
      username: ownerObj.username,
      _id: ownerObj._id,
    },
  });
}

// ======
// Routes
// ======

/**
 * Creates a new section and returns its data
 * @param {Hex} id - The id of the section, must be only hexadecimal
 * @body {String} title - The title of the section
 * @body {String} description - User notes about the section
 * @body {String} instrument - The id of this section's instrument (see models/section.js)
**/
section.post('/create', middleware.authenticateUser, async (req, res) => {
  // Create the section
  const sectionData = new Section({
    title: req.body.title || 'Unnamed section',
    description: req.body.description || '',
    instrument: req.body.instrument || 0,
    creationDateTime: Date.now(),
    lastEditDateTime: Date.now(),
    notes: '',
    owner: req.user.id,
    loopPoint: 15,
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
  return sectionReturn(req, res, sectionData);
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
  result = checkIsEditor(req, res, getObj);
  if (result) {return result;}

  // Change the section data
  getObj.title = req.body.title || getObj.title;
  getObj.description = req.body.description || getObj.description;
  getObj.instrument = req.body.instrument || getObj.instrument;
  getObj.loopPoint = req.body.loopPoint || getObj.loopPoint;
  getObj.lastEditDateTime = Date.now();

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Response
  return sectionReturn(req, res, getObj);
});

/**
 * Adds a user to the list of users that can edit a section
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
  result = checkIsOwner(req, res, getObj);
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
  return sectionReturn(req, res, getObj);
});

/**
 * Adds a note to a section
 * @param {Hex} id - The id of the section, must be only hex digits
 * @body {Int} pitch - The MIDI pitch of the note
 * @body {Float} time - The time the note will play (measured in bars)
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
  result = checkIsEditor(req, res, getObj);
  if (result) {return result;}

  // Ensure note info was specified
  pitch = req.body.pitch || 0;
  time = req.body.time || 0;

  // Change the section data and get the id of the new note
  getObj.lastEditDateTime = Date.now();
  const retId = editNotes.addNote(getObj.noteList, pitch, time);

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

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
  result = checkIsEditor(req, res, getObj);
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

  // Response
  return res.status(200).json({
    result: "Success",
  });
});


/**
 * Deletes a section
 * @param {Hex} id - The id of the section, must be only hex digits
**/
section.post('/delete/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
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
  result = checkIsOwner(req, res, getObj);
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
});

 
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
  return sectionReturn(req, res, getObj);
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
