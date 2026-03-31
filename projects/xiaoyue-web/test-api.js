const http = require('http');

const data = JSON.stringify({
    message: '你好',
    sessionId: 'test-session'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response:', body);
    });
});

req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
