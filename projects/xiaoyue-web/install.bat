@echo off
chcp 65001 >nul
title StarClaw 安装向导

echo.
echo ========================================
echo   StarClaw 明星战队 - 安装向导
echo ========================================
echo.

cd /d "%~dp0"

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] 建议以管理员身份运行
    echo.
)

:: 检查 Node.js
echo [1/5] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装
    echo [INFO] 请从 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% 已安装

:: 检查 Python
echo.
echo [2/5] 检查 Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Python 未安装，TTS 将使用浏览器语音
    echo [INFO] 推荐从 https://www.python.org/ 下载安装
    set PYTHON_OK=0
) else (
    for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
    echo [OK] %PY_VER% 已安装
    set PYTHON_OK=1
)

:: 安装 npm 依赖
echo.
echo [3/5] 安装项目依赖...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install 失败
        pause
        exit /b 1
    )
) else (
    echo [OK] 依赖已存在
)

:: 安装 OpenClaw
echo.
echo [4/5] 安装 OpenClaw (电脑操作能力)...
where openclaw >nul 2>&1
if %errorlevel% neq 0 (
    echo [INSTALL] 正在安装 openclaw...
    call npm install -g openclaw
    if %errorlevel% neq 0 (
        echo [WARN] OpenClaw 安装失败，将使用内置执行器
    ) else (
        echo [OK] OpenClaw 安装成功
    )
) else (
    echo [OK] OpenClaw 已安装
)

:: 安装 Edge-TTS
echo.
echo [5/5] 安装 Edge-TTS (语音合成)...
if %PYTHON_OK%==1 (
    python -c "import edge_tts" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INSTALL] 正在安装 edge-tts...
        pip install edge-tts
        if %errorlevel% neq 0 (
            echo [WARN] edge-tts 安装失败，将使用浏览器语音
        ) else (
            echo [OK] edge-tts 安装成功
        )
    ) else (
        echo [OK] edge-tts 已安装
    )
) else (
    echo [SKIP] Python 未安装，跳过
)

:: 创建必要目录
echo.
echo [SETUP] 创建目录结构...
if not exist "starclaw\temp" mkdir "starclaw\temp"
if not exist "starclaw\output" mkdir "starclaw\output"
if not exist "starclaw\sessions" mkdir "starclaw\sessions"
if not exist "voices" mkdir "voices"
echo [OK] 目录创建完成

:: 检查配置文件
echo.
echo [CONFIG] 检查配置文件...
if not exist ".env" (
    echo [WARN] .env 文件不存在，创建默认配置...
    (
        echo # StarClaw 配置文件
        echo PORT=8080
        echo.
        echo # 智谱 AI API Key (必填)
        echo ZHIPU_API_KEY=your-api-key-here
        echo.
        echo # OpenClaw 配置
        echo OPENCLAW_ENABLED=true
        echo OPENCLAW_API=http://127.0.0.1:18789
        echo OPENCLAW_TOKEN=your-token-here
        echo.
        echo # 飞书机器人 (可选)
        echo FEISHU_APP_ID=
        echo FEISHU_APP_SECRET=
    ) > .env
    echo [OK] 已创建 .env 模板，请编辑填入你的 API Key
) else (
    echo [OK] .env 已存在
)

:: 完成
echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo   下一步：
echo   1. 编辑 .env 文件，填入你的智谱 API Key
echo   2. 运行 StarClaw-Start-Full.bat 启动服务
echo   3. 访问 http://localhost:8080/voice-integrated.html
echo.
echo   功能说明：
echo   - Edge-TTS: 高质量语音合成
echo   - OpenClaw: 真正操作电脑的能力
echo   - StarClaw: 虚拟明星团队
echo.
echo ========================================
echo.

pause
