@echo off
title Myanmar OpenCode Terminal Launcher
cd /d "%~dp0\.."

echo ========================================================
echo  Starting Myanmar OpenCode Terminal...
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

netstat -ano | findstr :3820 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Starting Node.js server...
    start "MyanmarOpenCodeServer" /min node server.js
    timeout /t 2 /nobreak > nul
) else (
    echo [INFO] Server is already running.
)

set EDGE_EXE=
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if defined EDGE_EXE (
    start "" "%EDGE_EXE%" --app=http://localhost:3820 --window-size=1260,840 --app-id="MyanmarOpenCodeTerminal"
) else (
    start http://localhost:3820
)

echo [SUCCESS] Application launched successfully.
