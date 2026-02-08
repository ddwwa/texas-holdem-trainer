# Node.js Virtual Environment Setup Guide

This guide shows how to set up an isolated Node.js environment using `nodeenv` for the Texas Hold'em Trainer project.

## Prerequisites

- Python 3.x installed
- pip installed

## Step 1: Install nodeenv

Open PowerShell and run:

```powershell
pip install nodeenv
```

Verify installation:
```powershell
nodeenv --version
```

## Step 2: Create Node.js Virtual Environment

Navigate to your project directory:

```powershell
cd C:\Users\xiaoj\poker
```

Create a Node.js virtual environment (this will download and install Node.js locally):

```powershell
# Create nodeenv with Node.js LTS version
nodeenv --node=20.11.0 nodeenv

# Or use latest LTS automatically
nodeenv nodeenv
```

This creates a `nodeenv` folder in your project with a local Node.js installation.

## Step 3: Activate the Environment

### On Windows PowerShell:

```powershell
.\nodeenv\Scripts\activate.ps1
```

### On Windows CMD:

```cmd
.\nodeenv\Scripts\activate.bat
```

### On Git Bash (if you use it):

```bash
source nodeenv/Scripts/activate
```

After activation, your prompt should change to show `(nodeenv)` at the beginning.

## Step 4: Verify Node.js and npm

```powershell
node --version
npm --version
```

You should see version numbers (e.g., v20.11.0 and 10.x.x).

## Step 5: Install Project Dependencies

With the environment activated:

```powershell
npm install
```

This installs all dependencies listed in `package.json`:
- TypeScript
- Jest (testing framework)
- fast-check (property-based testing)
- ts-jest
- Type definitions

## Step 6: Run Tests

```powershell
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- Card.test.ts
```

## Step 7: Build the Project

```powershell
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Daily Workflow

### Starting Work

1. Open PowerShell
2. Navigate to project: `cd C:\Users\xiaoj\poker`
3. Activate environment: `.\nodeenv\Scripts\activate.ps1`
4. Start coding!

### Running Tests

```powershell
# With environment activated
npm test
```

### Deactivating Environment

When you're done:

```powershell
deactivate_node
```

## Troubleshooting

### Issue: "cannot be loaded because running scripts is disabled"

Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: nodeenv command not found

Make sure Python's Scripts directory is in your PATH:
- Usually: `C:\Users\<username>\AppData\Local\Programs\Python\Python3x\Scripts\`

Or install nodeenv with:
```powershell
python -m pip install nodeenv
```

### Issue: Slow download during nodeenv creation

The first time you create a nodeenv, it downloads Node.js. This may take a few minutes depending on your internet connection.

### Issue: npm install fails

Make sure you're in the project directory and the environment is activated:
```powershell
cd C:\Users\xiaoj\poker
.\nodeenv\Scripts\activate.ps1
npm install
```

## Benefits of Using nodeenv

1. **Isolation**: Node.js and packages are isolated from system installation
2. **Version Control**: Lock specific Node.js version for the project
3. **Clean Environment**: Easy to delete and recreate (`rm -r nodeenv`)
4. **No System Pollution**: Doesn't affect global Node.js installation
5. **Team Consistency**: Everyone uses the same Node.js version

## Adding to .gitignore

The `nodeenv/` folder should not be committed to git. It's already in `.gitignore`:

```
nodeenv/
node_modules/
```

## Alternative: Using Specific Node.js Version

If you need a specific Node.js version:

```powershell
# List available versions
nodeenv --list

# Install specific version
nodeenv --node=18.19.0 nodeenv

# Or use latest LTS
nodeenv --node=lts nodeenv
```

## Quick Reference

```powershell
# Create environment
nodeenv nodeenv

# Activate (PowerShell)
.\nodeenv\Scripts\activate.ps1

# Activate (CMD)
.\nodeenv\Scripts\activate.bat

# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build

# Deactivate
deactivate_node
```

## Next Steps

Once your environment is set up and `npm test` runs successfully, you can continue with the remaining implementation tasks for the Texas Hold'em Trainer.

See `tasks.md` for the full task list.
