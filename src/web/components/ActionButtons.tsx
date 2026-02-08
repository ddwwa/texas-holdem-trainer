import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ActionType } from '../../types/enums';
import '../styles/ActionButtons.css';

function ActionButtons() {
  const { gameState, executePlayerAction } = useGame();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  if (!gameState) return null;

  const player = gameState.players[0]; // Human player
  const amountToCall = gameState.currentBet - player.currentBet;
  
  // Determine available actions based on game state
  const noBetYet = gameState.currentBet === 0; // No one has bet this round
  const canCheck = amountToCall === 0; // You've matched the current bet
  const canCall = amountToCall > 0 && player.stack >= amountToCall;
  const canBet = noBetYet && player.stack > 0; // Can only BET if no one has bet yet
  const canRaise = !noBetYet && player.stack > amountToCall; // Can only RAISE if there's already a bet
  
  const minRaise = gameState.currentBet + gameState.minimumRaise;
  const maxRaise = player.stack + player.currentBet;
  
  // Calculate pot size for pot-sized bets
  const currentPot = gameState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0;
  const halfPot = Math.floor(currentPot / 2);
  const threeQuarterPot = Math.floor((currentPot * 3) / 4);

  const handleFold = () => {
    setErrorMessage('');
    executePlayerAction({ type: ActionType.FOLD });
  };
  
  const handleCheck = () => {
    setErrorMessage('');
    executePlayerAction({ type: ActionType.CHECK });
  };
  
  const handleCall = () => {
    setErrorMessage('');
    executePlayerAction({ type: ActionType.CALL });
  };
  
  const handleBet = () => {
    const amount = raiseAmount || gameState.minimumRaise;
    
    // Validate bet amount
    if (amount < gameState.minimumRaise) {
      setErrorMessage(`Minimum bet is $${gameState.minimumRaise}`);
      return;
    }
    if (amount > player.stack) {
      setErrorMessage(`Maximum bet is $${player.stack}`);
      return;
    }
    
    setErrorMessage('');
    executePlayerAction({ type: ActionType.BET, amount });
  };
  
  const handleRaise = () => {
    const amount = raiseAmount || minRaise;
    
    // Validate raise amount
    if (amount < minRaise) {
      setErrorMessage(`Minimum raise is $${minRaise}`);
      return;
    }
    if (amount > maxRaise) {
      setErrorMessage(`Maximum raise is $${maxRaise}`);
      return;
    }
    
    setErrorMessage('');
    executePlayerAction({ type: ActionType.RAISE, amount });
  };
  
  const handleAllIn = () => {
    setErrorMessage('');
    executePlayerAction({ type: ActionType.ALL_IN });
  };
  
  const handlePotSizedBet = (potFraction: number) => {
    const amount = Math.floor(currentPot * potFraction);
    const clampedAmount = Math.max(
      canBet ? gameState.minimumRaise : minRaise,
      Math.min(amount, player.stack)
    );
    setRaiseAmount(clampedAmount);
    setErrorMessage('');
  };

  return (
    <div className="action-buttons">
      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}
      
      <button onClick={handleFold} className="btn btn-fold">
        Fold
      </button>

      {canCheck && (
        <button onClick={handleCheck} className="btn btn-check">
          Check
        </button>
      )}

      {canCall && (
        <button onClick={handleCall} className="btn btn-call">
          Call ${amountToCall}
        </button>
      )}

      {canBet && (
        <div className="bet-controls">
          <div className="slider-container">
            <input
              type="range"
              min={gameState.minimumRaise}
              max={player.stack}
              value={raiseAmount || gameState.minimumRaise}
              onChange={(e) => {
                setRaiseAmount(Number(e.target.value));
                setErrorMessage('');
              }}
              className="bet-slider"
            />
            <div className="slider-value">${raiseAmount || gameState.minimumRaise}</div>
          </div>
          <div className="pot-buttons">
            <button 
              onClick={() => handlePotSizedBet(0.5)} 
              className="btn-pot-size"
              title="Bet half pot"
            >
              1/2 Pot
            </button>
            <button 
              onClick={() => handlePotSizedBet(0.75)} 
              className="btn-pot-size"
              title="Bet 3/4 pot"
            >
              3/4 Pot
            </button>
          </div>
          <button onClick={handleBet} className="btn btn-bet">
            Bet
          </button>
        </div>
      )}

      {canRaise && (
        <div className="bet-controls">
          <div className="slider-container">
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount || minRaise}
              onChange={(e) => {
                setRaiseAmount(Number(e.target.value));
                setErrorMessage('');
              }}
              className="bet-slider"
            />
            <div className="slider-value">${raiseAmount || minRaise}</div>
          </div>
          <div className="pot-buttons">
            <button 
              onClick={() => handlePotSizedBet(0.5)} 
              className="btn-pot-size"
              title="Raise half pot"
            >
              1/2 Pot
            </button>
            <button 
              onClick={() => handlePotSizedBet(0.75)} 
              className="btn-pot-size"
              title="Raise 3/4 pot"
            >
              3/4 Pot
            </button>
          </div>
          <button onClick={handleRaise} className="btn btn-raise">
            Raise
          </button>
        </div>
      )}

      <button onClick={handleAllIn} className="btn btn-allin">
        All-In ${player.stack}
      </button>
    </div>
  );
}

export default ActionButtons;
