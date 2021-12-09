// Playback Variables
var playbackStatus = -1; // -1 = Not ready, 0 = Stopped, 1 = Playing
var bpm = 120;
var nextNote = 0;
var previousNote = 0;
var startTime = 0;
var playbackNoteList = [];
var playbackLoopPoint = -1;
var playbackIndex = 0; // Tracks how many loops we've made
var playbackFinal = false;
var animatePlayback = () => {};
var grabNotes = () => {};

// Sets the function to call that indicates the current position of the playbar
function setPlaybackAnimation(pa) {
    animatePlayback = pa;
}

// Sets the function to call when more notes need to be grabbed
function setNoteGrabber(ng) {
    grabNotes = ng;
}

// Sets the loop point for playback
function setLoopPoint(lp) {
    playbackLoopPoint = lp;
    recalculateNextNote();
}

// Updates the note list playback will play from
function updateNoteList(nl) {
    playbackNoteList = nl;
    recalculateNextNote();
}

// Sets the loop point for playback
function setBpm(bpm) {
    playbackLoopPoint = bpm;
    recalculateNextNote();
}

// Start playback
function playbackStart() {
    startTime = Date.now();
    nextNote = 0;
    previousNote = -1;
    playbackStatus = 1;

    // Grab next collection of notes
    grabData = grabNotes(playbackIndex);
    playbackNoteList = grabData["noteList"];
    loopbarPosition = grabData["loopbarPosition"];
    playbackFinal = grabData["final"];

    console.log("PLAY");
}

// Stop playback
function playbackStop() {
    playbackStatus = 0;
    movePlaybar(0);
    console.log("STOP");
}

// Toggle between play and stop
function togglePlayback() {
    // Play
    if (playbackStatus === 0) {
        playbackStart();
        return 1;
    }

    // Stop
    if (playbackStatus === 1) {
        playbackStop();
        return 0;
    }
}

// Enables playback
// to be called after note data has been received by frontend
function enablePlayback() {
    if (playbackStatus === -1) {
        playbackStatus = 0;
    }
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
    
    if (playbackNoteList.length === 0) {
        console.log("EMPTY!");
    }

    // Figure out when the next note is
    playbackNoteList.forEach(( item, index ) => {
        const t = timeToMs(item.time);
        if (t > now && t < earliest) {
            earliest = t;
        }
    });

    // See if the "next note" is actually the loop point
    const lp = timeToMs(playbackLoopPoint);
    if (lp < earliest && playbackLoopPoint > 0) {
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
        animatePlayback(msToTime(relativeTime));
        // If we've passed a note that should be played
        if (relativeTime >= nextNote) {
            // If we've passed the loop point, go back to the beginning
            const lp = timeToMs(playbackLoopPoint);
            if (lp <= nextNote && playbackLoopPoint > 0) {
                playbackIndex += 1;
                // If this is designated as the final set of notes, stop
                if (playbackFinal) {
                    playbackStop();
                }
                // Otherwise, go to the next set of notes
                else {
                    playbackStart();
                }
                
                return;
            }

            // Play notes
            playbackNoteList.forEach(( item, index ) => {
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

// Start the timer
setInterval(timer, 1);
