const PASSWORDS_DIFFERENT = "Passwords do not match";

function submitClick(e) {
    // Retrieve data from the username and password boxes
    var username = document.getElementById("username").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var password_confirmation = document.getElementById("password_confirmation").value;

    // Confirm passwords match
    if (password === password_confirmation) {
        // Build request body
        var body = {
            username: username,
            password: password,
            email: email,
        };

        // Make the request
        request_post('api/auth/register/', body, json => {
            // Make sure the login was successful
            if (json["success"] === true) {
                // Redirect the user to the login page
                window.location.href = "login.html";
            }
            else {
                var reason = json["error"]["message"];
                document.getElementById("error_message").innerText = reason;
            }
        });
    } else {
        document.getElementById("error_message").innerText = PASSWORDS_DIFFERENT;
    }    

    // Overwrite those variables
    username = "";
    email = "";
    password = "";
    password_confirmation = "";
    body = {};
}