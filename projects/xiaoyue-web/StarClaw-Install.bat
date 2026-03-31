@echo off
chcp 65001 >nul
title StarClaw 安装程序

echo.
echo ========================================
echo   StarClaw 明星战队 - 安装程序
echo ========================================
echo.

cd /d "%~dp0"

:: 检查 Node.js
echo [检查] Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js (推荐 LTS 版本):
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js 版本: %NODE_VERSION%

:: 检查 npm
echo [检查] npm 环境...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm 未安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm 版本: %NPM_VERSION%

:: 安装依赖
echo.
echo [安装] 正在安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成

:: 创建必要目录
echo.
echo [配置] 创建必要目录...
if not exist "starclaw\sessions" mkdir "starclaw\sessions"
if not exist "voices" mkdir "voices"
echo [OK] 目录创建完成

:: 检查环境变量
echo.
echo [配置] 检查环境变量...
if not exist ".env" (
    echo [创建] 创建 .env 配置文件...
    (
        echo # StarClaw 配置文件
        echo # 请填入你的智谱 AI API Key
        echo ZHIPU_API_KEY=your_api_key_here
        echo.
        echo # OpenClaw 配置（可选）
        echo OPENCLAW_ENABLED=false
        echo OPENCLAW_API=http://127.0.0.1:18789
        echo OPENCLAW_TOKEN=your_token_here
        echo.
        echo # 端口配置
        echo PORT=3000
    ) > .env
    echo [注意] 请编辑 .env 文件，填入你的 API Key
)

:: 创建桌面快捷方式
echo.
echo [快捷方式] 创建桌面启动器...
set DESKTOP=%USERPROFILE%\Desktop
set "BATPATH=%~dp0StarClaw-Start.bat"
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%DESKTOP%\StarClaw.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%BATPATH%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "StarClaw 明星战队" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs
echo [OK] 桌面快捷方式已创建

:: 完成
echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo   下一步:
echo   1. 编辑 .env 文件，填入你的 API Key
echo   2. 双击桌面 "StarClaw" 图标启动
echo.
echo   或者直接运行: StarClaw-Start.bat
echo.
pause
