// Globals
var currentChannel = 0;
const maxSimultaneousNotes = 40;

// Audio/sound setup
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

// Build the audio channel elements
const container = document.getElementById("channels");
for (let i = 0; i < maxSimultaneousNotes; i ++) {
    // Create the audio element
    let ne = document.createElement("audio");
    container.appendChild(ne);

    // Set up audio for it
    var track = audioContext.createMediaElementSource(ne);
    track.connect(audioContext.destination);
}

// Returns the file string for the instrument
function getSoundFile(instrument) {
    if (instrument == 1) {
        return "/sounds/bass_g.wav";
    }
    if (instrument == 3) {
        return "/sounds/organ_g.wav";
    }
    return "/sounds/guitar_g.wav";
}

// Returns the file string for drums
function getDrumSoundFile(pitch) {
    if (pitch % 5 == 0) {
        return "/sounds/drum_kick.wav";
    }
    if (pitch % 5 == 1) {
        return "/sounds/drum_snare.wav";
    }
    if (pitch % 5 == 2) {
        return "/sounds/drum_tom_low.wav";
    }
    if (pitch % 5 == 3) {
        return "/sounds/drum_hihat_closed.wav";
    }
    return "/sounds/drum_crash.wav";
}

function playNote(pitch, instrument, duration) {
    // Calculate pitch in equal temperament
    let etPitch = Math.pow(2,pitch/12);

    // Set up the audio element
    const container = document.getElementById("channels");
    let ne = container.children[currentChannel];

    // Drums
    if (instrument == 2) {
        ne.playbackRate = 1;
        ne.setAttribute('src', getDrumSoundFile(pitch));
    }
    // Other instruments
    else {
        ne.setAttribute('src', getSoundFile(instrument));
        ne.playbackRate = etPitch;
        ne.mozPreservesPitch = false;
    }
    

    // Play the note
    ne.play();

    // Increment the channel for the next note
    currentChannel ++;
    if (currentChannel >= maxSimultaneousNotes) {
        currentChannel = 0;
    }
}
