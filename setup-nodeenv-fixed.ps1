# PowerShell script to set up Node.js virtual environment for Texas Hold'em Trainer
# Fixed version that handles nodeenv PATH issues
# Usage: .\setup-nodeenv-fixed.ps1

Write-Host "=== Texas Hold'em Trainer - Node.js Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking for Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.x first." -ForegroundColor Red
    Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check if pip is installed
Write-Host "Checking for pip..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✓ Found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pip not found. Please install pip first." -ForegroundColor Red
    exit 1
}

# Install nodeenv if not already installed
Write-Host ""
Write-Host "Installing/updating nodeenv..." -ForegroundColor Yellow
python -m pip install --user nodeenv
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ nodeenv installed/updated successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install nodeenv" -ForegroundColor Red
    exit 1
}

# Check if nodeenv directory already exists
Write-Host ""
if (Test-Path "nodeenv") {
    Write-Host "Node.js environment already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Removing existing environment..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force nodeenv
    } else {
        Write-Host "Using existing environment." -ForegroundColor Green
        Write-Host ""
        Write-Host "To activate the environment, run:" -ForegroundColor Cyan
        Write-Host "  .\nodeenv\Scripts\activate.ps1" -ForegroundColor White
        exit 0
    }
}

# Create Node.js virtual environment using python -m
Write-Host "Creating Node.js virtual environment..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes as it downloads Node.js)" -ForegroundColor Gray

# Use python -m to run nodeenv (bypasses PATH issues)
python -m nodeenv nodeenv

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js environment created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create Node.js environment" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you have internet connection (nodeenv downloads Node.js)" -ForegroundColor Gray
    Write-Host "2. Try running: python -m pip install --upgrade nodeenv" -ForegroundColor Gray
    Write-Host "3. Check if you have write permissions in this directory" -ForegroundColor Gray
    exit 1
}

# Check if activation script exists
if (-not (Test-Path ".\nodeenv\Scripts\activate.ps1")) {
    Write-Host "✗ Activation script not found. Environment may not have been created correctly." -ForegroundColor Red
    exit 1
}

# Activate the environment
Write-Host ""
Write-Host "Activating environment..." -ForegroundColor Yellow
& ".\nodeenv\Scripts\activate.ps1"

# Verify Node.js and npm
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow

# Use full path to node and npm from nodeenv
$nodePath = ".\nodeenv\Scripts\node.exe"
$npmPath = ".\nodeenv\Scripts\npm.cmd"

if (Test-Path $nodePath) {
    $nodeVersion = & $nodePath --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found in environment" -ForegroundColor Red
    exit 1
}

if (Test-Path $npmPath) {
    $npmVersion = & $npmPath --version
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found in environment" -ForegroundColor Red
    exit 1
}

# Install project dependencies
Write-Host ""
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
& $npmPath install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Run tests to verify everything works
Write-Host ""
Write-Host "Running tests to verify setup..." -ForegroundColor Yellow
& $npmPath test

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Setup Complete! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Node.js environment is ready to use." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To activate the environment in the future, run:" -ForegroundColor Yellow
    Write-Host "  .\nodeenv\Scripts\activate.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "After activation, you can use:" -ForegroundColor Yellow
    Write-Host "  node --version" -ForegroundColor White
    Write-Host "  npm --version" -ForegroundColor White
    Write-Host "  npm test" -ForegroundColor White
    Write-Host ""
    Write-Host "To deactivate the environment, run:" -ForegroundColor Yellow
    Write-Host "  deactivate_node" -ForegroundColor White
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  npm test           - Run all tests" -ForegroundColor White
    Write-Host "  npm test:watch     - Run tests in watch mode" -ForegroundColor White
    Write-Host "  npm test:coverage  - Run tests with coverage" -ForegroundColor White
    Write-Host "  npm run build      - Build the project" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Setup completed but some tests failed." -ForegroundColor Yellow
    Write-Host "This is normal if not all features are implemented yet." -ForegroundColor Gray
    Write-Host "You can still use the environment for development." -ForegroundColor Gray
    Write-Host ""
    Write-Host "To use the environment:" -ForegroundColor Yellow
    Write-Host "  .\nodeenv\Scripts\activate.ps1" -ForegroundColor White
}
