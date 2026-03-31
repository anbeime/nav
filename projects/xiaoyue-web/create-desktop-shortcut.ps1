# 创建桌面快捷方式
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "StarClaw.lnk"

$targetPath = "C:\Windows\System32\cmd.exe"
$arguments = '/k "cd /d c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web && node server-with-openclaw.js"'
$workingDir = "c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web"

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $workingDir
$shortcut.Description = "Start StarClaw Service"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
