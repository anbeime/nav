@echo off
chcp 65001 >nul
title XiaoYi Services

echo ========================================================
echo   XiaoYi + OpenClaw + Lossless-Claw 启动器
echo ========================================================
echo.

:: Step 1: 检查 OpenClaw 网关是否已在运行
echo [1/3] 检查 OpenClaw 网关...
openclaw gateway health >nul 2>&1
if %errorlevel% equ 0 (
    echo       OpenClaw 网关已运行
) else (
    echo       启动 OpenClaw 网关...
    start "OpenClaw Gateway" cmd /k "openclaw gateway run"
    echo       等待启动 (15秒)...
    timeout /t 15 /nobreak >nul
)

:: Step 2: 检查小易服务是否运行
echo [2/3] 检查小易服务...
curl -s http://localhost:3000/ >nul 2>&1
if %errorlevel% equ 0 (
    echo       小易服务已运行
) else (
    echo       启动小易服务...
    cd /d "%~dp0"
    start "XiaoYi Server" cmd /k "node server-with-openclaw.js"
    echo       等待启动 (5秒)...
    timeout /t 5 /nobreak >nul
)

:: Step 3: 打开浏览器
echo [3/3] 打开浏览器...
start http://localhost:3000/voice.html

echo.
echo ========================================================
echo   所有服务已启动
echo ========================================================
echo.
echo   语音页面: http://localhost:3000/voice.html
echo   OpenClaw: http://localhost:18789
echo.
echo   记忆功能: Lossless-Claw 无损记忆已启用
echo.
pause
