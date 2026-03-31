const http = require('http');

async function test() {
    console.log('等待服务启动...');
    await new Promise(r => setTimeout(r, 2000));
    
    const data = JSON.stringify({
        message: '你好，请用方舟回复我',
        sessionId: 'test-session-ark'
    });

    console.log('发送请求...');
    
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
            console.log('\n=== 响应 ===');
            try {
                const json = JSON.parse(body);
                console.log('成功:', json.success);
                console.log('消息:', json.message);
                console.log('回复:', json.reply);
            } catch (e) {
                console.log('原始响应:', body);
            }
        });
    });

    req.on('error', e => console.error('错误:', e.message));
    req.write(data);
    req.end();
}

test();
