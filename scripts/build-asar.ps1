$root = "C:\TipoDS"
$staging = "$root\build-staging"
$destAsar = "$root\dist-electron\win-unpacked\resources\app.asar"

Write-Host "[Сборка] Подготовка файлов приложения..." -ForegroundColor Cyan

if (Test-Path $staging) {
    Remove-Item -Recurse -Force $staging
}

New-Item -ItemType Directory -Force -Path $staging | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\electron" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\server" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\client\dist" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\bin" | Out-Null

# Copy electron, server, client/dist, and root package.json
Copy-Item "$root\electron\*" "$staging\electron\" -Recurse -Force
Copy-Item "$root\server\*" "$staging\server\" -Recurse -Force
Copy-Item "$root\client\dist\*" "$staging\client\dist\" -Recurse -Force
Copy-Item "$root\bin\cloudflared.exe" "$staging\bin\" -Force
Copy-Item "$root\package.json" "$staging\package.json" -Force

# Copy production node_modules
Write-Host "[Сборка] Копирование зависимостей..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$staging\node_modules" | Out-Null

$deps = @('express', 'socket.io', 'cors', 'dotenv')
foreach ($dep in $deps) {
    if (Test-Path "$root\node_modules\$dep") {
        Copy-Item "$root\node_modules\$dep" "$staging\node_modules\" -Recurse -Force
    }
}
# Copy all socket.io dependencies
Get-ChildItem "$root\node_modules" | Where-Object { 
    $_.Name -match '^(engine\.io|socket\.io|ws|accepts|cookie|cors|express|mime|ms|debug|negotiator|range-parser|send|serve-static|statuses|vary|body-parser|content-disposition|content-type|depd|destroy|encodeurl|escape-html|etag|finalhandler|fresh|http-errors|on-finished|parseurl|path-to-regexp|proxy-addr|qs|safe-buffer|safer-buffer|toidentifier|type-is|unpipe|utils-merge|base64id)'
} | ForEach-Object {
    Copy-Item $_.FullName "$staging\node_modules\" -Recurse -Force
}

Write-Host "[Сборка] Упаковка в app.asar..." -ForegroundColor Cyan
& npx asar pack $staging $destAsar

# Cleanup staging
Remove-Item -Recurse -Force $staging

Write-Host "[Сборка] app.asar успешно обновлен!" -ForegroundColor Green
