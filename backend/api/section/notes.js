module.exports = {
    addNote: function(notes, pitch, time, instrument, duration) {
        // Handle optional params
        duration = duration || 1;
        instrument = instrument || 0;

        // Ensure this note isn't already in
        for (let i = 0; i < notes.length; i ++) {
            if (notes[i]["pitch"] == pitch && notes[i]["time"] == time) {
                return;
            }
        }
        
        // Add the note
        noteObj = {pitch: pitch, time: time, duration: duration, instrument: instrument};
        notes.push(noteObj);
        
        //Return
        return;
    },
    removeNote: function(notes, pitch, time) {
        // Find the note to remove
        for (let i = 0; i < notes.length; i ++) {
            if (notes[i]["pitch"] == pitch && notes[i]["time"] == time) {
                notes.splice(i, 1);
                i -= 1;
            }
        }
        
        // No note was found
        return;
    },
}
