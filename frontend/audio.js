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

function playNote(pitch) {
    // Calculate pitch in equal temperament
    let etPitch = Math.pow(2,pitch/12);

    // Set up the audio element
    const container = document.getElementById("channels");
    let ne = container.children[currentChannel];
    ne.setAttribute('src', "/sounds/note_test.wav");
    ne.mozPreservesPitch = false;
    ne.playbackRate = etPitch;

    // Play the note
    ne.play();

    // Increment the channel for the next note
    currentChannel ++;
    if (currentChannel >= maxSimultaneousNotes) {
        currentChannel = 0;
    }
}
