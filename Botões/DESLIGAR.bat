@echo off
title DESLIGAR BOTS
echo Encerrando bots Pizza...
echo.

REM Fecha os processos do bot mesmo se o nome da janela foi alterado
powershell -NoProfile -ExecutionPolicy Bypass -Command "^$patterns = @('bot-simple.js','chatbot.js'); ^$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('cmd.exe','node.exe') -and $_.CommandLine }; foreach (^$p in ^$procs) { ^$cmd = ^$p.CommandLine; if ((^$cmd -like '*bot-simple.js*') -or (^$cmd -like '*chatbot.js*')) { Stop-Process -Id ^$p.ProcessId -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

REM Fallback para janelas antigas, novas ou com nomes alterados
for %%T in (
    "Bot Pizza - WhatsApp Web"
    "Bot Pizza - Baileys"
    "BOT 1 - WhatsApp Web"
    "BOT 2 - Baileys"
    "BOT 1"
    "BOT 2"
    "BOT 1 - Bot"
    "BOT 2 - Bot"
) do (
    taskkill /FI "WINDOWTITLE eq %%~T" /F >nul 2>&1
)

echo ✅ Processos do bot encerrados.
echo.
echo Bots Pizza encerrados!
pause