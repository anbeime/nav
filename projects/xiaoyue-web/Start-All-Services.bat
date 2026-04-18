@echo off
chcp 65001 >nul
title XiaoYi + OpenClaw + Lossless-Claw

echo.
echo ========================================================
echo   XiaoYi Voice Assistant - Full Memory Stack
echo ========================================================
echo.
echo  Memory Stack:
echo    - Lossless-Claw: DAG-based context (unlimited memory)
echo    - OpenClaw Gateway: AI with tools
echo    - XiaoYi: Voice + Chat interface
echo.
echo ========================================================
echo.

:: Set environment
set PYTHONIOENCODING=utf-8
set NODE_ENV=production

:: Step 1: Start OpenClaw Gateway
echo [1/3] Starting OpenClaw Gateway...
where openclaw >nul 2>&1
if errorlevel 1 (
    echo       [Skip] OpenClaw not installed
    echo       Install from: https://github.com/openclaw/openclaw
    goto :start_server
)

:: Check if OpenClaw is already running
echo       Checking OpenClaw status...
openclaw gateway health >nul 2>&1
if errorlevel 1 (
    echo       Starting OpenClaw Gateway...
    start "OpenClaw Gateway" /min cmd /c "openclaw gateway run"
    echo       Waiting for OpenClaw (10s)...
    timeout /t 10 /nobreak >nul
) else (
    echo       OpenClaw already running
)

:: Verify
openclaw gateway health >nul 2>&1
if errorlevel 1 (
    echo       [Warning] OpenClaw not available, using local memory
) else (
    echo       OpenClaw Gateway ready on port 18789
)

:start_server
:: Step 2: Start XiaoYi Server
echo [2/3] Starting XiaoYi Server...
cd /d "%~dp0"

if exist "server-with-openclaw.js" (
    echo       Using OpenClaw-enhanced mode
    start "XiaoYi Server" cmd /k "node server-with-openclaw.js"
) else (
    start "XiaoYi Server" cmd /k "node server.js"
)

echo       Waiting for server (5s)...
timeout /t 5 /nobreak >nul

:: Step 3: Open browser
echo [3/3] Opening browser...
start http://localhost:3000/voice.html

echo.
echo ========================================================
echo  All Services Started!
echo ========================================================
echo.
echo  Endpoints:
echo    - Voice Page:     http://localhost:3000/voice.html
echo    - Chat API:       http://localhost:3000/api/chat
echo    - OpenClaw:       http://localhost:18789
echo.
echo  Memory Features:
echo    - Lossless-Claw: DAG summaries, FTS5 search
echo    - Unlimited context via compression
echo.
echo  Press any key to exit (services keep running)
echo ========================================================
pause >nul
