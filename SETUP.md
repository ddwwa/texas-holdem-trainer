# Setup Guide

## Node.js Installation Required

This project requires Node.js to be installed on your system. Node.js was not detected in your current environment.

### Installing Node.js

#### Windows
1. Visit https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the installation wizard
4. Restart your terminal/PowerShell after installation
5. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

#### macOS
Using Homebrew:
```bash
brew install node
```

Or download from https://nodejs.org/

#### Linux
Using apt (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install nodejs npm
```

Using yum (CentOS/RHEL):
```bash
sudo yum install nodejs npm
```

### After Installing Node.js

Once Node.js is installed, run the following commands in the project directory:

```bash
# Install project dependencies
npm install

# Build the TypeScript code
npm run build

# Run tests to verify everything works
npm test
```

## Project Structure Created

The following files and directories have been created:

### Configuration Files
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript compiler configuration
- `jest.config.js` - Jest testing framework configuration
- `.gitignore` - Git ignore patterns

### Source Code
- `src/types/enums.ts` - Core enums (Rank, Suit, ActionType, HandCategory, BettingRound)
- `src/types/core.ts` - Core data type interfaces (Card, Player, GameState, etc.)
- `src/types/index.ts` - Type exports
- `src/types/core.test.ts` - Tests for data models including Property 24

### Documentation
- `README.md` - Project overview and documentation
- `SETUP.md` - This file

## What's Been Completed

✅ **Task 1: Set up project structure and core data models**
- TypeScript project structure created
- Jest testing framework configured
- fast-check property-based testing library added to dependencies
- Core data types defined:
  - `Card` - Playing card with rank and suit
  - `Rank` - Enum for card ranks (2-A)
  - `Suit` - Enum for card suits (hearts, diamonds, clubs, spades)
  - `Player` - Player information including stack, position, cards, etc.
  - `Pot` - Pot information including amount and eligible players
  - `GameState` - Complete game state snapshot
  - `Action` - Player action with type and optional amount
  - `BettingRound` - Enum for betting rounds (preflop, flop, turn, river)
  - `ActionType` - Enum for action types (fold, check, call, bet, raise, all-in)
  - `HandCategory` - Enum for hand rankings
  - And many more supporting types...

✅ **Task 1.1: Write property test for data model completeness**
- Property 24 test implemented
- Validates Requirements 8.1-8.7 and 6.4
- Tests that GameState contains all required fields

## Next Steps

After installing Node.js and running `npm install`, you can proceed with:

1. **Task 2**: Implement card and deck management
2. **Task 3**: Implement hand evaluation and ranking
3. **Task 4**: Implement pot management

Run tests frequently to ensure everything works correctly:
```bash
npm test
```

## Troubleshooting

### "npm: command not found" or similar error
- Node.js is not installed or not in your PATH
- Follow the installation instructions above
- Restart your terminal after installation

### TypeScript compilation errors
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript version is 5.0 or higher: `npx tsc --version`

### Test failures
- Ensure all dependencies are installed
- Try cleaning and rebuilding: `rm -rf node_modules dist && npm install && npm run build`

## Support

If you encounter any issues during setup, please check:
1. Node.js version is 18 or higher
2. All dependencies installed successfully
3. No TypeScript compilation errors
