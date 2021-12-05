const LOGIN_FAILED = "Incorrect Username or Password";

function submitClick(e) {
    // Retrieve data from the username and password boxes
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    // Build request body
    var body = {
        username: username,
        password: password,
    };

    // Make the request
    request_post('api/auth/login/', body, (json, res) => {
        // Make sure the login was successful
        if (res["status"] === 200) {
            // Redirect the user to the login page
            window.location.href = "home.html";
            return;
        }
        else {
            document.getElementById("error_message").innerText = LOGIN_FAILED;
        }
    });

    // Overwrite those variables
    username = "";
    password = "";
    body = {};
}