@echo off
chcp 936 >nul
title Ngrok Tunnel

echo.
echo ========================================
echo   Ngrok Tunnel Starter
echo ========================================
echo.

:: Check ngrok
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ngrok not found
    echo.
    echo Please install:
    echo 1. Visit https://ngrok.com and sign up
    echo 2. Download Windows version
    echo 3. Add ngrok.exe to PATH
    echo 4. Run: ngrok config add-authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

echo [START] Opening tunnel to port 8080...
echo.
echo [IMPORTANT] Copy the HTTPS URL to Feishu:
echo   - Feishu Console ^> Event Subscriptions ^> Request URL
echo   - Format: https://xxx.ngrok.io/feishu/webhook
echo.
echo ========================================
echo.

ngrok http 8080
