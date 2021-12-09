// =====
// Setup
// =====

// Globals
var playbarPosition = 0;
var playbarStart = 0;
var nextId = 0;
var editingEnabled = true;

// Section list
const MAX_SECTIONS = 24;
var sectionPlacements = [];
var sectionsAvailable = {};

// Playback Variables
var playbackStatus = -1; // -1 = Not ready, 0 = Stopped, 1 = Playing
var bpm = 120;
var nextNote = 0;
var previousNote = 0;
var startTime = 0;
var index = 0;

// Constants
const sectionWidth = 160;
const sectionHeight = 120;

// Query Params
const urlParams = new URLSearchParams(window.location.search);
const songId = urlParams.get('id');

// Redirect user if id query param is invalid
if (!songId) {
    window.location.href = "error_404.html";
}

// =======
// Helpers
// =======

function movePlaybar(xPos) {
    // Edit HTML
    let xCSS = (xPos*sectionWidth) + "px";
    var cssVal = "position: absolute; pointer-events: none; top: 0px; left: " + xCSS;
    document.getElementById("playbar").setAttribute('style', cssVal);
}

/*function reloadSections() {
    const container = document.getElementById("section_list");

    // Delete all existing section elements
    while (container.lastChild) {
        container.removeChild(container.lastChild);
    }

    // Build new section elements
    sectionPlacements.forEach((item, index) => {
        // Build style
        let xCSS = (item.time*noteWidth) + "px"
        let yCSS = ((item.pitch*noteHeight) + (noteHeight * 2)) + "px"
        let cssVal = "position: absolute; left: " + xCSS + "; top: " + yCSS;

        // Build function call
        let functionCall = "noteClick(" + item.id + ", event)";

        // Create element
        let ne = document.createElement("img");
        ne.setAttribute('src', "/images/note_green_light.png");
        ne.setAttribute('style', cssVal);
        ne.setAttribute('onClick', functionCall);
        ne.setAttribute('draggable', 'false');
        ne.setAttribute('alt', '');
        container.appendChild(ne);
    });
}*/
/*
function createNote(x, y) {
    // Build the note object
    const toAdd = {id: nextId, pitch: y, time: x};
    nextId ++;

    // Append it to the list
    noteList.push(toAdd);

    // Re-render the note objects based on the updated list
    reloadNotes();

    // Play the note
    playNote(y);

    // Build request body
    const body = {
        time: x,
        pitch: y
    };
    
    // Notify the server
    request_post('api/section/addNote/' + sectionId, body);
}

function deleteNote(id) {
    // Filter note out
    for (let i = 0; i < noteList.length; i ++) {
        var note = noteList[i];
        if (note["id"] == id) {
            // Remove from list
            noteList.splice(i, 1);

            // Build request body
            const body = {
                time: note.time,
                pitch: note.pitch
            };
            
            // Notify the server
            request_post('api/section/removeNote/' + sectionId, body);
            
            i ++;
        }
    }
    reloadNotes();
}
*/
function updateTabTitle(str) {
    document.getElementById("tab_title").innerText = str + " - SongSketchStudio";
}

function songNoteGrabber(index) {
    const data = sectionPlacements[index];

    // Build default return data (for empty slot)
    var noteList = [];
    var loopPoint = -1;
    var final = false;

    // Check if slot is filled
    var id = data["_id"];
    if (id) {
        noteList = sectionsAvailable[id]["noteList"];
        loopPoint = sectionsAvailable[id]["loopPoint"];
    }
    // Check if this is the last section
    if (index >= MAX_SECTIONS-1) {
        final = true;
    }
    
    // Build dict
    const dict = {
        noteList: noteList,
        loopPoint: loopPoint,
        final: final,
    }
    
    return dict;
}

function getPageData() {
    // Reset data
    sectionsAvailable = {};
    sectionPlacements = [];
    for (let i = 0; i < MAX_SECTIONS; i ++) {
        sectionPlacements.push({});
    }

    // First, get song data
    request_get('api/song/get/' + songId, json => {
        // Make sure the user wasn't denied access
        if (json["error"]) {
            console.log("CANT LOAD");
            //window.location.href = "error_access.html";
        }

        // Convert backend sectionPlacements format to frontend format
        var readList = json["song"]["sectionPlacements"];
        readList.forEach((item, index) => {
            // Pull json data out
            var id = item["_id"];
            var time = item["time"];

            // Confirm time is okay
            if (time >= MAX_SECTIONS || time < 0) {
                return;
            }

            // Package id and title as a dict
            sectionPlacements[time] = id;
        });
        console.log(sectionsAvailable);

        // Convert backend sectionsAvailable format to frontend format
        readList = json["song"]["sectionsAvailable"];
        readList.forEach((item, index) => {
            // Pull json data out
            var id = item["_id"];

            // Package id and title as a dict
            sectionsAvailable[id] = item;
        });
        console.log(sectionsAvailable);

        // Enable playback
        enablePlayback();

        // Update tab title
        updateTabTitle(json["song"]["title"]);

        // Set bpm
        setBpm(json["song"]["bpm"] || 120);

        // Set playbar animation as the animation callback in playback.js
        setPlaybackAnimation(() => {});

        // Set grab notes callback
        setNoteGrabber(songNoteGrabber);

        // Update editing mode
        editingEnabled = json["isEditor"];
    });
}

// ====================
// Element Click Events
// ====================

// Timeline at the top of the screen
function timelineClick(e) {
    // Determine the coords the image was clicked at
    var x = e.clientX + window.pageXOffset;

    // Use this to determine which cell they clicked
    var xCell = Math.trunc(x/sectionWidth);

    // Move the playbar
    movePlaybar(xCell);
}

// Piano Roll
function pianoRollClick(e) {
    // Make sure editing is enabled
    if (editingEnabled) {
        // Determine the coords the image was clicked at
        var x = e.clientX + window.pageXOffset;
        var y = e.clientY + window.pageYOffset - (noteHeight * 2);

        // Use this to determine which cell they clicked
        var xCell = Math.trunc(x/noteWidth);
        var yCell = Math.trunc(y/noteHeight);

        // Call the note creation function
        createNote(xCell, yCell);
    }
}

// Note
function noteClick(id, e) {
    // Make sure editing is enabled
    if (editingEnabled) {
        deleteNote(id);
    }
}

// ==============
// Special Events
// ==============

window.onkeydown = function(e){
    if(e.keyCode === 32) {
        // Prevent Spacebar Scrolling
        e.preventDefault();

        // Toggle playback
        togglePlayback();
    }
};

// =====
// Other
// =====

// Load in notes from server
getPageData();

// Gives the playbar its starting CSS at position 0
movePlaybar(0);

// Removes the JavaScript Warning since JavaScript is working
document.getElementById("no_js_warning").remove();
