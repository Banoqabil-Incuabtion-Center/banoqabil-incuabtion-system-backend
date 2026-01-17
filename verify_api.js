const http = require('http');

function measureRequest(method, path) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`${method} ${path} -> Status: ${res.statusCode}`);
        res.on('data', (d) => {
            // process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request ${method} ${path}: ${e.message}`);
    });

    req.end();
}

console.log("Testing Backend Routes...");
measureRequest('PUT', '/api/messages/read');
measureRequest('GET', '/api/messages/unread-count');
measureRequest('POST', '/api/user/login'); // Should be 200 or 400/401/etc
