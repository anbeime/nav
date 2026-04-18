// 用 require 的方式加载来获取精确错误
const fs = require('fs');
const path = require('path');
const Module = require('module');

const filePath = path.join(__dirname, 'server-with-openclaw.js');
const code = fs.readFileSync(filePath, 'utf8');

// 写入临时文件然后用 node --check
const tmpPath = path.join(__dirname, '_tmp_check.js');
fs.writeFileSync(tmpPath, code);

const { execSync } = require('child_process');
try {
    execSync(`node --check "${tmpPath}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('OK');
} catch (e) {
    console.log('ERROR:', e.stderr || e.stdout || e.message);
}

// 清理
try { fs.unlinkSync(tmpPath); } catch(e) {}
