@echo off
setlocal
title OPERATORS - Servidor local
pushd "%~dp0"
if errorlevel 1 goto :erro

where node >nul 2>&1
if errorlevel 1 (
    echo Instale o Node.js 24 ou superior antes de iniciar.
    goto :erro
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
    echo Este projeto precisa do Node.js 24 ou superior.
    goto :erro
)
where npm >nul 2>&1
if errorlevel 1 (
    echo npm nao encontrado. Confira a instalacao do Node.js.
    goto :erro
)

if not defined PORT set "PORT=3000"
node -e "const p=process.env.PORT; process.exit(/^\d+$/.test(p) && Number(p)>0 && Number(p)<65536 ? 0 : 1)"
if errorlevel 1 (
    echo A variavel PORT deve conter uma porta entre 1 e 65535.
    goto :erro
)

if not exist "node_modules\nuxt\bin\nuxt.mjs" (
    echo Instalando dependencias...
    call npm ci
    if errorlevel 1 goto :erro
)

echo Preparando a versao com salvamento no navegador...
call npm run build:railway
if errorlevel 1 goto :erro

echo.
echo Abra http://localhost:%PORT% no navegador.
echo Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C.
echo As campanhas ficam salvas neste navegador e endereco.
echo.
node scripts/serve-railway.mjs
if errorlevel 1 goto :erro
popd
exit /b 0

:erro
echo.
echo Nao foi possivel iniciar o servidor. Confira a mensagem acima.
pause
popd
exit /b 1
