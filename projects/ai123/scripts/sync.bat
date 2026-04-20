@echo off
chcp 65001 >nul
title AI123 书签同步工具

echo ================================================
echo     AI123 书签同步工具
echo ================================================
echo.

cd /d "%~dp0.."

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python
    pause
    exit /b 1
)

REM 运行同步脚本
python scripts\sync_and_push.py

echo.
echo 按任意键退出...
pause >nul
