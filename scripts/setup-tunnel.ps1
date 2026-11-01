$binDir = "C:\TipoDS\bin"
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

$target = Join-Path $binDir "cloudflared.exe"
if (-not (Test-Path $target)) {
    Write-Host "Downloading official cloudflared binary..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $target
}

Write-Host "cloudflared status: " (Test-Path $target)
& $target --version
