@echo off
rem Shicai app launcher: stop the old app process, then start a fresh one.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
  echo.
  echo [error] App startup failed. Check logs\server.err.log
)
echo.
pause
