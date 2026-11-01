$src = "c:\TipoDS\dist-electron\win-unpacked"
$dest = "c:\TipoDS\dist-electron\Krug-Windows-x64.zip"

Write-Host "Упаковка $src в $dest..." -ForegroundColor Cyan

if (Test-Path $dest) {
    Remove-Item $dest -Force
}

Compress-Archive -Path "$src\*" -DestinationPath $dest -CompressionLevel Optimal
$item = Get-Item $dest
Write-Host "Архив успешно создан: $($item.FullName) ($([Math]::Round($item.Length / 1MB, 2)) MB)" -ForegroundColor Green
