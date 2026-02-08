@echo off
REM Batch script to set up Node.js virtual environment for Texas Hold'em Trainer
REM Usage: setup-nodeenv.bat

echo === Texas Hold'em Trainer - Node.js Environment Setup ===
echo.

REM Check if Python is installed
echo Checking for Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.x first.
    echo Download from: https://www.python.org/downloads/
    exit /b 1
)
echo [OK] Python found

REM Check if pip is installed
echo Checking for pip...
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pip not found. Please install pip first.
    exit /b 1
)
echo [OK] pip found

REM Install nodeenv if not already installed
echo.
echo Checking for nodeenv...
nodeenv --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing nodeenv...
    pip install nodeenv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install nodeenv
        exit /b 1
    )
    echo [OK] nodeenv installed
) else (
    echo [OK] nodeenv already installed
)

REM Check if nodeenv directory already exists
echo.
if exist nodeenv (
    echo Node.js environment already exists.
    set /p recreate="Do you want to recreate it? (y/N): "
    if /i "%recreate%"=="y" (
        echo Removing existing environment...
        rmdir /s /q nodeenv
    ) else (
        echo Using existing environment.
        echo.
        echo To activate the environment, run:
        echo   .\nodeenv\Scripts\activate.bat
        exit /b 0
    )
)

REM Create Node.js virtual environment
echo Creating Node.js virtual environment...
echo (This may take a few minutes as it downloads Node.js)
nodeenv nodeenv

if %errorlevel% neq 0 (
    echo [ERROR] Failed to create Node.js environment
    exit /b 1
)
echo [OK] Node.js environment created

REM Activate the environment
echo.
echo Activating environment...
call .\nodeenv\Scripts\activate.bat

REM Verify Node.js and npm
echo.
echo Verifying installation...
node --version
npm --version

REM Install project dependencies
echo.
echo Installing project dependencies...
call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [OK] Dependencies installed

REM Run tests to verify everything works
echo.
echo Running tests to verify setup...
call npm test

echo.
echo === Setup Complete! ===
echo.
echo Your Node.js environment is ready to use.
echo.
echo To activate the environment in the future, run:
echo   .\nodeenv\Scripts\activate.bat
echo.
echo To deactivate the environment, run:
echo   deactivate_node
echo.
echo Available commands:
echo   npm test           - Run all tests
echo   npm test:watch     - Run tests in watch mode
echo   npm test:coverage  - Run tests with coverage
echo   npm run build      - Build the project
