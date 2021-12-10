const express = require('express');
const Section = require('../../database/models/section');
const Song = require('../../database/models/song');
const User = require('../../database/models/user');
const middleware = require('../middleware');
const helpers = require('../helpers');

const song = express.Router();

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
  return {
    isOwner: userIsOwner,
    isEditor: userIsEditor,
    song: obj,
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
     bpm: req.body.bpm || 120,
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
   return res.status(200).json(await songReturn(req, res, songData));
});

/**
 * Edits song metadata by id
 * @param {Hex} id - The id of the song, must be only hex digits
**/
song.post('/edit/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
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

  // Change the section data
  getObj.title = req.body.title || getObj.title;
  getObj.description = req.body.description || getObj.description;
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
  pusher.trigger("song_" + req.params.id, "update", await songReturn(req, res, getObj));

  // Response
  return res.status(200).json(await songReturn(req, res, getObj));
});

/**
 * Adds a user to the list of users that can edit this song
 * @param {Hex} id - The id of the song, must be only hex digits
 * @body {String} username - The username of the editor
**/
song.post('/addEditor/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
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

  // Ensure the authenticated user is the owner of this song
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
  return res.status(200).json(await songReturn(req, res, getObj));
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

   // Pusher
   pusher.trigger("song_" + req.params.id, "update", await songReturn(req, res, getObj));
 
   // Response
   return res.status(200).json({
     result: "Success",
   });
});

/**
 * Changes a slot in the arranger
 * @param {Hex} id - The id of the song, must be only hex digits
 * @body {Number} index - The slot index
 * @body {Hex} sectionId - The id of the section, must be only hex digits
 * @body {Boolean} clear - True if the slot should be cleared instead
**/
song.post('/changeSlot/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
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

  // Ensure an index was specified
  var index = req.body.index;
  if (index === undefined) {
    return res.status(400).json({
       error: 'No index specified',
    });
  }

  
  // First, clear the slot
  var sectionPlacements = getObj.sectionPlacements;
  var i = sectionPlacements.length;
  while (i--) {
    if (sectionPlacements[i]["time"] == index) {
      getObj.sectionPlacements.splice(i, 1);
    }
  }

  // If we're not just clearing the slot, put the new section in
  var clear = req.body.clear || false;
  if (!clear) {
    // Ensure a section id was specified
    var sectionId = req.body.sectionId;
    if (!sectionId) {
      return res.status(400).json({
        error: 'No sectionId specified',
      });
    }

    // Make sure the section is available in this song
    if (!getObj["sectionsAvailable"].includes(sectionId)) {
      return res.status(400).json({
        error: 'That section is not available for this song',
      });
    }

    // Build and push data
    const dict = {
      section: sectionId,
      time: index,
    };
    getObj.sectionPlacements.push(dict);
  }

  // Save it to the database
  try {
    await getObj.save();
  } catch (error) {
    return res.status(500).json({
      error: 'Error saving to database',
    });
  }

  // Pusher
  pusher.trigger("song_" + req.params.id, "update", await songReturn(req, res, getObj));

  // Response
  return res.status(200).json({
    result: "Success",
  });
});

/**
 * Deletes a song
 * @param {Hex} id - The id of the song, must be only hex digits
**/
song.post('/delete/:id([a-f0-9]+)', middleware.authenticateUser, async (req, res) => {
  // Get the song to delete
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

  // Ensure the authenticated user is owner of this song
  result = helpers.checkIsOwner(req, res, getObj);
  if (result) {return result;}

  // Delete it
  try {
    await Song.deleteOne({ _id: getObj._id });
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
  return res.status(200).json(await songReturn(req, res, getObj));
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
