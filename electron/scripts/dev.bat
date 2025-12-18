@echo off
setlocal enabledelayedexpansion

echo Starting Ambrosia POS in development mode...

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

:: Check backend config
set CONF_FILE=%USERPROFILE%\.Ambrosia-POS\ambrosia.conf
if not exist "%CONF_FILE%" (
    echo Error: Backend configuration not found
    echo Please start the Ambrosia backend first
    exit /b 1
)

echo Backend configuration found

:: Install Electron dependencies if needed
if not exist "node_modules" (
    echo Installing Electron dependencies...
    call npm install
)

:: Install client dependencies if needed
if not exist "..\client\node_modules" (
    echo Installing client dependencies...
    cd ..\client
    call npm install
    cd ..\electron
)

:: Start Electron
echo Starting Electron...
set NODE_ENV=development
npm run dev
