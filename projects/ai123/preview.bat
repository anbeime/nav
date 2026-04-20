@echo off
echo 启动 AI123 本地预览服务器...
echo.
echo 访问地址: http://localhost:8080
echo 按 Ctrl+C 停止
echo.

cd /d "%~dp0"
python -m http.server 8080 -d public

pause
