@echo off
chcp 65001 >nul
echo Starting OpenClaw...
set "OPENCLAW_PATH=C:\Users\13632\.stepfun\runtimes\node\install_1769483068832_457v07jhfvf\node-v22.18.0-win-x64\openclaw.ps1"
powershell -ExecutionPolicy Bypass -Command "& ""%OPENCLAW_PATH%"" gateway"
pause
