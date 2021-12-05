// =====
// Setup
// =====

// Globals
var loopbarPosition = 0;
var nextId = 0;
var noteList = [];
var editingEnabled = false;

// Playback Variables
var playbackStatus = -1; // -1 = Not ready, 0 = Stopped, 1 = Playing
var bpm = 120;
var nextNote = 0;
var previousNote = 0;
var startTime = 0;

// Constants
const noteWidth = 40;
const noteHeight = 30;

// Query Params
const urlParams = new URLSearchParams(window.location.search);
const sectionId = urlParams.get('id');

// Redirect user if id query param is invalid
if (!sectionId) {
    window.location.href = "error_404.html";
}

// =======
// Helpers
// =======

function movePlaybar(xPos) {
    // Edit HTML
    let xCSS = (xPos*noteWidth) + "px";
    var cssVal = "position: absolute; pointer-events: none; top: 0px; left: " + xCSS;
    document.getElementById("playbar").setAttribute('style', cssVal);
}

function moveLoopbar(xPos) {
    loopbarPosition = xPos + 1;
    recalculateNextNote();

    // Edit HTML
    let xCSS = (xPos*noteWidth) + "px";
    var cssVal = "position: absolute; pointer-events: none; top: 0px; left: " + xCSS;
    document.getElementById("loopbar").setAttribute('style', cssVal);

    // Build request body
    const body = {
        loopPoint: xPos,
    };

    // Make the request
    request_post('api/section/edit/' + sectionId, body);
}

function reloadNotes() {
    const container = document.getElementById("note_list");

    // Delete all existing note elements
    while (container.lastChild) {
        container.removeChild(container.lastChild);
    }

    // Build new note elements
    noteList.forEach((item, index) => {
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

    recalculateNextNote();
}

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

function getPageData() {
    // TODO make this link dynamic
    request_get('api/section/get/' + sectionId, json => {
        // Make sure the user wasn't denied access
        if (json["error"]) {
            console.log("CANT LOAD");
            //window.location.href = "error_access.html";
        }

        var readList = json["section"]["noteList"];
        
        // Give each note an id for the frontend
        for (let i = 0; i < readList.length; i ++) {
            readList[i]["id"] = nextId;
            nextId ++;
        }
        noteList = readList;
        reloadNotes();

        // Enable playback
        if (playbackStatus === -1) {
            playbackStatus = 0;
        }

        // Get loop point
        moveLoopbar(json["section"]["loopPoint"]);

        // Update editing mode
        editingEnabled = json["isEditor"];
    });
}

// =================
// Piano-Roll Player
// =================

// Start playback
function playbackStart() {
    startTime = Date.now();
    nextNote = 0;
    previousNote = -1;
    playbackStatus = 1;
    console.log("PLAY");
}

// Stop playback
function playbackStop() {
    playbackStatus = 0;
    movePlaybar(0);
    console.log("STOP");
}

// Convert from Piano-Roll time to milliseconds
function timeToMs(time) {
    return time / (bpm / 60000);
}

// Convert from milliseconds to Piano-Roll time
function msToTime(time) {
    return time * (bpm / 60000);
}

// If note data changes during playback, this will make sure that note doesn't get skipped
function recalculateNextNote() {
    if (playbackStatus === 1) {
        const relativeTime = Date.now() - startTime;
        nextNote = findNextNote(relativeTime);
        previousNote = relativeTime;
    }
}

// Finds the next time where a note is
function findNextNote(now) {
    var earliest = 1000000000000000;
    
    if (noteList.length === 0) {
        console.log("EMPTY!");
    }

    // Figure out when the next note is
    noteList.forEach(( item, index ) => {
        const t = timeToMs(item.time);
        if (t > now && t < earliest) {
            earliest = t;
        }
    });

    // See if the "next note" is actually the loop point
    const lp = timeToMs(loopbarPosition);
    if (lp < earliest) {
        earliest = lp;
    }

    console.log(earliest)
    return earliest;
}

// Called every millisecond to run the playback
function timer() {
    // If playback is running
    if (playbackStatus === 1) {
        // Calculate time in ms since playback was started
        const relativeTime = Date.now() - startTime;
        movePlaybar(msToTime(relativeTime));
        // If we've passed a note that should be played
        if (relativeTime >= nextNote) {
            // If we've passed the loop point, go back to the beginning
            const lp = timeToMs(loopbarPosition);
            if (lp <= nextNote) {
                playbackStart();
                return;
            }

            // Play notes between next note and previous note
            noteList.forEach(( item, index ) => {
                const t = timeToMs(item.time);
                if (previousNote < t && t <= nextNote) {
                    console.log("PLAYED NOTE: ", item.pitch);
                    playNote(item.pitch);
                }
            });

            // Set the next timer stop point
            previousNote = nextNote;
            nextNote = findNextNote(nextNote);
        }
    }
}


// ====================
// Element Click Events
// ====================

// Timeline at the top of the screen
function timelineClick(e) {
    // Make sure editing is enabled
    if (editingEnabled) {
        // Determine the coords the image was clicked at
        var x = e.clientX + window.pageXOffset;

        // Use this to determine which cell they clicked
        var xCell = Math.trunc(x/noteWidth);

        // Move the playbar
        moveLoopbar(xCell);
    }
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

        // Play
        if (playbackStatus === 0) {
            playbackStart();
        }

        // Stop
        else if (playbackStatus === 1) {
            playbackStop();
        }
    }
    else if(e.keyCode === 17) {
        console.log("======================");
        console.log("Playback Status: ", playbackStatus)
        console.log("Number of Notes: ", noteList.length)
        console.log("Previous Note: ", previousNote);
        console.log("Next Note: ", nextNote);
        console.log("Start Time: ", startTime);
        console.log("======================");
    }
};

// =====
// Other
// =====

// Load in notes from server
getPageData();

// Gives the playbar its starting CSS at position 0
movePlaybar(0);
moveLoopbar(0);

// Start the timer
setInterval(timer, 1);

// Removes the JavaScript Warning since JavaScript is working
document.getElementById("no_js_warning").remove();
