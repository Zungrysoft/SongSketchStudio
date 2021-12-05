const express = require('express');
const Section = require('../../database/models/section');
const Song = require('../../database/models/song');
const User = require('../../database/models/user');
const middleware = require('../middleware');
const helpers = require('../helpers');

const song = express.Router();

song.use(middleware.authenticateUser);

// ================
// Helper Functions
// ================

/**
 * Handles returning a song JSON object
 * @param {String | ObjectID} id - The id of the User
 */
 async function songReturn(req, res, obj) {
    const ownerObj = await helpers.getUserDataById(obj.owner);
    return res.status(200).json({
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
 */
 song.route('/create')
 .post(async (req, res) => {  
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
 * Adds a section to a song
 * @param {Hex} id - The id of the song, must be only hex digits
 * @param {Hex} sectionId - The id of the section, must be only hex digits
 */
song.route('/addSection/:id([a-f0-9]+)', middleware.authenticateUser)
 .post(async (req, res) => {
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
 
   // Ensure the authenticated user is owner of this section
   result = checkIsOwner(req, res, getObj);
   if (result) {return result;}

   // Ensure a section id was specified
   if (!sectionId) {
    return res.status(400).json({
        error: 'No sectionId specified',
      });
   }
 
   // Add the section to the song
   getObj.sectionList.push(sectionId)
 
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

module.exports = song;
