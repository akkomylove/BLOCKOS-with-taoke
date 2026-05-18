@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title BlockOS Launcher
echo ==========================================
echo   BlockOS - AI-native Knowledge OS
echo ==========================================
echo.

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found, please install first
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Install failed
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Cleaning Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo [OK] .next cache cleared
)
if exist "dist" (
    rmdir /s /q "dist"
    echo [OK] dist cache cleared
)
echo [OK] Cache cleared

echo.
set "DB_FILE=%~dp0data\blockos.db"
if exist "%DB_FILE%" (
    echo [WARN] Found existing database: %DB_FILE%
    set /p DEL_DB="Delete database to re-seed demo data? (Y/N): "
    if /I "!DEL_DB!"=="Y" (
        del /f /q "%DB_FILE%"
        echo [OK] Database deleted, demo data will be re-seeded
    ) else (
        echo [INFO] Keeping existing database
    )
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    for /f "tokens=2 delims=" %%b in ('tasklist /fi "pid eq %%a" ^| findstr /v "Image Name"') do (
        set "proc=%%b"
        echo [INFO] Port 3000 is in use by %%b (PID %%a)
    )
)

set PORT=3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    set PORT=3001
    goto :check3001
)
:check3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
    set PORT=3002
    goto :check3002
)
:check3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002"') do (
    set PORT=3003
)

echo.
echo [INFO] Starting dev server on port %PORT%...
echo [INFO] Browser will open http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%"
npm run dev -- --port %PORT%

pause
