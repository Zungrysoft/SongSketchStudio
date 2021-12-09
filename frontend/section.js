// =====
// Setup
// =====

// Globals
var loopbarPosition = 0;
var nextId = 0;
var noteList = [];
var editingEnabled = false;

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

// Animates the playbar
function movePlaybar(xPos) {
    // Edit HTML
    let xCSS = (xPos*noteWidth) + "px";
    var cssVal = "position: absolute; pointer-events: none; top: 0px; left: " + xCSS;
    document.getElementById("playbar").setAttribute('style', cssVal);
}

function moveLoopbar(xPos) {
    loopbarPosition = xPos + 1;
    reloadNotes();

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
    updateSectionList([
        {
            notes: noteList,
            loopPoint: loopbarPosition,
        }
    ]);
    const container = document.getElementById("note_list");

    // Delete all existing note elements
    while (container.lastChild) {
        container.removeChild(container.lastChild);
    }

    // Build new note elements
    noteList.forEach((item, index) => {
        // Build style
        let xCSS = (item.time*noteWidth) + "px";
        let yCSS = ((item.pitch*noteHeight) + (noteHeight * 2)) + "px";
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

function updateTabTitle(str) {
    document.getElementById("tab_title").innerText = str + " - SongSketchStudio";
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
        enablePlayback();

        // Move loop point
        moveLoopbar(json["section"]["loopPoint"]);

        // Update tab title
        updateTabTitle(json["section"]["title"]);

        // Set bpm
        setBpm(json["section"]["bpm"] || 120);

        // Enabled looping
        setLoopMode(true);

        // Set playbar animation as the animation callback in playback.js
        setPlaybackAnimation(movePlaybar);

        // Update editing mode
        editingEnabled = json["isEditor"];
    });
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

        // Move the loopbar
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

        // Toggle playback
        togglePlayback();
    }
};

// =====
// Other
// =====

// Load in notes from server
getPageData();

// Gives the playbars their starting CSS at position 0
moveLoopbar(0);
movePlaybar(0);

// Removes the JavaScript Warning since JavaScript is working
document.getElementById("no_js_warning").remove();
