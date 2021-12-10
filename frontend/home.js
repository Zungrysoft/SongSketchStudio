// Helper function for adding a section link
function addItem(category, title, id, type) {
    // Create the element
    var ne = document.createElement("a");
    ne.innerText = title;
    ne.href = HOST + type + ".html?id=" + id; // HOST global is defined in request.js

    // Attach it to the list
    const container = document.getElementById(category);
    container.appendChild(ne);
}

// Retrieves information for this page
function getPageData() {
    getPageSections();
}

function getPageSections() {
    // First, get the sections
    request_get('api/section/list', (json, res) => {
        // If user is not authenticated, take them to login page
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        // If some other error, take user to error page
        if (res.status >= 500) {
            //window.location.href = "error_500.html";
            return;
        }

        // Get the sections list
        var sections_owned = json["sections_owned"];
        var sections_invited = json["sections_invited"];

        // Delete the "Nothing Here" message
        if (sections_invited.length > 0) {
            document.getElementById("sections_invited").innerText = "";
        }
        
        // Sort the sections by most recently edited first
        sections_owned.sort((a, b) => {
            return new Date(b["lastEditDateTime"]) - new Date(a["lastEditDateTime"]);
        });
        sections_invited.sort((a, b) => {
            return new Date(b["lastEditDateTime"]) - new Date(a["lastEditDateTime"]);
        });
        
        // Build the elements for each section
        sections_owned.forEach((section, index) => {
            var title = section["title"];
            var id = section["_id"];
            addItem("sections_owned", title, id, "section");
        })
        sections_invited.forEach((section, index) => {
            var title = section["title"];
            var id = section["_id"];
            addItem("sections_invited", title, id, "section");
        })

        // Now do songs
        getPageSongs();
    });
}

function getPageSongs() {
    // Second, get the songs
    request_get('api/song/list', (json, res) => {
        // If user is not authenticated, take them to login page
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        // If some other error, take user to error page
        if (res.status >= 500) {
            //window.location.href = "error_500.html";
            return;
        }

        // Get the song list
        var songs_owned = json["songs_owned"];
        var songs_invited = json["songs_invited"];

        // Delete the "Nothing Here" message
        if (songs_invited.length > 0) {
            document.getElementById("songs_invited").innerText = "";
        }
        
        // Sort the songs by most recently edited first
        songs_owned.sort((a, b) => {
            return new Date(b["lastEditDateTime"]) - new Date(a["lastEditDateTime"]);
        });
        songs_invited.sort((a, b) => {
            return new Date(b["lastEditDateTime"]) - new Date(a["lastEditDateTime"]);
        });
        
        // Build the elements for each song
        songs_owned.forEach((song, index) => {
            var title = song["title"];
            var id = song["_id"];
            addItem("songs_owned", title, id, "song");
        })
        songs_invited.forEach((song, index) => {
            var title = song["title"];
            var id = song["_id"];
            addItem("songs_invited", title, id, "song");
        })
    });
}

// Button for creating a new section
function createSectionClick(e) {
    request_post('api/section/create', {}, (json, res) => {
        if (res.status == 200) {
            var id = json["section"]["_id"];
            window.location.href = "section_edit.html?id=" + id;
        }
    });
}

// Button for creating a new song
function createSongClick(e) {
    request_post('api/song/create', {}, (json, res) => {
        if (res.status == 200) {
            var id = json["song"]["_id"];
            window.location.href = "song_edit.html?id=" + id;
        }
    });
}

getPageData();
