@echo off
chcp 65001 >nul
title Круг — Туннель для друзей
echo ========================================================
echo Создание безопасного бесплатного HTTPS туннеля для друзей...
echo Скопируйте полученную ссылку https://... и отправьте друзьям!
echo ========================================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-tunnel.ps1 -Port 7880
pause
