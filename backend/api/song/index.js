const express = require('express');
const Section = require('../../database/models/section');
const Song = require('../../database/models/song');
const User = require('../../database/models/user');
const middleware = require('../middleware');
const helpers = require('../helpers');

const song = express.Router();

// ================
// Helper Functions
// ================

/**
 * Handles returning a song JSON object
**/
async function songReturn(req, res, obj) {
  // Tell the frontend if this user is authorized to edit this object
  var userIsOwner = false;
  var userIsEditor = false;
  if (helpers.isOwner(req, obj)) {
    userIsOwner = true;
  }
  if (helpers.isEditor(req, obj)) {
    userIsEditor = true;
  }

  // Go through sections and send section data instead of id's
  for (let i = 0; i < obj["sectionsAvailable"].length; i ++) {
    // Get the id of this section
    var itemId = obj["sectionsAvailable"][i];

    // Grab from database
    let getSection;
    try {
      getSection = await Section.findById(itemId).exec();
    } catch (error) {
      return res.status(500).json({
        error: 'Error retrieving from database',
      });
    }

    // Update the object
    obj["sectionsAvailable"][i] = getSection;
  }

  // Get user data
  const ownerObj = await helpers.getUserDataById(obj.owner);
  return res.status(200).json({
    isOwner: userIsOwner,
    isEditor: userIsEditor,
    song: obj,
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
 * Creates a new song and returns its data
 * @param {Hex} id - The id of the song, must be only hexadecimal
 * @body {String} title - The title of the song
 * @body {String} description - User notes about the song
**/
song.post('/create', middleware.authenticateUser, async (req, res) => {
   // Create the song
   const currentDateTime = Date.now();
   const songData = new Song({
     title: req.body.title || 'Unnamed song',
     description: req.body.description || '',
     creationDateTime: currentDateTime,
     lastEditDateTime: currentDateTime,
     owner: req.user.id,
   });
 
   // Save it to the database
   try {
     await songData.save();
   } catch (error) {
     return res.status(500).json({
       error: 'Error saving to database',
     });
   }
 
   // Response
   return songReturn(req, res, songData);
 });

/**
 * Makes a section available to be used in a song
 * @param {Hex} id - The id of the song, must be only hex digits
 * @param {Hex} sectionId - The id of the section, must be only hex digits
**/
song.post('/registerSection/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
   // Get the song to edit
   let getObj;
   try {
     getObj = await Song.findById(req.params.id).exec();
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

   // Ensure the authenticated user is an editor of this song
   result = helpers.checkIsEditor(req, res, getObj);
   if (result) {return result;}

   // Ensure a section id was specified
   var sectionId = req.body.sectionId;
   if (!sectionId) {
    return res.status(400).json({
        error: 'No sectionId specified',
      });
   }

   // Make sure the section actually exists
   let sectionObj;
   try {
    sectionObj = await Section.findById(sectionId).exec();
   } catch (error) {
     return res.status(500).json({
       error: 'Error retrieving from database',
     });
   }
   if (!sectionObj) {
     return res.status(404).json({
       error: 'Section object not found',
     });
   }

   // Ensure the authenticated user is the owner of the section
   result = helpers.checkIsOwner(req, res, sectionObj);
   if (result) {return result;}

   // Add the section to the song
   getObj.sectionsAvailable.push(sectionId);
 
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
 * Returns song data by id
 * @param {Hex} id - The id of the song, must be only hexadecimal
**/
song.get('/get/:id([a-f0-9]+)', async (req, res) => {
  // Get the song from the database
  let getObj;
  try {
    getObj = await Song.findById(req.params.id).exec();
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
  return songReturn(req, res, getObj);
});


 /**
 * Lists all songs the user has access to
**/
song.get('/list', middleware.authenticateUser, async (req, res) => {
  // Get the items they own
  try {
    getOwned = await Song.find({ owner: req.user.id });
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Get the items they can edit
  try {
    getInvited = await Song.find({ editors: req.user.id });
  } catch (error) {
    return res.status(500).json({
      error: 'Error retrieving from database',
    });
  }

  // Response
  return res.status(200).json({
    songs_owned: getOwned,
    songs_invited: getInvited,
  });
});

module.exports = song;
