@echo off
title LIMPADOR -    Bot-Academia
color 0E
setlocal enabledelayedexpansion

echo.
echo ==================================================
echo    LIMPADOR DE SESSOES - Bot-Academia
echo ==================================================
echo.
echo Escolha o tipo de limpeza:
echo.
echo 1 - Limpar TUDO (auth + pastas de sessao)
echo 2 - Limpar apenas Bot- 2
echo 3 - Limpar apenas Bot- 1
echo 0 - Sair
echo.
set /p opcao="Digite a opcao desejada (0-3): "

if "%opcao%"=="0" exit /b
if "%opcao%"=="1" goto LIMPAR_TUDO
if "%opcao%"=="2" goto LIMPAR_AUTH
if "%opcao%"=="3" goto LIMPAR_PASTAS
echo Opcao invalida!
pause
exit /b

:LIMPAR_TUDO
echo.
echo ==================================================
echo  LIMPANDO TUDO...
echo ==================================================
echo.
goto LIMPANDO_PASTAS

:LIMPAR_AUTH
echo.
echo ==================================================
echo    REMOVENDO AUTH_INFO
echo ==================================================
echo.
cd /d "%~dp0..\.sys"
if exist "auth_info" (
    rmdir /s /q auth_info
    echo ✅ auth_info deletado com sucesso!
) else (
    echo ⚠️ Pasta auth_info nao encontrada.
)
echo.
echo Proxima vez que iniciar, sera pedido novo QR Code.
echo.
pause
exit /b

:LIMPANDO_PASTAS
cd /d "%~dp0..\.sys"

echo Encerrando processos relacionados...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM chrome.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

if "%opcao%"=="1" (
    echo Removendo pasta auth_info...
    rmdir /s /q "auth_info" 2>nul
)

echo Removendo pasta principal de autenticacao (bot-1)...
rmdir /s /q ".wwebjs_auth" 2>nul

echo Removendo pastas de autenticacao antigas...
for /d %%D in (.wwebjs_auth_*) do (
    echo  Removendo: %%D
    rmdir /s /q "%%D" 2>nul
)

echo.
echo Limpando cache...
rmdir /s /q ".wwebjs_cache" 2>nul
rmdir /s /q ".baileys_auth" 2>nul

echo Removendo arquivos temporarios...
del /f /q "*.log" 2>nul
del /f /q "qrcode.png" 2>nul

echo.
echo ==================================================
echo  LIMPEZA CONCLUIDA!
echo ==================================================
echo.
echo Rode LIGAR-1 ou LIGAR-2 para reconectar.
echo.
pause
