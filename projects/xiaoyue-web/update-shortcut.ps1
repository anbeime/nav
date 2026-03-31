$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\StarClaw.lnk')
$s.TargetPath = 'c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web\launch.bat'
$s.WorkingDirectory = 'c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web'
$s.Description = 'Start StarClaw'
$s.Save()
Write-Host "Shortcut updated!"
