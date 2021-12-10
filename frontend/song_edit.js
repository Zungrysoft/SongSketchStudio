// Error Messages
const FAILURE = "Something went wrong";
const DELETE_CONFIRMATION = "You must type DELETE in the text box";
const NO_TITLE = "You must provide a title";
const NO_USERNAME = "You must provide a username";
const NOT_NUMBER = "Bpm must be a positive number";

// Query Params
const urlParams = new URLSearchParams(window.location.search);
const songId = urlParams.get('id');

// Redirect user if id query param is invalid
if (!songId) {
    window.location.href = "error_404.html";
}

var sectionsAvailable = [];

// Helper function for adding a section link
function addItem(title, id) {
    // Create the element
    var ne = document.createElement("a");
    ne.innerText = title;
    ne.setAttribute('onClick', "addSectionClick(\"" + id + "\", event)");
    ne.setAttribute('id', id);
    ne.href = "javascript:;"

    console.log(ne);

    // Attach it to the list
    const container = document.getElementById("sections_owned");
    container.appendChild(ne);
}

// Retrieves information for this page
function getPageData() {
    // First, get the songs
    request_get('api/song/get/' + songId, (json, res) => {
        // If user is not authenticated, take them to login page
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        // 404 error
        if (res.status === 404) {
            window.location.href = "error_404.html";
            return;
        }
        // If some other error, take user to error page
        if (res.status >= 500) {
            window.location.href = "error_500.html";
            return;
        }

        // If the user is not authorized to edit this page, just redirect them to the song viewer
        if (json["isEditor"] === false) {
            window.location.href = "song.html?id=" + songId;
            return;
        }

        // If the user is not the owner, remove owner-only settings
        console.log(json);
        if (json["isOwner"] === false) {
            owner_only = document.getElementById("owner_only");
            owner_only.parentElement.removeChild(owner_only);
        }  
        
        // Edit the HTML data
        var title = json["song"]["title"];
        var description = json["song"]["description"];
        var bpm = json["song"]["bpm"];
        sectionsAvailable = json["song"]["sectionsAvailable"];
        console.log(bpm);
        document.getElementById("title").value = title;
        document.getElementById("description").value = description;
        document.getElementById("bpm").value = bpm;

        // Now get the sections for the section adder
        getSectionList();
    });
}

function getSectionList() {
    // Then, get sections to make the section list
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
        
        // Sort the sections by most recently edited first
        sections_owned.sort((a, b) => {
            return new Date(b["lastEditDateTime"]) - new Date(a["lastEditDateTime"]);
        });
        
        // Build the elements for each section
        sections_owned.forEach((section, index) => {
            var title = section["title"];
            var id = section["_id"];

            // Make sure this section isn't already added
            for (let i = 0; i < sectionsAvailable.length; i ++) {
                if (sectionsAvailable[i]["_id"] == id) {
                    return;
                }
            }

            addItem(title, id);
        })
    });
}

function submitClick(e) {
    // Retrieve data from the username and password boxes
    var title = document.getElementById("title").value;
    var description = document.getElementById("description").value;
    var bpm = document.getElementById("bpm").value;

    // Make sure the title is not empty
    if (title.length === 0) {
        document.getElementById("error_message").innerText = NO_TITLE;
        return;
    }

    // Make sure the bpm is a positive number
    bpm = parseInt(bpm);
    if (bpm == null || !(bpm > 0)) {
        document.getElementById("error_message").innerText = NOT_NUMBER;
        return;
    }

    // Build request body
    var body = {
        title: title,
        description: description,
        bpm: bpm,
    };

    // Make the request
    request_post('api/song/edit/' + songId, body, (json, res) => {
        // Make sure the request was successful
        if (res["status"] === 200) {
            // Redirect the user back to the song's page
            window.location.href = "song.html?id=" + songId;
            return;
        }
        else {
            document.getElementById("error_message").innerText = FAILURE;
        }
    });
}

function backClick(e) {
    window.location.href = "song.html?id=" + songId;
}

function editorClick(e) {
    // Retrieve data from the text box
    var username = document.getElementById("editor").value;

    // Make sure the username is not empty
    if (username.length === 0) {
        document.getElementById("error_message_editor").innerText = NO_USERNAME;
        return;
    }

    // Build request body
    var body = {
        username: username,
    };

    // Make the request
    request_post('api/song/addEditor/' + songId, body, (json, res) => {
        // Make sure the login was successful
        if (res["status"] === 200) {
            // Redirect the user to the login page
            document.getElementById("confirmation_message_editor").innerText = username + " is now an editor";
            document.getElementById("error_message_editor").innerText = "";
            document.getElementById("editor").value = "";
            return;
        }
        else {
            if (json && json["error"]) {
                document.getElementById("error_message_editor").innerText = json["error"];
            }
            else {
                document.getElementById("error_message_editor").innerText = FAILURE;
            }
        }
    });
}

function deleteClick(e) {
    // Make sure the user typed the confirmation text properly
    var delete_confirm = document.getElementById("delete_confirm").value;
    if (delete_confirm !== "DELETE") {
        document.getElementById("error_message_delete").innerText = DELETE_CONFIRMATION;
        return;
    }
    
    // Make the request
    request_post('api/song/delete/' + songId, {}, (json, res) => {
        // Make sure the request was successful
        if (res["status"] === 200) {
            // Redirect the user back to their home page
            window.location.href = "home.html";
            return;
        }
        else {
            document.getElementById("error_message").innerText = FAILURE;
        }
    });
}

function addSectionClick(id, e) {
    console.log("");
    // Make the request
    request_post('api/song/registerSection/' + songId, {sectionId: id});
    // Delete element
    const elem = document.getElementById(id);
    elem.parentElement.removeChild(elem);
}

getPageData();
