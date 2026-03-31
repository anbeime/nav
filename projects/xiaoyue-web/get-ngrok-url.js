/**
 * 获取 ngrok 公网地址
 * 用法: node get-ngrok-url.js
 */

const http = require('http');

function getNgrokUrl() {
    const options = {
        hostname: '127.0.0.1',
        port: 4040,
        path: '/api/tunnels',
        method: 'GET',
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.tunnels && json.tunnels.length > 0) {
                    const publicUrl = json.tunnels[0].public_url;
                    console.log('========================================');
                    console.log('  NGROK PUBLIC URL:');
                    console.log('========================================');
                    console.log('  ' + publicUrl);
                    console.log('  Feishu Webhook: ' + publicUrl + '/feishu/webhook');
                    console.log('========================================');
                    
                    // 写入文件供批处理读取
                    const fs = require('fs');
                    fs.writeFileSync('ngrok-url.txt', publicUrl);
                } else {
                    console.log('[ERROR] No active tunnels found');
                }
            } catch (e) {
                console.log('[ERROR] Failed to parse ngrok response:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.log('[ERROR] Cannot connect to ngrok API:', e.message);
        console.log('[TIP] Make sure ngrok is running first');
    });

    req.on('timeout', () => {
        req.destroy();
        console.log('[ERROR] Connection timeout');
    });

    req.end();
}

// 等待 ngrok API 就绪
setTimeout(getNgrokUrl, 2000);
