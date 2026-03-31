$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\StarClaw.lnk')
$shortcut.TargetPath = 'node.exe'
$shortcut.Arguments = 'server-with-openclaw.js'
$shortcut.WorkingDirectory = 'c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web'
$shortcut.Description = 'Start StarClaw Service'
$shortcut.Save()
Write-Host "Shortcut created on Desktop!"
