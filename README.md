# Texas Hold'em Trainer

A web-based poker training application that simulates an 8-person Texas Hold'em cash game. Learn optimal poker strategy through interactive gameplay with real-time feedback.

## 🎮 Features

- **Interactive Web Interface** - Beautiful, responsive poker table UI
- **8-Player Cash Game** - Realistic Texas Hold'em simulation
- **AI Opponents** - Computer-controlled players with varied strategies
- **Session Statistics** - Track your performance across hands
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Property-Based Testing** - Comprehensive test coverage with correctness guarantees

## 🚀 Quick Start

### Option 1: Using Node.js Virtual Environment (Recommended)

1. **Setup nodeenv** (if not already done):
   ```bash
   # Windows
   .\setup-nodeenv-fixed.ps1
   
   # Or use the batch file
   .\setup-nodeenv.bat
   ```

2. **Run the development server**:
   ```bash
   # Windows
   .\run-dev.bat
   ```

3. **Open your browser** to http://localhost:3000

### Option 2: Using System Node.js

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to http://localhost:3000

## 📦 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run demo` - Run terminal-based demo of game engine

### Testing
- `npm test` - Run all unit and property-based tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Production
- `npm run build:web` - Build optimized production bundle
- `npm run preview` - Preview production build locally
- `npm run build` - Compile TypeScript (for library use)

## 🏗️ Project Structure

```
texas-holdem-trainer/
├── src/
│   ├── types/              # Core data models and type definitions
│   ├── card/               # Card class and utilities
│   ├── deck/               # Deck management
│   ├── hand-resolver/      # Hand evaluation and ranking
│   ├── pot-manager/        # Pot and side pot management
│   ├── poker-state/        # Game state tracking
│   ├── action-validator/   # Action validation logic
│   ├── game-engine/        # Main game orchestration
│   ├── web/                # React web application
│   │   ├── components/     # React components
│   │   ├── context/        # React context (state management)
│   │   └── styles/         # CSS stylesheets
│   └── demo.ts            # Terminal demo
├── dist/                   # Production build output
├── .kiro/specs/           # Feature specifications
├── DEPLOYMENT.md          # Deployment guide
├── TESTING.md            # Testing guide
└── README.md             # This file
```

## 🎯 Game Features

### Implemented
- ✅ Complete Texas Hold'em game engine
- ✅ 8-player cash game simulation
- ✅ All poker actions (fold, check, call, bet, raise, all-in)
- ✅ Accurate hand evaluation (all hand types)
- ✅ Pot management with side pots
- ✅ Dealer button rotation
- ✅ Blind posting
- ✅ AI opponents
- ✅ Web-based UI with responsive design
- ✅ Session statistics tracking
- ✅ Card animations
- ✅ Player turn indicators

### Coming Soon
- 🔄 GTO (Game Theory Optimal) analysis
- 🔄 Strategic explanations
- 🔄 Action comparison and feedback
- 🔄 Advanced AI strategies

## 🧪 Testing

This project uses a comprehensive testing approach:

- **Unit Tests** - Test specific examples and edge cases
- **Property-Based Tests** - Verify universal properties using fast-check (100+ iterations)
- **Integration Tests** - Test complete game workflows

**Test Coverage**: 318 passing tests across all game components

Run tests:
```bash
npm test
```

## 🌐 Deployment

The application can be deployed to various platforms:

- **Vercel** (Recommended) - `vercel --prod`
- **Netlify** - `netlify deploy --prod`
- **GitHub Pages** - `npm run deploy`
- **Docker** - `docker build -t texas-holdem-trainer .`
- **AWS S3 + CloudFront** - See DEPLOYMENT.md

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📊 Performance

- **Bundle Size**: ~60KB gzipped
- **Load Time**: < 2 seconds on 3G
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices)

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Testing**: Jest, fast-check
- **Styling**: CSS3 with animations
- **State Management**: React Context API

## 📝 Requirements

This project implements comprehensive poker game requirements:

- **Game Simulation** - Complete Texas Hold'em rules
- **Player Actions** - All standard poker actions with validation
- **AI Opponents** - Automated players with decision-making
- **Pot Management** - Accurate pot tracking including side pots
- **Hand Resolution** - Proper winner determination
- **Web Interface** - Responsive, accessible UI
- **Session Tracking** - Statistics and performance metrics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT

## 🎓 Learning Resources

This trainer is designed to help you learn:
- Texas Hold'em rules and gameplay
- Pot odds and equity calculations
- Position-based strategy
- Bankroll management
- GTO (Game Theory Optimal) concepts

## 🐛 Known Issues

- Minor dealer button rotation edge case (non-critical)
- GTO analysis not yet implemented

See [TESTING.md](TESTING.md) for the complete testing checklist.

## 📞 Support

For issues or questions:
1. Check [TESTING.md](TESTING.md) for troubleshooting
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
3. Open an issue on GitHub
