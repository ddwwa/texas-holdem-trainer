@echo off
echo Clearing Vite cache and restarting dev server...
echo.

REM Kill any running node processes
taskkill /F /IM node.exe 2>nul

REM Remove Vite cache
if exist node_modules\.vite (
    echo Removing node_modules\.vite...
    rmdir /s /q node_modules\.vite
)

REM Remove dist folder
if exist dist (
    echo Removing dist...
    rmdir /s /q dist
)

echo.
echo Cache cleared! Now run: npm run dev
echo.
pause
