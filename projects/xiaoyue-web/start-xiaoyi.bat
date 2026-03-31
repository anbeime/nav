@echo off
chcp 65001 >nul
echo Starting XiaoYi Server...
cd /d "C:\D\???n8n-coze-dify\skill\skill-main\projects\xiaoyue-web"
if not exist node_modules (
    npm install
)
node server-with-openclaw.js
pause
