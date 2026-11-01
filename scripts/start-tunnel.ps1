param(
    [int]$Port = 7880
)

$cloudflaredPath = "C:\TipoDS\bin\cloudflared.exe"

# 1. Check if backend is alive, if not start it
$isServerRunning = $false
try {
    $res = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.status -eq 'ok') { $isServerRunning = $true }
} catch {}

if (-not $isServerRunning) {
    Write-Host "[Сервер] Локальный сервер не запущен. Запускаем сервер Круг на порту $Port..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "C:\TipoDS\server\server.cjs" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  ЗАПУСК ВСЕМИРНОГО HTTPS ТУННЕЛЯ ДЛЯ ДРУЗЕЙ (CLOUDFLARE)    " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Подключение к глобальной сети Anycast..." -ForegroundColor Gray

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $cloudflaredPath
$processInfo.Arguments = "tunnel --url http://localhost:$Port"
$processInfo.RedirectStandardError = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::Start($processInfo)

$tunnelFound = $false
while (-not $process.HasExited) {
    $line = $process.StandardError.ReadLine()
    if ($line) {
        if ($line -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
            $tunnelUrl = $matches[1]
            $tunnelFound = $true
            
            # Copy to clipboard
            Set-Clipboard -Value "$tunnelUrl/?room=krug-main"
            
            Write-Host ""
            Write-Host ">>> ССЫЛКА ДЛЯ ДРУЗЕЙ ИЗ ЛЮБОЙ СТРАНЫ И КОМПЬЮТЕРА: <<<" -ForegroundColor Green
            Write-Host "    $tunnelUrl/?room=krug-main" -ForegroundColor White -BackgroundColor DarkGreen
            Write-Host ""
            Write-Host "[OK] Ссылка скопирована в буфер обмена (Ctrl + V)!" -ForegroundColor Green
            Write-Host "[OK] Друзья могут просто кликнуть и зайти прямо из браузера или из .exe" -ForegroundColor Green
            Write-Host ""
            Write-Host "Оставьте это окно открытым, пока общаетесь с друзьями!" -ForegroundColor Yellow
            break
        }
    }
}

$process.WaitForExit()
