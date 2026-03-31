@echo off
chcp 65001 >nul
title StarClaw 启动器

echo ========================================
echo   StarClaw 服务启动器
echo ========================================

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo [1/3] 启动 Edge-TTS 服务 (端口 5051)...
netstat -ano | findstr ":5051 " >nul 2>&1
if %errorlevel% == 0 (
    echo       Edge-TTS 已在运行，跳过
) else (
    start /min "Edge-TTS" python edge_tts_server.py
    timeout /t 3 /nobreak >nul
    netstat -ano | findstr ":5051 " >nul 2>&1
    if %errorlevel% == 0 (
        echo       Edge-TTS 启动成功 ✓
    ) else (
        echo       Edge-TTS 启动失败，将使用浏览器TTS降级
    )
)

echo [2/3] 检查 Node.js 依赖...
if not exist node_modules (
    echo       安装依赖中...
    npm install
)

echo [3/3] 启动 StarClaw 主服务 (端口 3003)...
netstat -ano | findstr ":3003 " >nul 2>&1
if %errorlevel% == 0 (
    echo       主服务已在运行
) else (
    start /min "StarClaw" node server-with-openclaw.js
    timeout /t 2 /nobreak >nul
    echo       主服务启动成功 ✓
)

echo.
echo ========================================
echo   访问地址：
echo   对话界面：http://localhost:3003
echo   语音界面：http://localhost:3003/voice.html
echo   管理后台：http://localhost:3003/admin.html
echo ========================================
echo.
start http://localhost:3003/voice.html
