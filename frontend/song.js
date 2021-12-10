// =====
// Setup
// =====

// Globals
var startbarPosition = 0;
var nextId = 0;
var editingEnabled = false;
var currentIndex = -1;

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
const timelineHeight = 60;
const VERTICAL_BUTTON_SPACING = 40;
const VERTICAL_BUTTON_DISTANCE = 200;

// Query Params
const urlParams = new URLSearchParams(window.location.search);
const songId = urlParams.get('id');

// Redirect user if id query param is invalid
if (!songId) {
    window.location.href = "error_404.html";
}

// Pusher
var pusher = new Pusher('89d75d5bd73462337ba8', {
    cluster: 'us3'
});
var channel = pusher.subscribe('song_' + songId);
channel.bind('update', function(data) {
    updateFromPageData(data);
});

// =======
// Helpers
// =======

function moveStartbar(xPos) {
    // Edit HTML
    startbarPosition = xPos;
    let xCSS = (xPos*sectionWidth) + "px";
    var cssVal = "position: absolute; pointer-events: none; top: 0px; left: " + xCSS;
    document.getElementById("startbar").setAttribute('style', cssVal);
}

// Converts the way sections are stored for the frontend to data playback.js can read
function convertSectionData() {
    const ret = [];

    // Go through sectionPlacements
    for (let i = 0; i < sectionPlacements.length; i ++) {
        // Default data
        var noteList = [];
        var loopPoint = -1;

        // Check if slot has a section in it
        var id = sectionPlacements[i];
        if (id) {
            noteList = sectionsAvailable[id]["noteList"];
            loopPoint = sectionsAvailable[id]["loopPoint"];
        }
        
        // Build dict
        const dict = {
            notes: noteList,
            loopPoint: loopPoint,
        }

        ret.push(dict);
    }

    return ret;
}

function reloadSections() {
    // Update note/section data in playback
    updateSectionList(convertSectionData());

    // Build elements
    const container = document.getElementById("section_list");

    // Delete all existing section elements
    while (container.lastChild) {
        container.removeChild(container.lastChild);
    }

    // Build the buttons (only if editing is enabled)
    if (editingEnabled) {
        for (let i = 0; i < MAX_SECTIONS; i ++) {
            let j = 0;
            for (const key in sectionsAvailable) {
                // Get object
                const item = sectionsAvailable[key];

                // Build style
                const xCSS = (sectionWidth * i) + "px";
                const yCSS = ((VERTICAL_BUTTON_SPACING*j) + VERTICAL_BUTTON_DISTANCE) + "px";
                const colorCSS = sectionPlacements[i] == item["_id"] ? "yellow" : "white";

                const cssVal = "position: absolute" + 
                    ";left: " + xCSS + 
                    "; top: " + yCSS + 
                    "; width: " + sectionWidth +
                    "; background-color: " + colorCSS;

                // Build function call
                const functionCall = "sectionClick(\"" + item["_id"] + "\", " + i + ", event)";

                // Create element
                let ne = document.createElement("button");
                ne.setAttribute('type', 'submit');
                ne.setAttribute('style', cssVal);
                ne.setAttribute('onClick', functionCall);
                ne.innerText = item["title"];
                container.appendChild(ne);

                j ++;
            }
        }
    }
    rebuildTiles();
}

function rebuildTiles() {
    // Build elements
    const tile_container = document.getElementById("tile_list");

    // Delete all existing section elements
    while (tile_container.lastChild) {
        tile_container.removeChild(tile_container.lastChild);
    }

    // Build the tiles
    for (let i = 0; i < MAX_SECTIONS; i ++) {
        if (sectionPlacements[i].length > 0) {
            // Build style
            const xCSS = (sectionWidth * i) + "px";
            const yCSS = timelineHeight + "px";

            const cssVal = "position: absolute; left: " + xCSS + "; top: " + yCSS;

            // Build function call
            const functionCall = "sectionLinkClick(\"" + sectionPlacements[i] + "\", event)";

            // Determine image
            const image = (i == currentIndex) ? "/images/arranger_item_selected.png" : "/images/arranger_item.png";

            // Create element
            let ne = document.createElement("img");
            ne.setAttribute('src', image);
            ne.setAttribute('style', cssVal);
            ne.setAttribute('onClick', functionCall);
            ne.setAttribute('draggable', 'false');
            ne.setAttribute('id', 'tile_' + i);
            ne.setAttribute('alt', '');
            tile_container.appendChild(ne);
        }
    }
}

// Playback will call this function upon changing sections
// So the frontend can animate its movement through sections
function trackIndex(index) {
    currentIndex = index;
    rebuildTiles();
}

function updateTabTitle(str) {
    document.getElementById("tab_title").innerText = str + " - SongSketchStudio";
}

function updateFromPageData(json) {
    // Reset data
    sectionsAvailable = {};
    sectionPlacements = [];
    for (let i = 0; i < MAX_SECTIONS; i ++) {
        sectionPlacements.push("");
    }

    // Convert backend sectionPlacements format to frontend format
    var readList = json["song"]["sectionPlacements"];
    readList.forEach((item, index) => {
        // Pull json data out
        var id = item["section"];
        var time = item["time"];

        // Confirm time is okay so no index OOB
        if (time >= MAX_SECTIONS || time < 0) {
            time = 0;
        }

        // Package id and title as a dict
        sectionPlacements[time] = id;
    });

    // Convert backend sectionsAvailable format to frontend format
    readList = json["song"]["sectionsAvailable"];
    readList.forEach((item, index) => {
        // Pull json data out
        var id = item["_id"];

        // Package id and title as a dict
        sectionsAvailable[id] = item;
    });

    // Update tab title
    updateTabTitle(json["song"]["title"]);

    // Set bpm
    setBpm(json["song"]["bpm"] || 120);

    // Reload
    reloadSections();
}

function getPageData() {
    // Get song data
    request_get('api/song/get/' + songId, (json) => {
        // Update editing mode
        editingEnabled = json["isEditor"];

        // Enable playback
        enablePlayback();

        // Interpret backend data
        updateFromPageData(json);
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

    // Move the startbar
    moveStartbar(xCell);
}

// Section Button
function sectionClick(id, index, e) {
    if (sectionPlacements[index] == id) {
        // Clear slot
        sectionPlacements[index] = "";

        // Build request body
        const body = {
            index: index,
            clear: true,
        };
        
        // Notify the server
        request_post('api/song/changeSlot/' + songId, body);
    }
    else {
        // Fill slot
        sectionPlacements[index] = id;

        // Build request body
        const body = {
            index: index,
            sectionId: id,
            clear: false,
        };
        
        // Notify the server
        request_post('api/song/changeSlot/' + songId, body);
    }
    reloadSections();
}

// Section Link
function sectionLinkClick(id, e) {
    window.open(HOST + "section.html?id=" + id, "_blank");
}

// ==============
// Special Events
// ==============

window.onkeydown = function(e) {
    if(e.keyCode === 32) {
        // Prevent Spacebar Scrolling
        e.preventDefault();

        // Toggle playback
        togglePlayback(startbarPosition);
    }
};

// =====
// Other
// =====

// Set index tracker as the animation callback in playback.js
setPlaybackTracker(trackIndex);

// Load in notes from server
getPageData();

// Gives the startbar its starting CSS at position 0
moveStartbar(0);

// Removes the JavaScript Warning since JavaScript is working
document.getElementById("no_js_warning").remove();
