import React from 'react';
import { Player } from '../../types/core';
import Card from './Card';
import { useGame } from '../context/GameContext';
import '../styles/PlayerSeat.css';

interface PlayerSeatProps {
  player: Player;
  position: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentActor: boolean;
  lastAction?: { type: string; amount?: number };
}

function PlayerSeat({ 
  player, 
  position, 
  isDealer, 
  isSmallBlind, 
  isBigBlind,
  isCurrentActor,
  lastAction
}: PlayerSeatProps) {
  const isHuman = position === 0;
  const { lastHandResult } = useGame();
  
  // Show cards face-up during showdown for active players
  const showCards = isHuman || (lastHandResult?.showdown && !player.hasFolded);
  
  // Check if this player is a winner
  const isWinner = lastHandResult?.winners.includes(player.id) || false;
  
  // Calculate chip stack visualization (1-5 chips based on stack size)
  const getChipCount = (stack: number): number => {
    if (stack === 0) return 0;
    if (stack < 200) return 1;
    if (stack < 500) return 2;
    if (stack < 1000) return 3;
    if (stack < 2000) return 4;
    return 5;
  };
  
  const chipCount = getChipCount(player.stack);
  
  // Format action display
  const getActionDisplay = () => {
    if (!lastAction) return null;
    const actionText = lastAction.amount 
      ? `${lastAction.type} $${lastAction.amount}`
      : lastAction.type;
    return actionText;
  };
  
  return (
    <div 
      className={`player-seat position-${position} ${isCurrentActor ? 'active' : ''} ${player.hasFolded ? 'folded' : ''} ${isWinner ? 'winner' : ''}`}
    >
      {lastAction && (
        <div className="player-action-notification">
          {getActionDisplay()}
        </div>
      )}
      
      <div className="player-info">
        <div className="player-name">
          {isWinner && <span className="winner-crown">👑</span>}
          {player.name}
          {isDealer && <span className="dealer-button">D</span>}
          {isSmallBlind && <span className="blind-indicator small-blind">SB</span>}
          {isBigBlind && <span className="blind-indicator big-blind">BB</span>}
        </div>
        <div className="player-stack">
          ${player.stack}
          <div className="chip-stack">
            {Array.from({ length: chipCount }).map((_, i) => (
              <div key={i} className="chip" style={{ bottom: `${i * 3}px` }} />
            ))}
          </div>
        </div>
        {player.currentBet > 0 && (
          <div className="player-bet">${player.currentBet}</div>
        )}
      </div>
      
      <div className={`player-cards ${isWinner ? 'winning-cards' : ''}`}>
        {player.holeCards.length > 0 && (
          <>
            <Card card={player.holeCards[0]} faceDown={!showCards} />
            <Card card={player.holeCards[1]} faceDown={!showCards} />
          </>
        )}
      </div>
    </div>
  );
}

export default PlayerSeat;
