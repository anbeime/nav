@echo off
chcp 65001 >nul
title XiaoYi Full Stack - Admin Setup

echo.
echo ========================================================
echo   XiaoYi Voice Assistant - Admin Setup
echo ========================================================
echo.
echo  This script will:
echo    1. Install OpenClaw Gateway as Windows Service
echo    2. Start all services
echo.
echo  Requires: Run as Administrator
echo ========================================================
echo.

:: Check admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Please run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

:: Step 1: Install OpenClaw Gateway Service
echo [1/3] Installing OpenClaw Gateway Service...
where openclaw >nul 2>&1
if %errorlevel% equ 0 (
    openclaw gateway install >nul 2>&1
    if %errorlevel% equ 0 (
        echo       Service installed successfully
    ) else (
        echo       Service already installed or install failed
    )
) else (
    echo       [Skip] OpenClaw not installed
    goto :start_server
)

:: Step 2: Start OpenClaw Service
echo [2/3] Starting OpenClaw Service...
openclaw gateway start >nul 2>&1
timeout /t 5 /nobreak >nul

openclaw gateway health >nul 2>&1
if %errorlevel% equ 0 (
    echo       OpenClaw Gateway running on port 18789
) else (
    echo       [Warning] OpenClaw service start failed
    echo       Trying foreground mode...
    start "OpenClaw Gateway" /min cmd /c "openclaw gateway run"
    timeout /t 10 /nobreak >nul
)

:start_server
:: Step 3: Start XiaoYi Server
echo [3/3] Starting XiaoYi Server...
cd /d "%~dp0"

if exist "server-with-openclaw.js" (
    start "XiaoYi Server" cmd /k "node server-with-openclaw.js"
) else (
    start "XiaoYi Server" cmd /k "node server.js"
)

timeout /t 5 /nobreak >nul

:: Open browser
start http://localhost:3000/voice.html

echo.
echo ========================================================
echo  All Services Started!
echo ========================================================
echo.
echo  Endpoints:
echo    - Voice Page:     http://localhost:3000/voice.html
echo    - OpenClaw:       ws://127.0.0.1:18789
echo.
echo  Memory: Lossless-Claw (DAG summaries, FTS5 search)
echo.
echo ========================================================
pause
