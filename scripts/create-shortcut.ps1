$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Круг.lnk"
$targetPath = "C:\TipoDS\dist-electron\win-unpacked\Круг.exe"
$iconPath = "C:\TipoDS\public\icon.ico"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = "C:\TipoDS\dist-electron\win-unpacked"
$shortcut.Description = "Круг — голосовой и текстовый мессенджер"
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

Write-Host "Ярлык создан: $shortcutPath"
Write-Host "Проверка: $(Test-Path $shortcutPath)"
