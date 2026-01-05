@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   Ambrosia POS - Resource Preparation
echo ===========================================
echo.

cd /d "%~dp0.."

REM Detect target platform
REM Use TARGET_PLATFORM env var if set, otherwise auto-detect
if defined TARGET_PLATFORM (
    set PLATFORM=%TARGET_PLATFORM%
    echo Using TARGET_PLATFORM: %PLATFORM% ^(cross-platform build^)
) else (
    set PLATFORM=win-x64
    echo Auto-detected platform: %PLATFORM%
)

echo Building for platform: %PLATFORM%
echo.

echo === Step 1: Download Node.js for %PLATFORM% ===
echo.

set NODE_CHECK=resources\node\%PLATFORM%\node.exe

if exist "%NODE_CHECK%" (
    echo [OK] Node.js already downloaded for %PLATFORM%, skipping...
) else (
    echo [WARNING] Downloading Node.js ^(this may take a while^)...
    node scripts\download-node.js
    if errorlevel 1 (
        echo [ERROR] Node.js download failed
        exit /b 1
    )
    echo [OK] Node.js download complete
)

echo.
echo === Step 2: Download JRE 21 for %PLATFORM% ===
echo.

set JRE_CHECK=resources\jre\%PLATFORM%\bin\java.exe

if exist "%JRE_CHECK%" (
    echo [OK] JRE already downloaded for %PLATFORM%, skipping...
) else (
    echo [WARNING] Downloading JRE 21 ^(this may take a while^)...
    node scripts\download-jre.js
    if errorlevel 1 (
        echo [ERROR] JRE download failed
        exit /b 1
    )
    echo [OK] JRE download complete
)

echo.
echo === Step 3: Download Phoenixd for %PLATFORM% ===
echo.

set PHOENIXD_CHECK=resources\phoenixd\%PLATFORM%\bin\phoenixd.bat

if exist "%PHOENIXD_CHECK%" (
    echo [OK] Phoenixd already downloaded for %PLATFORM%, skipping...
) else (
    echo [WARNING] Downloading Phoenixd binaries...
    node scripts\download-phoenixd.js
    if errorlevel 1 (
        echo [ERROR] Phoenixd download failed
        exit /b 1
    )
    echo [OK] Phoenixd download complete
)

echo.
echo === Step 4: Build Backend JAR ===
echo.

node scripts\build-backend.js
if errorlevel 1 (
    echo [ERROR] Backend build failed
    exit /b 1
)
echo [OK] Backend build complete

echo.
echo === Step 5: Build Next.js Client ===
echo.

node scripts\build-client.js
if errorlevel 1 (
    echo [ERROR] Client build failed
    exit /b 1
)
echo [OK] Client build complete

echo.
echo ===========================================
echo   Resource Preparation Summary
echo ===========================================
echo.

REM Calculate sizes using PowerShell
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources\node') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources\node' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set NODE_SIZE=%%i
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources\jre') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources\jre' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set JRE_SIZE=%%i
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources\phoenixd') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources\phoenixd' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set PHOENIXD_SIZE=%%i
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources\backend') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources\backend' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set BACKEND_SIZE=%%i
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources\client') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources\client' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set CLIENT_SIZE=%%i
for /f "delims=" %%i in ('powershell -Command "if (Test-Path 'resources') { '{0:N2} MB' -f ((Get-ChildItem -Path 'resources' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1MB) } else { 'N/A' }"') do set TOTAL_SIZE=%%i

echo Resources prepared for %PLATFORM%:
echo   * Node.js:        %NODE_SIZE%
echo   * JRE:            %JRE_SIZE%
echo   * Phoenixd:       %PHOENIXD_SIZE%
echo   * Backend JAR:    %BACKEND_SIZE%
echo   * Next.js Client: %CLIENT_SIZE%
echo   ----------------------------
echo   * Total:          %TOTAL_SIZE%
echo.

echo Verifying critical files:

set ERRORS=0

REM Check Node.js for current platform
set NODE_BIN=resources\node\%PLATFORM%\node.exe

if exist "%NODE_BIN%" (
    echo [OK] Node.js %PLATFORM%: Found
) else (
    echo [ERROR] Node.js %PLATFORM%: Missing
    set /a ERRORS+=1
)

REM Check JRE for current platform
set JAVA_BIN=resources\jre\%PLATFORM%\bin\java.exe

if exist "%JAVA_BIN%" (
    echo [OK] JRE %PLATFORM%: Found
) else (
    echo [ERROR] JRE %PLATFORM%: Missing
    set /a ERRORS+=1
)

REM Check Phoenixd for current platform
set PHOENIXD_BIN=resources\phoenixd\%PLATFORM%\bin\phoenixd.bat

if exist "%PHOENIXD_BIN%" (
    echo [OK] Phoenixd %PLATFORM%: Found
) else (
    echo [ERROR] Phoenixd %PLATFORM%: Missing
    set /a ERRORS+=1
)

REM Check Backend
if exist "resources\backend\ambrosia.jar" (
    echo [OK] Backend JAR: Found
) else (
    echo [ERROR] Backend JAR: Missing
    set /a ERRORS+=1
)

REM Check Client
if exist "resources\client\server.js" (
    echo [OK] Next.js Client: Found
) else (
    echo [ERROR] Next.js Client: Missing
    set /a ERRORS+=1
)

echo.

if %ERRORS% equ 0 (
    echo ===========================================
    echo   [OK] All resources prepared successfully!
    echo   Ready to build with electron-builder
    echo ===========================================
    echo.
    echo Next steps:
    echo   * npm run build      - Build for current platform
    echo   * npm run dist:win   - Build Windows installer
    echo.
    exit /b 0
) else (
    echo ===========================================
    echo   [ERROR] Resource preparation incomplete
    echo   %ERRORS% error^(s^) found
    echo ===========================================
    echo.
    exit /b 1
)
