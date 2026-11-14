@echo off
setlocal
title Second Brain + Kanban

rem Starts the board and opens it in the browser. Close this window to stop it.
rem   set PORT=3300       use another port (default 3000)
rem   set NO_BROWSER=1    do not open the browser

if "%PORT%"=="" set PORT=3000
cd /d "%~dp0frontend" || goto :failed

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 }"
if errorlevel 1 (
  echo Already running on port %PORT%.
  if not "%NO_BROWSER%"=="1" start "" "http://localhost:%PORT%"
  exit /b 0
)

if not exist node_modules (
  echo Installing dependencies, this happens once...
  call npm install || goto :failed
)

powershell -NoProfile -Command "$b='.next\BUILD_ID'; if (-not (Test-Path $b)) { exit 1 }; $t=(Get-Item $b).LastWriteTime; $new = Get-ChildItem src,public,package.json,next.config.ts,tsconfig.json -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $t } | Select-Object -First 1; if ($new) { exit 1 }"
if errorlevel 1 (
  echo Building the app, this takes a minute...
  call npm run build || goto :failed
)

if not "%NO_BROWSER%"=="1" start "" /b powershell -NoProfile -Command "Start-Sleep 3; Start-Process 'http://localhost:%PORT%'"

echo.
echo Board: http://localhost:%PORT%   Close this window to stop it.
echo.
call npm run start -- -p %PORT%
if errorlevel 1 goto :failed
goto :eof

:failed
echo.
echo Something went wrong. See the messages above.
pause
exit /b 1
