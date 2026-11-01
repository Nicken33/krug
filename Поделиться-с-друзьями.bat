@echo off
chcp 65001 >nul
title Круг — Поделиться с друзьями
echo ========================================================
echo       «КРУГ» — ГОЛОСОВОЙ И ТЕКСТОВЫЙ МЕССЕНДЖЕР
echo ========================================================
echo.
echo Ваша постоянная облачная ссылка для друзей (24/7 онлайн):
echo.
echo     https://krug-eu.onrender.com/?room=krug-main
echo.
echo Эта ссылка работает из ЛЮБОЙ страны на любом устройстве:
echo  - В браузере (Chrome, Edge, Firefox, Safari, телефон)
echo  - В приложении «Круг.exe»
echo  - Сервер в Европе (Франкфурт) с минимальным пингом!
echo  - Не требует включенного вашего компьютера!
echo.
echo Копирование ссылки в буфер обмена...
powershell -NoProfile -Command "Set-Clipboard -Value 'https://krug-eu.onrender.com/?room=krug-main'"
echo Ссылка скопирована в буфер обмена! Просто нажмите Ctrl+V в чате другу.
echo.
echo ========================================================
echo Нажмите любую клавишу, чтобы открыть ссылку в браузере...
pause >nul
start https://krug-eu.onrender.com/?room=krug-main
