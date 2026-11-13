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
echo  The host page will open and create a room automatically.
echo  Open the LAN address shown below on every other device.
echo.
set "OPEN_LAN_BROWSER=1"
node board-games\server.js
pause
