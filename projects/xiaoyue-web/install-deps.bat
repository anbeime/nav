@echo off
chcp 65001 >nul
echo ==========================================
echo  安装小易 Web 依赖
echo ==========================================
echo.

cd /d "C:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web"

echo 正在安装依赖...
npm install

echo.
echo ==========================================
echo  安装完成！
echo ==========================================
echo.
pause
