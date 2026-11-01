@echo off
chcp 65001 >nul
title Круг — Запуск
echo ========================================================
echo Запуск приложения «Круг»...
echo ========================================================

cd /d "%~dp0"

if exist "dist-electron\win-unpacked\Krug.exe" (
    start "" "dist-electron\win-unpacked\Krug.exe"
) else if exist "dist-electron\win-unpacked\Круг.exe" (
    start "" "dist-electron\win-unpacked\Круг.exe"
) else (
    npx electron electron/main.cjs
)
