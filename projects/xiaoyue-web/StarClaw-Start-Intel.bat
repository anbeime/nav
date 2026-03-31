@echo off
chcp 65001 >nul
echo ========================================
echo   StarClaw OS - Intel 本地模型版
echo ========================================
echo.

:: 设置 Intel Ollama 路径
set "INTEL_OLLAMA_PATH=C:\D\compet\intel\Intel-AIPC-Agent\ipex-llm-ollama"
set "OLLAMA_NUM_GPU=999"
set "no_proxy=localhost,127.0.0.1"
set "ZES_ENABLE_SYSMAN=1"
set "SYCL_CACHE_PERSISTENT=1"
set "OLLAMA_MAX_LOADED_MODELS=2"
set "OLLAMA_MAX_QUEUE=4096"
set "OLLAMA_KEEP_ALIVE=10m"

:: 检查 Intel Ollama 是否已运行
echo [1/3] 检查 Intel Ollama 服务...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [启动] 正在启动 Intel ipex-llm-ollama...
    start "Intel Ollama" cmd /c "cd /d %INTEL_OLLAMA_PATH% && ollama.exe serve"
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] Intel Ollama 已运行
)

:: 检查 Edge-TTS 服务
echo [2/3] 检查 Edge-TTS 服务...
curl -s http://127.0.0.1:5051/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [启动] 正在启动 Edge-TTS...
    start "Edge-TTS" python "%~dp0edge_tts_server.py"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Edge-TTS 已运行
)

:: 启动 StarClaw 主服务
echo [3/3] 启动 StarClaw OS...
echo.
echo ========================================
echo   访问地址:
echo   - 对话界面: http://localhost:3000
echo   - 管理控制台: http://localhost:3000/admin.html
echo   - 语音版: http://localhost:3000/voice.html
echo ========================================
echo.
echo [提示] 使用本地模型: Intel GPU 加速
echo [提示] 按 Ctrl+C 停止服务
echo.

cd /d "%~dp0"
node server-with-openclaw.js

pause
