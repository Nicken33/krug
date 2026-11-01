$exe = "C:\TipoDS\dist-electron\win-unpacked\Krug.exe"
Write-Host "Launching $exe..."
$p = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 3
Get-Process -Id $p.Id | Select-Object Id, Responding, MainWindowHandle, MainWindowTitle
