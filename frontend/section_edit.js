// Error Messages
const FAILURE = "Something went wrong";
const DELETE_CONFIRMATION = "You must type DELETE in the text box";
const NO_TITLE = "You must provide a title";
const NO_USERNAME = "You must provide a username";

// Query Params
const urlParams = new URLSearchParams(window.location.search);
const sectionId = urlParams.get('id');

// Redirect user if id query param is invalid
if (!sectionId) {
    window.location.href = "error_404.html";
}

// Retrieves information for this page
function getPageData() {
    // First, get the sections
    request_get('api/section/get/' + sectionId, (json, res) => {
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

        // If the user is not authorized to edit this page, just redirect them to the section viewer
        if (json["isEditor"] === false) {
            window.location.href = "section.html?id=" + sectionId;
            return;
        }

        // If the user is not the owner, remove owner-only settings
        console.log(json);
        if (json["isOwner"] === false) {
            owner_only = document.getElementById("owner_only");
            owner_only.parentElement.removeChild(owner_only);
        }  
        
        // Edit the HTML data
        var title = json["section"]["title"];
        var description = json["section"]["description"];
        document.getElementById("title").value = title;
        document.getElementById("description").value = description;
    });
}

function backClick(e) {
    window.location.href = "section.html?id=" + sectionId;
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
    request_post('api/section/addEditor/' + sectionId, body, (json, res) => {
        // Make sure the login was successful
        if (res["status"] === 200) {
            // Redirect the user to the login page
            document.getElementById("confirmation_message_editor").innerText = username + " is now an editor";
            document.getElementById("error_message_editor").innerText = "";
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

function submitClick(e) {
    // Retrieve data from the username and password boxes
    var title = document.getElementById("title").value;
    var description = document.getElementById("description").value;

    // Make sure the title is not empty
    if (title.length === 0) {
        document.getElementById("error_message").innerText = NO_TITLE;
        return;
    }

    // Build request body
    var body = {
        title: title,
        description: description,
    };

    // Make the request
    request_post('api/section/edit/' + sectionId, body, (json, res) => {
        // Make sure the request was successful
        if (res["status"] === 200) {
            // Redirect the user back to the section's page
            window.location.href = "section.html?id=" + sectionId;
            return;
        }
        else {
            document.getElementById("error_message").innerText = FAILURE;
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
    request_post('api/section/delete/' + sectionId, {}, (json, res) => {
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

getPageData();
