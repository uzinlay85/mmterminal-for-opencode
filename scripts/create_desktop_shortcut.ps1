$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Myanmar OpenCode Terminal.lnk"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$TargetFile = Join-Path $ScriptDir "launch.bat"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetFile
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "Myanmar Unicode Friendly Terminal for Windows & OpenCode AI"
$Shortcut.IconLocation = "cmd.exe,0"
$Shortcut.Save()

Write-Host "✅ Desktop Shortcut successfully created at: $ShortcutPath" -ForegroundColor Green
