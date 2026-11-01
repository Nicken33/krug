$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "Круг.lnk"

$targetPath = "C:\TipoDS\dist-electron\win-unpacked\Круг.exe"
$iconPath = "C:\TipoDS\icon.ico"
$workingDir = "C:\TipoDS\dist-electron\win-unpacked"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $workingDir
$shortcut.IconLocation = "$iconPath, 0"
$shortcut.Description = "Krug"
$shortcut.Save()

Write-Host "Shortcut created: $shortcutPath"
