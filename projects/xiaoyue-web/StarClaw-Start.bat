@echo off
chcp 65001 >nul
title StarClaw 明星战队 - 能干的AI团队

echo.
echo ========================================
echo   StarClaw 明星战队 - 一键启动
echo   能对话 更能干活！
echo ========================================
echo.

cd /d "%~dp0"

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未安装 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo [安装] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

:: 确保目录存在
if not exist "starclaw\temp" mkdir "starclaw\temp"
if not exist "starclaw\output" mkdir "starclaw\output"
if not exist "starclaw\sessions" mkdir "starclaw\sessions"

:: 启动主服务
echo.
echo [启动] StarClaw 服务...
start "StarClaw Server" cmd /k "node server-with-openclaw.js"

:: 等待服务启动
timeout /t 3 /nobreak >nul

:: 打开浏览器 - 使用正确的集成页面
echo [启动] 打开浏览器...
start http://localhost:8080/voice-integrated.html

echo.
echo ========================================
echo   StarClaw 已启动！
echo ========================================
echo.
echo   访问地址: http://localhost:8080/voice-integrated.html
echo.
echo   明星召唤:
echo     [召唤:马斯克] - 战略决策
echo     [召唤:雷军] - 营销策划
echo     [召唤:周星驰] - 内容创作
echo     [召唤:OpenClaw] - 代码开发
echo.
echo   实战能力:
echo     代码执行 - JavaScript/Python
echo     文件操作 - 读写/创建/删除
echo     命令执行 - Shell命令
echo     HTTP请求 - API调用
echo.
echo   按任意键停止所有服务...
echo ========================================
echo.

pause >nul

:: 关闭所有服务
taskkill /f /im node.exe >nul 2>&1
echo [停止] 所有服务已关闭
