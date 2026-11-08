@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Download from https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\ws (
  echo Installing game dependencies...
  call npm install
  if errorlevel 1 (echo npm install failed. & pause & exit /b 1)
)
if not exist public\assets\character.glb (
  echo Attempting to install Meshy 3D assets...
  call npm run fetch:models
)
echo.
echo GAME URL: http://localhost:3000
start "" http://localhost:3000
node server.mjs
pause
