# 创建桌面快捷方式 - 使用纯英文路径
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "StarClaw.lnk"

$targetPath = "C:\Windows\System32\cmd.exe"
$arguments = '/k "cd /d C:\StarClaw && echo StarClaw Starting... && echo. && echo Main: http://localhost:3000 && echo Voice: http://localhost:3000/voice-integrated.html && echo Admin: http://localhost:3000/admin.html && echo. && node server-with-openclaw.js"'
$workingDir = "C:\StarClaw"

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $workingDir
$shortcut.Description = "Start StarClaw Service"
$shortcut.Save()

Write-Host "Shortcut created successfully!"
Write-Host "Target: cmd.exe"
Write-Host "Working Dir: C:\StarClaw"
