const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server-with-openclaw.js');
const buf = fs.readFileSync(filePath);
const lines = buf.toString('utf8').split('\n');

// 第1111行 (index 1110)
const line1111 = lines[1110];
console.log('Line 1111 raw bytes:');
const lineBuf = Buffer.from(line1111, 'utf8');
for (let i = 0; i < Math.min(lineBuf.length, 200); i++) {
    const b = lineBuf[i];
    if (b > 127 || b === 0x60 /* ` */ || b === 0x24 /* $ */ || b === 0x27 /* ' */) {
        process.stdout.write(`[${i}]=0x${b.toString(16)}(${String.fromCharCode(b)}) `);
    }
}
console.log('\n');

// 也检查前一行末尾
const line1110 = lines[1109];
console.log(`Line 1110 last 10 chars:`);
for (let i = Math.max(0, line1110.length - 10); i < line1110.length; i++) {
    const b = Buffer.from(line1110[i], 'utf8')[0];
    console.log(`  [${i}]=0x${b.toString(16)}(${line1110[i]})`);
}

// 检查整个文件是否有 BOM 或其他问题
console.log(`\nFirst 3 bytes: 0x${buf[0].toString(16)} 0x${buf[1].toString(16)} 0x${buf[2].toString(16)}`);
console.log(`File encoding: ${buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? 'UTF-8 with BOM' : 'No BOM or other'}`);
