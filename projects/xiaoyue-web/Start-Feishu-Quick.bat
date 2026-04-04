@echo off
chcp 65001 >nul
title StarClaw - 飞书快速启动

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   StarClaw 飞书快速启动                                 ║
echo ║   一键启动 ngrok + 本地服务                             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 启用延迟变量扩展
setlocal enabledelayedexpansion

:: ==================== 检查环境 ====================

echo [检查] 正在检查环境...

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 ngrok
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ════════════════════════════════════════════════════
    echo   ngrok 未安装！
    echo ════════════════════════════════════════════════════
    echo.
    echo   ngrok 是连接飞书的必需工具
    echo.
    echo   安装步骤:
    echo   1. 访问 https://ngrok.com 注册账号
    echo   2. 下载 Windows 版本（ngrok-v3-stable-windows-amd64.zip）
    echo   3. 解压到 C:\ngrok
    echo   4. 以管理员身份运行命令提示符，执行:
    echo      mklink "C:\Windows\System32\ngrok.exe" "C:\ngrok\ngrok.exe"
    echo   5. 配置 authtoken:
    echo      ngrok config add-authtoken YOUR_TOKEN
    echo.
    echo ════════════════════════════════════════════════════
    echo.
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo [安装] 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

:: ==================== 启动 ngrok ====================

echo.
echo [1/4] 启动 ngrok 隧道服务...
echo       端口: 8080

:: 关闭旧的 ngrok 进程
taskkill /f /im ngrok.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 启动 ngrok（后台运行）
start "Ngrok Tunnel" /min cmd /c "ngrok http 8080 --log=stdout > ngrok-log.txt"

:: 等待 ngrok 启动
echo [等待] ngrok 初始化中...
timeout /t 6 /nobreak >nul

:: ==================== 获取公网地址 ====================

echo [2/4] 获取公网地址...

if exist "get-ngrok-url.js" (
    node get-ngrok-url.js > ngrok-url.txt 2>&1
    
    :: 解析 URL
    for /f "tokens=2 delims==:" %%a in ('type ngrok-url.txt ^| findstr "https"') do (
        set NGROK_URL=%%a
        set NGROK_URL=!NGROK_URL:"=!
        set NGROK_URL=!NGROK_URL:,=!
        set NGROK_URL=!NGROK_URL: =!
    )
    
    if defined NGROK_URL (
        echo [成功] 公网地址: !NGROK_URL!
        set FEISHU_WEBHOOK=!NGROK_URL!/api/feishu/webhook
    ) else (
        echo [警告] 无法自动获取公网地址
        echo        请访问 http://127.0.0.1:4040 查看
    )
) else (
    echo [警告] 未找到 get-ngrok-url.js
    echo        请手动访问 http://127.0.0.1:4040 获取地址
)

:: ==================== 启动主服务 ====================

echo.
echo [3/4] 启动 StarClaw 服务...

:: 关闭旧的 node 进程
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 启动服务
start "StarClaw Server" cmd /k "node server-with-openclaw.js"

:: 等待服务启动
timeout /t 3 /nobreak >nul

:: ==================== 显示配置信息 ====================

echo.
echo [4/4] 打开浏览器...
start http://localhost:8080/voice-integrated.html

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   StarClaw 飞书版启动成功！                             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo ══════════════════════════════════════════════════════════
echo   访问地址
echo ══════════════════════════════════════════════════════════
echo.
echo   本地访问: http://localhost:8080/voice-integrated.html
echo   管理控制台: http://localhost:8080/admin.html
echo   ngrok 面板: http://127.0.0.1:4040
echo.

if defined FEISHU_WEBHOOK (
    echo ══════════════════════════════════════════════════════════
    echo   飞书配置信息
    echo ══════════════════════════════════════════════════════════
    echo.
    echo   Webhook 地址（复制到飞书）:
    echo   !FEISHU_WEBHOOK!
    echo.
    echo ══════════════════════════════════════════════════════════
    echo   飞书配置步骤
    echo ══════════════════════════════════════════════════════════
    echo.
    echo   1. 访问飞书开发者后台:
    echo      https://open.feishu.cn/app
    echo.
    echo   2. 选择你的应用
    echo.
    echo   3. 进入「事件订阅」页面
    echo.
    echo   4. 在「请求网址」中粘贴上面的 Webhook 地址
    echo      !FEISHU_WEBHOOK!
    echo.
    echo   5. 点击保存并验证
    echo.
    echo   6. 确保本项目的 .env 文件已配置:
    echo      FEISHU_APP_ID=cli_xxxxxxxxxxxx
    echo      FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxx
    echo      FEISHU_ENCRYPT_KEY=xxxxxxxx（可选）
    echo      FEISHU_VERIFICATION_TOKEN=xxxxxxxx（可选）
    echo.
)

echo ══════════════════════════════════════════════════════════
echo   测试建议
echo ══════════════════════════════════════════════════════════
echo.
echo   1. 在飞书中向机器人发送消息测试
echo   2. 检查 StarClaw Server 窗口的日志输出
echo   3. 如需查看 ngrok 日志: type ngrok-log.txt
echo.
echo ══════════════════════════════════════════════════════════
echo   按任意键停止所有服务...
echo ══════════════════════════════════════════════════════════
echo.

pause >nul

:: ==================== 清理并退出 ====================

echo.
echo [停止] 正在关闭所有服务...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1
echo [完成] 所有服务已关闭
timeout /t 2 /nobreak >nul

endlocal
