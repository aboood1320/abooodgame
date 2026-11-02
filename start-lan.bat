@echo off
chcp 65001 >nul
title Board Games - LAN Server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
echo.
echo  Starting local game server...
echo  Open the address shown below on every device on the same Wi-Fi.
echo.
start "" "http://localhost:8790/board-games/"
node board-games\server.js
pause
