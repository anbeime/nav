const fs = require('fs');
const path = require('path');
const filePath = 'c:/D/nav-main/bookmarks_2025_6_2.html';

try {
  // 检查文件是否存在
  if (fs.existsSync(filePath)) {
    console.log(`File exists at ${filePath}`);

    // 读取文件内容
    const html = fs.readFileSync(filePath, 'utf8');
    console.log(`File content length: ${html.length} characters`);

    // 将文件内容写入到一个临时文件中，以便在浏览器中使用
    const tempFilePath = path.join(__dirname, 'temp-bookmarks.html');
    fs.writeFileSync(tempFilePath, html);
    console.log(`Temporary file created at ${tempFilePath}`);
    console.log('Now you can import this file through the browser interface.');
  } else {
    console.log(`File does not exist at ${filePath}`);
  }
} catch (err) {
  console.error(`Error processing file: ${err.message}`);
}
