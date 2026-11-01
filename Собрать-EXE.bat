@echo off
chcp 65001 >nul
title Круг — Сборка Windows Приложения
echo ========================================================
echo Сборка приложения «Круг» для Windows...
echo ========================================================

cd /d "%~dp0"
echo [1/3] Сборка интерфейса клиента...
cd client
call npm run build
cd ..

echo [2/3] Обновление app.asar...
node scripts\pack-asar.js

echo [3/3] Упаковка в ZIP-архив для отправки друзьям...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-zip.ps1

echo [4/4] Обновление ярлыка на Рабочем столе...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

echo.
echo ========================================================
echo Готово! Все файлы обновлены.
echo Запуск приложения:  c:\TipoDS\dist-electron\win-unpacked\Круг.exe
echo Архив для друзей:   c:\TipoDS\dist-electron\Krug-Windows-x64.zip
echo Ярлык:              Рабочий стол -> «Круг»
echo ========================================================
pause
