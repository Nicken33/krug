@echo off
chcp 65001 >nul
title Круг — Сборка Windows Приложения
echo ========================================================
echo Сборка приложения «Круг» для Windows...
echo ========================================================

cd /d "%~dp0"
echo [1/4] Сборка веб-интерфейса клиента...
cd client
call npm run build
cd ..

echo [2/4] Обновление app.asar в win-unpacked...
node scripts\pack-asar.js

echo [3/4] Сборка установщика Windows (Круг-Setup.exe)...
call npx electron-builder --win --config electron-builder.json

echo [4/4] Упаковка в ZIP-архив для отправки друзьям...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-zip.ps1

echo Обновление ярлыка на Рабочем столе...
node scripts\create-shortcut.cjs

echo.
echo ========================================================
echo СБОРКА УСПЕШНО ЗАВЕРШЕНА!
echo.
echo 1. Установщик Windows (Setup EXE):
echo    dist-electron\Круг-Setup-1.0.0.exe
echo.
echo 2. Портативная версия (ZIP-архив):
echo    dist-electron\Krug-Windows-x64.zip
echo.
echo 3. Распакованная версия:
echo    dist-electron\win-unpacked\Круг.exe
echo.
echo 4. Ярлык на Рабочем столе:
echo    Рабочий стол -> «Круг»
echo ========================================================
pause
