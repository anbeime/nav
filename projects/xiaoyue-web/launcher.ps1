# 小易 + OpenClaw 启动器
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting OpenClaw + XiaoYi Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动 OpenClaw
Write-Host "[1/2] Starting OpenClaw Gateway..." -ForegroundColor Yellow
$openclawPath = "C:\Users\13632\.stepfun\runtimes\node\install_1769483068832_457v07jhfvf\node-v22.18.0-win-x64\openclaw.ps1"
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -Command & '$openclawPath' gateway" -WindowStyle Normal

Write-Host "Waiting for OpenClaw to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 启动小易服务器
Write-Host "[2/2] Starting XiaoYi Server..." -ForegroundColor Yellow
Set-Location "C:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  OpenClaw: http://127.0.0.1:18789" -ForegroundColor White
Write-Host "  XiaoYi:   http://localhost:3000" -ForegroundColor White
Write-Host "  Voice:    http://localhost:3000/voice.html" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

node server-with-openclaw.js
