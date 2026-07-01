@echo off
setlocal

title Bot-Pizzaria - ATUALIZANDO
color 0A
echo ==================================================
echo          ATUALIZANDO O BOT Pizzaria
echo ==================================================
echo.

set "PROJETO=%~dp0"
if "%PROJETO:~-1%"=="\" set "PROJETO=%PROJETO:~0,-1%"
cd /d "%PROJETO%"

echo 1. Atualizando codigo...
if exist ".git" (
    git pull origin main
) else (
    echo ⚠️ Pasta Git nao encontrada. Verifique se o projeto esta no repositório correto.
)
echo.

cd /d "%PROJETO%\.sys"

echo 2. Limpando sessoes antigas (whatsapp-web.js e Baileys)...
rmdir /s /q ".wwebjs_auth" ".wwebjs_cache" ".baileys_auth" 2>nul

echo.
echo 3. Atualizando dependências...
echo Aguarde um momento...
npm install --production

echo.
echo ==================================================
echo          ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!
echo ==================================================
echo.
echo O bot está atualizado.
echo.
pause
endlocal