@echo off
chcp 65001 >nul
title StarClaw 明星战队 - 完整启动（含飞书支持）

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   StarClaw 明星战队 - 完整启动                          ║
echo ║   能对话 更能干活！支持飞书通信                         ║
echo ╚══════════════════════════════════════════════════════════╝
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

:: 自动启动 ngrok（飞书支持）
echo [1/3] 检查 ngrok 是否安装...
where ngrok >nul 2>&1
if %errorlevel% equ 0 (
    echo [启动] ngrok 隧道服务（自动启动）...
    start "Ngrok Tunnel" /min cmd /c "ngrok http 8080 --log=stdout > ngrok-log.txt"
    
    :: 等待 ngrok 启动
    timeout /t 6 /nobreak >nul
    
    :: 获取 ngrok URL
    echo [获取] 正在获取公网地址...
    if exist "get-ngrok-url.js" (
        node get-ngrok-url.js > ngrok-url.txt 2>&1
        
        :: 解析并显示 URL
        for /f "tokens=2 delims==:" %%a in ('type ngrok-url.txt ^| findstr "https"') do (
            set NGROK_URL=%%a
            set NGROK_URL=!NGROK_URL:"=!
            set NGROK_URL=!NGROK_URL:,=!
            set NGROK_URL=!NGROK_URL: =!
        )
    )
    
    echo.
    echo ════════════════════════════════════════════════════
    echo   ngrok 已启动！
    echo ════════════════════════════════════════════════════
    echo.
    
    if exist "ngrok-url.txt" (
        echo   公网地址:
        type ngrok-url.txt | findstr "https"
        echo.
        echo   飞书 Webhook 配置地址:
        for /f "tokens=2 delims==:" %%a in ('type ngrok-url.txt ^| findstr "https"') do (
            set URL=%%a
            set URL=!URL:"=!
            set URL=!URL:,=!
            set URL=!URL: =!
            echo     !URL!/api/feishu/webhook
        )
        echo.
    )
) else (
    echo.
    echo ════════════════════════════════════════════════════
    echo   ngrok 未安装，跳过飞书支持
    echo ════════════════════════════════════════════════════
    echo.
    echo   如需飞书支持，请安装 ngrok:
    echo   1. 访问 https://ngrok.com 注册账号
    echo   2. 下载 Windows 版本
    echo   3. 解压并添加到 PATH
    echo   4. 配置: ngrok config add-authtoken YOUR_TOKEN
    echo.
    echo   当前仅启动本地服务...
    echo ════════════════════════════════════════════════════
    echo.
)

:: 启动主服务
echo [2/3] 启动 StarClaw 服务...
start "StarClaw Server" cmd /k "node server-with-openclaw.js"

:: 等待服务启动
timeout /t 3 /nobreak >nul

:: 打开浏览器
echo [3/3] 打开浏览器...
start http://localhost:8080/voice-integrated.html

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   StarClaw 已启动！                                     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   本地访问: http://localhost:8080/voice-integrated.html
echo   管理控制台: http://localhost:8080/admin.html
echo   技能管理: http://localhost:8080/skill-manager.html
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

if exist "ngrok-url.txt" (
    echo ════════════════════════════════════════════════════
    echo   飞书配置步骤:
    echo ════════════════════════════════════════════════════
    echo   1. 访问 https://open.feishu.cn/app
    echo   2. 选择应用 -^> 事件订阅
    echo   3. 配置请求网址（上面的 Webhook 地址）
    echo   4. 在 .env 文件中配置:
    echo      FEISHU_APP_ID=your_app_id
    echo      FEISHU_APP_SECRET=your_app_secret
    echo   5. 保存并验证
    echo ════════════════════════════════════════════════════
    echo.
)

echo ══════════════════════════════════════════════════════════
echo   按任意键停止所有服务...
echo ══════════════════════════════════════════════════════════
echo.

pause >nul

:: 关闭所有服务
echo.
echo [停止] 正在关闭所有服务...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1
echo [完成] 所有服务已关闭
timeout /t 2 /nobreak >nul
