@echo off
chcp 65001
cd /d "%~dp0"
echo ========================================
echo   StarClaw Service Starting...
echo ========================================
echo.
echo Access URLs:
echo   Main: http://localhost:3000
echo   Voice: http://localhost:3000/voice-integrated.html
echo   Admin: http://localhost:3000/admin.html
echo.
node server-with-openclaw.js
pause
