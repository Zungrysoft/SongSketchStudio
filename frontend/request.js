const HOST= "http://127.0.0.1/";

async function request_post(url, body, callback) {
    // Optional params
    callback = callback || ((json, res) => {});

    // Build request options
    const options = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Accept, X-Requested-With',
        },
        credentials: 'include',
    }

    // Send data to server
    res = await fetch(HOST+ url, options);
    var json = null;
    if ([200, 400, 403, 404].includes(res["status"])) {
        json = await res.json();
    }
    callback(json, res);
}

async function request_get(url, callback) {
    // Optional params
    callback = callback || (json => {});

    // Build request options
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Accept, X-Requested-With',
        },
        credentials: 'include',
    }

    // Send data to server
    res = await fetch(HOST+ url, options);
    var json = null;
    if (res["status"] === 200) {
        json = await res.json();
    }
    callback(json, res);
}
