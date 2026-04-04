@echo off
chcp 65001 >nul
title StarClaw - 快速启动飞书版

echo.
echo ══════════════════════════════════════════════════════════
echo   StarClaw 快速启动 - 飞书版
echo   自动启动 ngrok 隧道
echo ══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

:: 检查 ngrok
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] ngrok 未安装
    echo.
    echo 请先安装 ngrok:
    echo   1. 访问 https://ngrok.com 注册
    echo   2. 下载 Windows 版本
    echo   3. 配置: ngrok config add-authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

:: 启动 ngrok
echo [1/3] 启动 ngrok 隧道...
start "Ngrok Tunnel" /min cmd /c "ngrok http 8080 --log=stdout > ngrok-log.txt"

:: 等待 ngrok 启动
timeout /t 5 /nobreak >nul

:: 获取 ngrok URL
echo [2/3] 获取公网地址...
if exist "get-ngrok-url.js" (
    node get-ngrok-url.js > ngrok-url.txt 2>&1
    for /f "tokens=2 delims==" %%a in ('type ngrok-url.txt ^| findstr "public_url"') do (
        set NGROK_URL=%%a
        set NGROK_URL=!NGROK_URL:"=!
        set NGROK_URL=!NGROK_URL:,=!
        set NGROK_URL=!NGROK_URL: =!
    )
)

:: 启动主服务
echo [3/3] 启动 StarClaw 服务...
start "StarClaw Server" cmd /k "node server-with-openclaw.js"

:: 等待服务启动
timeout /t 3 /nobreak >nul

echo.
echo ══════════════════════════════════════════════════════════
echo   StarClaw 飞书版已启动！
echo ══════════════════════════════════════════════════════════
echo.
echo   本地访问: http://localhost:8080/voice-integrated.html
echo.

:: 显示 ngrok URL
if exist "ngrok-url.txt" (
    echo   公网地址（复制到飞书配置）:
    type ngrok-url.txt
    echo.
    echo   飞书 Webhook 配置:
    for /f "tokens=2 delims==" %%a in ('type ngrok-url.txt ^| findstr "https"') do (
        set URL=%%a
        set URL=!URL:"=!
        set URL=!URL:,=!
        set URL=!URL: =!
        echo     !URL!/api/feishu/webhook
    )
)

echo.
echo ══════════════════════════════════════════════════════════
echo   飞书配置步骤:
echo   1. 访问 https://open.feishu.cn/app
echo   2. 选择应用 -^> 事件订阅
echo   3. 配置请求网址（上面的 Webhook 地址）
echo   4. 保存并验证
echo ══════════════════════════════════════════════════════════
echo.
echo   按任意键停止所有服务...
echo.

pause >nul

:: 关闭所有服务
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1
echo [完成] 所有服务已关闭
