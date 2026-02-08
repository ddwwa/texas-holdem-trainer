import React from 'react';
import PokerTable from './components/PokerTable';
import ErrorBoundary from './components/ErrorBoundary';
import { GameProvider } from './context/GameContext';

function App() {
  console.log('App component rendering...');
  
  try {
    return (
      <ErrorBoundary>
        <div className="app">
          <header className="app-header">
            <h1>Texas Hold'em Trainer</h1>
            <p>Learn optimal poker strategy with GTO analysis</p>
          </header>
          <main className="app-main">
            <GameProvider>
              <PokerTable />
            </GameProvider>
          </main>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>Error loading application</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default App;
