@echo off
chcp 65001 >nul
title StarClaw Server

echo.
echo ========================================
echo   StarClaw 明星战队启动器
echo   (OpenClaw + Edge-TTS + Server)
echo ========================================
echo.

cd /d "%~dp0"

:: 停止旧进程
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Python not found, TTS will use browser voice
    set PYTHON_OK=0
) else (
    set PYTHON_OK=1
)

:: 安装依赖
if not exist "node_modules" (
    echo [INSTALL] npm install...
    call npm install
)

:: 创建目录
if not exist "starclaw\temp" mkdir "starclaw\temp"
if not exist "starclaw\output" mkdir "starclaw\output"
if not exist "starclaw\sessions" mkdir "starclaw\sessions"
if not exist "voices" mkdir "voices"

:: ============================================
:: [1/3] 启动 OpenClaw 网关
:: ============================================
echo.
echo [1/3] 启动 OpenClaw 网关...
where openclaw >nul 2>&1
if %errorlevel%==0 (
    :: 先停止旧的网关
    openclaw gateway stop >nul 2>&1
    timeout /t 1 /nobreak >nul
    :: 启动新网关
    start "OpenClaw Gateway" cmd /c "npx openclaw gateway --port 18789"
    timeout /t 5 /nobreak >nul
    echo [OK] OpenClaw 网关运行在端口 18789
) else (
    echo [WARN] OpenClaw 未安装，使用内置执行器
    echo [INFO] 安装: npm install -g openclaw
)

:: ============================================
:: [2/3] 启动 Edge-TTS
:: ============================================
echo.
echo [2/3] 启动 Edge-TTS 服务...
if %PYTHON_OK%==1 (
    python -c "import edge_tts" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INSTALL] 安装 edge-tts...
        pip install edge-tts -q
    )
    start /b python edge_tts_server.py
    timeout /t 2 /nobreak >nul
    echo [OK] Edge-TTS 运行在端口 5051
) else (
    echo [SKIP] Python 不可用
)

:: ============================================
:: [3/3] 启动主服务
:: ============================================
echo.
echo [3/3] 启动 StarClaw 主服务...
echo.
echo ========================================
echo   服务地址: http://localhost:8080
echo   语音页面: http://localhost:8080/voice-integrated.html
echo ========================================
echo.
echo   OpenClaw: http://localhost:18789 (电脑操作)
echo   Edge-TTS: http://localhost:5051 (语音合成)
echo.
echo   音色映射:
echo     马斯克/任嘉伦/周杰伦 - 云希 (年轻男声)
echo     巴菲特/张艺谋       - 晓辰 (成熟男声)
echo     杨幂               - 晓涵 (甜美女声)
echo     泰勒               - 晓伊 (温柔女声)
echo.
echo   按 Ctrl+C 停止所有服务
echo ========================================
echo.

:: 打开浏览器
start http://localhost:8080/voice-integrated.html

:: 运行服务器
node server-with-openclaw.js

:: 清理
echo.
echo [STOP] 服务已停止
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
pause
