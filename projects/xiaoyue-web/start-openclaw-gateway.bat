@echo off
chcp 65001 >nul
title OpenClaw Gateway with Lossless-Claw

echo ========================================================
echo   OpenClaw Gateway - Lossless Context Management
echo ========================================================
echo.

:: 检查 OpenClaw 是否已安装
where openclaw >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] OpenClaw not found. Please install OpenClaw first.
    echo         Visit: https://github.com/openclaw/openclaw
    pause
    exit /b 1
)

:: 检查配置文件
if not exist "%USERPROFILE%\.openclaw\openclaw.json" (
    echo [Warning] OpenClaw config not found, running wizard...
    openclaw wizard
)

:: 启动网关
echo [Starting] OpenClaw Gateway on port 18789...
echo.
echo Features enabled:
echo   - Lossless-Claw: DAG-based context management
echo   - CJK-aware token estimation
echo   - FTS5 full-text search
echo   - Summary tools (lcm_grep, lcm_describe, lcm_expand)
echo.
echo Gateway: http://127.0.0.1:18789
echo.

openclaw gateway
