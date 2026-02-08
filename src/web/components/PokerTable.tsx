import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import PlayerSeat from './PlayerSeat';
import CommunityCards from './CommunityCards';
import PotDisplay from './PotDisplay';
import ActionButtons from './ActionButtons';
import GTOPanel from './GTOPanel';
import LoadingSpinner from './LoadingSpinner';
import '../styles/PokerTable.css';

function PokerTable() {
  const { gameState, startNewGame, startNewHand, sessionStats, isPlayerTurn, lastHandResult, actionLog, lastGTOSolution, lastComparison, playerLastActions, countdown } = useGame();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    // Start a new game when component mounts
    if (!gameState) {
      startNewGame();
    }
  }, [gameState, startNewGame]);

  if (!gameState) {
    return <LoadingSpinner />;
  }

  // Get current actor information
  const currentActorId = gameState.actionQueue.length > 0 && gameState.currentActorIndex < gameState.actionQueue.length
    ? gameState.actionQueue[gameState.currentActorIndex]
    : null;
  const currentActor = currentActorId ? gameState.players.find(p => p.id === currentActorId) : null;

  return (
    <div className="poker-table-container">
      {/* Mobile Menu Button */}
      <div className="mobile-menu-container">
        <button 
          className="mobile-menu-button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          ☰
        </button>
        {showMobileMenu && (
          <div className="mobile-menu-dropdown">
            <button onClick={() => { startNewHand(); setShowMobileMenu(false); }} className="menu-item">
              New Hand
            </button>
            <button onClick={() => { startNewGame(); setShowMobileMenu(false); }} className="menu-item">
              New Game
            </button>
          </div>
        )}
      </div>

      {/* Top Right Control Panel */}
      <div className="top-controls desktop-only">
        <button onClick={startNewHand} className="btn-control btn-new-hand-small">
          New Hand
        </button>
        <button onClick={startNewGame} className="btn-control btn-new-game-small">
          New Game
        </button>
        <button 
          onClick={() => {
            console.log('=== FORCE DEBUG ===');
            console.log('Game State:', gameState);
            console.log('Action Queue:', gameState?.actionQueue);
            console.log('Current Actor Index:', gameState?.currentActorIndex);
            const actorId = gameState?.actionQueue[gameState?.currentActorIndex];
            console.log('Current Actor ID:', actorId);
            console.log('Current Actor:', actorId ? gameState?.players.find(p => p.id === actorId) : 'None');
            console.log('Players:', gameState?.players.map(p => ({
              name: p.name,
              folded: p.hasFolded,
              allIn: p.isAllIn,
              bet: p.currentBet,
              stack: p.stack
            })));
          }}
          className="btn-control btn-debug-small"
        >
          Debug
        </button>
      </div>

      {/* Session Stats */}
      <div className="session-stats-top">
        <div className="stat">
          <span className="stat-label">Hands:</span>
          <span className="stat-value">{sessionStats.handsPlayed}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Won:</span>
          <span className="stat-value">{sessionStats.handsWon}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Winnings:</span>
          <span className="stat-value">${sessionStats.totalWinnings}</span>
        </div>
      </div>

      <div className="poker-table">
        {/* Players arranged around the table */}
        <div className="players-container">
          {gameState.players.map((player, index) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={index}
              isDealer={index === gameState.dealerPosition}
              isSmallBlind={index === gameState.smallBlindPosition}
              isBigBlind={index === gameState.bigBlindPosition}
              isCurrentActor={currentActorId === player.id}
              lastAction={playerLastActions.get(player.id)}
            />
          ))}
        </div>

        {/* Center area with community cards and pot */}
        <div className="table-center">
          {/* Removed turn indicator - player highlighting shows whose turn it is */}
          
          {/* Hand Result Display - Inline */}
          {lastHandResult && (
            <div className="hand-result-inline">
              <div className="hand-result-message">{lastHandResult.message}</div>
              <div className="hand-result-pot">Pot: ${lastHandResult.totalPot}</div>
              {lastHandResult.showdown && lastHandResult.players.length > 0 && (
                <div className="winner-hand-display">
                  {lastHandResult.players
                    .filter(p => p.isWinner)
                    .map(winner => (
                      <div key={winner.playerId} className="winner-hand-info">
                        <span className="winner-icon">👑</span>
                        <span className="winner-hand-name">{winner.handName}</span>
                      </div>
                    ))}
                </div>
              )}
              <button 
                className="btn-next-hand" 
                onClick={startNewHand}
              >
                Next Hand {countdown !== null && `(${countdown}s)`}
              </button>
            </div>
          )}
          
          <CommunityCards 
            cards={gameState.communityCards}
            highlightedCards={
              lastHandResult?.showdown && lastHandResult.players.length > 0
                ? lastHandResult.players
                    .filter(p => p.isWinner)
                    .flatMap(winner => 
                      winner.handRank.cardsUsed?.filter(card => 
                        gameState.communityCards.some(cc => cc.rank === card.rank && cc.suit === card.suit)
                      ) || []
                    )
                : []
            }
          />
          <PotDisplay 
            totalPot={gameState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0}
            currentBet={gameState.currentBet}
          />
        </div>
      </div>

      {/* Action buttons for the player */}
      {isPlayerTurn && (
        <ActionButtons />
      )}

      {/* GTO Analysis Panel */}
      <div className="desktop-only">
        <GTOPanel 
          visible={true} 
          gtoSolution={lastGTOSolution} 
          comparison={lastComparison}
        />
      </div>

      {/* Game Status Debug Panel */}
      <div className="game-status-panel">
        <div className="status-header">Game Status</div>
        <div className="status-content">
          <div className="status-row">
            <span className="status-label">Betting Round:</span>
            <span className="status-value">{gameState.currentBettingRound}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Current Bet:</span>
            <span className="status-value">${gameState.currentBet}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Action Queue:</span>
            <span className="status-value">{gameState.actionQueue.length} players</span>
          </div>
          <div className="status-row">
            <span className="status-label">Current Actor Index:</span>
            <span className="status-value">{gameState.currentActorIndex}</span>
          </div>
          {currentActor && (
            <div className="status-row">
              <span className="status-label">Current Actor:</span>
              <span className="status-value">{currentActor.name} ({currentActor.isAI ? 'AI' : 'Human'})</span>
            </div>
          )}
          <div className="status-row">
            <span className="status-label">Community Cards:</span>
            <span className="status-value">{gameState.communityCards.length} cards</span>
          </div>
          <div className="status-row">
            <span className="status-label">Players in Hand:</span>
            <span className="status-value">
              {gameState.players.filter(p => !p.hasFolded).length} / {gameState.players.length}
            </span>
          </div>
        </div>
        
        {/* Action Log */}
        <div className="action-log">
          <div className="action-log-header">Recent Actions</div>
          <div className="action-log-content">
            {actionLog.length === 0 ? (
              <div className="action-log-empty">No actions yet</div>
            ) : (
              actionLog.slice(-5).reverse().map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="action-log-item">
                  <span className="action-player">{log.playerName}:</span>
                  <span className="action-type">{log.action}</span>
                  {log.amount && <span className="action-amount">${log.amount}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokerTable;
