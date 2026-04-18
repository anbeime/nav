@echo off
chcp 65001 >nul
title XiaoYi Services - Debug Mode

echo ========================================================
echo   Starting Services - Debug Mode
echo ========================================================
echo.

:: 检查 openclaw
echo [Check] OpenClaw installation...
where openclaw
if %errorlevel% neq 0 (
    echo [ERROR] OpenClaw not found in PATH
    pause
    exit /b 1
)
echo [OK] OpenClaw found

:: 检查 node
echo [Check] Node.js installation...
where node
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH
    pause
    exit /b 1
)
echo [OK] Node.js found

:: 检查配置文件
echo [Check] OpenClaw config...
if exist "%USERPROFILE%\.openclaw\openclaw.json" (
    echo [OK] Config file exists
) else (
    echo [WARN] Config file not found, will run wizard
)

:: 启动 OpenClaw
echo.
echo [1/2] Starting OpenClaw Gateway...
echo       Port: 18789
echo       This window will stay open.
echo.
start "OpenClaw Gateway" cmd /k "cd /d %USERPROFILE% && openclaw gateway"

:: 等待 OpenClaw 启动
echo       Waiting 15 seconds for OpenClaw to start...
timeout /t 15 /nobreak

:: 检查端口
echo       Checking port 18789...
netstat -ano | findstr ":18789" | findstr "LISTENING"
if %errorlevel% neq 0 (
    echo [WARN] Port 18789 not listening yet, wait more...
    timeout /t 10 /nobreak
)

:: 启动小易
echo.
echo [2/2] Starting XiaoYi Server...
cd /d "%~dp0"

if exist "server-with-openclaw.js" (
    echo       Starting server-with-openclaw.js
    start "XiaoYi Server" cmd /k "node server-with-openclaw.js"
) else (
    echo       Starting server.js
    start "XiaoYi Server" cmd /k "node server.js"
)

timeout /t 5 /nobreak >nul

:: 打开浏览器
echo.
echo [*] Opening browser...
start http://localhost:3000/voice.html

echo.
echo ========================================================
echo   Services Started
echo ========================================================
echo.
echo   Voice Page:  http://localhost:3000/voice.html
echo   OpenClaw:    http://localhost:18789
echo.
echo   Two command windows should be open:
echo   1. OpenClaw Gateway
echo   2. XiaoYi Server
echo.
echo   If windows closed immediately, check the error above.
echo ========================================================
echo.
pause
