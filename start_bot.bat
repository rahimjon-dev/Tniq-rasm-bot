@echo off
title Remini AI 4K Telegram Bot
echo ======================================================================
echo    REMINI AI - 4K ULTRA HD MEDIA UPSCALER TELEGRAM BOT
echo ======================================================================
cd /d "%~dp0"
echo Checking dependencies and starting bot...
call npm.cmd run build
if %ERRORLEVEL% EQU 0 (
    echo [OK] Build successful! Launching production server...
    node dist/server.js
) else (
    echo [WARN] TypeScript build warning. Launching directly via ts-node...
    node --loader ts-node/esm src/server.ts
)
pause
