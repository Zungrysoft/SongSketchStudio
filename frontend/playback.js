// Playback Variables
var playbackStatus = -1; // -1 = Not ready, 0 = Stopped, 1 = Playing
var playbackBpm = 120;
var nextNote = 0;
var previousNote = 0;
var startTime = 0;
var loopingEnabled = 0;
var playbackSectionList = [];
var playbackIndex = 0; // Tracks how many loops we've made
var animatePlayback = () => {};
var trackPlayback = () => {};

// Sets the function to call that indicates the current position of the playbar
function setPlaybackAnimation(pa) {
    animatePlayback = pa;
}

// Sets the function to call that indicates the current position of the playbar
function setPlaybackTracker(pt) {
    trackPlayback = pt;
}

// Updates the section list playback will play from
function updateSectionList(nl) {
    // If the playback shrinks (which shouldn't happen) to less than the current index,
    // stop playback
    if (playbackIndex >= nl.length) {
        playbackStop();
    }
    playbackSectionList = nl;
    recalculateNextNote();
}

// Sets the loop point for playback
function setBpm(bpm) {
    playbackBpm = bpm;
    recalculateNextNote();
}

// Sets loop mode for playback
function setLoopMode(lm) {
    loopingEnabled = lm;
}

// Start playback
function playbackStart(index) {
    startTime = Date.now();
    nextNote = 0;
    previousNote = -1;
    playbackStatus = 1;
    playbackIndex = index || 0;
    trackPlayback(index || 0);

    console.log("PLAY");
}

// Stop playback
function playbackStop() {
    playbackStatus = 0;
    animatePlayback(0);
    trackPlayback(-1);
    console.log("STOP");
}

// Toggle between play and stop
function togglePlayback(index) {
    // Play
    if (playbackStatus === 0) {
        playbackStart(index);
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
    return time / (playbackBpm / 60000);
}

// Convert from milliseconds to Piano-Roll time
function msToTime(time) {
    return time * (playbackBpm / 60000);
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

    // Figure out when the next note is
    playbackSectionList[playbackIndex]["notes"].forEach(( item, index ) => {
        const t = timeToMs(item.time);
        if (t > now && t < earliest) {
            earliest = t;
        }
    });

    // See if the "next note" is actually the loop point
    const loopPoint = playbackSectionList[playbackIndex]["loopPoint"];
    const lpms = timeToMs(loopPoint);
    if (lpms < earliest) {
        earliest = lpms;
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
            const loopPoint = playbackSectionList[playbackIndex]["loopPoint"];
            const lpms = timeToMs(loopPoint);
            if (lpms <= nextNote) {
                // If we have run out of sections to play, stop playback or loop
                if (playbackIndex >= playbackSectionList.length-1) {
                    if (loopingEnabled) {
                        playbackStart(0);
                    }
                    else {
                        playbackStop();
                    }
                }
                // Otherwise, go to the next set of notes
                else {
                    playbackStart(playbackIndex + 1);
                }
                
                return;
            }

            // Play notes
            playbackSectionList[playbackIndex]["notes"].forEach(( item, index ) => {
                const t = timeToMs(item.time);
                if (previousNote < t && t <= nextNote) {
                    console.log("PLAYED NOTE: ", item.pitch);
                    console.log("INSTRUMENT: ", item.instrument);
                    playNote(item.pitch, item.instrument, item.duration);
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
