@echo off
title BOT 1 - WhatsApp Web
echo Iniciando BOT 1 - WhatsApp Web...
cd /d "%~dp0..\.sys"
echo.
timeout /t 1 /nobreak >nul
start "Bot Seven7Fit - WhatsApp Web" cmd /k "node bot-simple.js"
exit