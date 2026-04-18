const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server-with-openclaw.js');
const code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

// 统计每行的反引号数量（奇数=可能未闭合）
let inTemplate = false;
let templateStartLine = 0;
const issues = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let count = 0;
    for (const ch of line) {
        if (ch === '`') count++;
    }
    
    // 简单的奇偶检测
    if (count % 2 !== 0) {
        if (!inTemplate) {
            templateStartLine = i + 1;
            inTemplate = true;
        } else {
            issues.push({ start: templateStartLine, end: i + 1 });
            inTemplate = false;
        }
    }
}

if (inTemplate) {
    issues.push({ start: templateStartLine, end: 'EOF (unclosed!)' });
}

console.log('未闭合的模板字符串:');
issues.forEach(iss => console.log(`  行 ${iss.start} -> ${iss.end}`));

// 也检查普通字符串
let inSingle = false, inDouble = false;
let singleStart = 0, doubleStart = 0;
const strIssues = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        const nextCh = j + 1 < line.length ? line[j + 1] : '';
        
        if (ch === "'" && nextCh !== "'" && !inDouble && !inTemplate) {
            inSingle = !inSingle;
            if (inSingle) singleStart = i + 1;
        } else if (ch === '"' && nextCh !== '"' && !inSingle && !inTemplate) {
            inDouble = !inDouble;
            if (inDouble) doubleStart = i + 1;
        } else if (ch === '`') {
            // already counted above
        }
    }
}

if (inSingle) strIssues.push({ type: '单引号', start: singleStart, end: 'EOF' });
if (inDouble) strIssues.push({ type: '双引号', start: doubleStart, end: 'EOF' });

console.log('\n未闭合的字符串:');
strIssues.forEach(iss => console.log(`  ${iss.type} 从行 ${iss.start} 到 ${iss.end}`));
