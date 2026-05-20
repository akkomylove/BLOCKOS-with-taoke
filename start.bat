@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title BlockOS Launcher
echo ==========================================
echo   BlockOS - AI-native Knowledge OS
echo ==========================================
echo.

:: Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell not found
    pause
    exit /b 1
)

:: Run PowerShell script
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"

pause
