import React from 'react';
import '../styles/PotDisplay.css';

interface PotDisplayProps {
  totalPot: number;
  currentBet: number;
}

function PotDisplay({ totalPot, currentBet }: PotDisplayProps) {
  return (
    <div className="pot-display">
      <div className="pot-label">Total Pot</div>
      <div className="pot-amount">${totalPot}</div>
      {currentBet > 0 && (
        <div className="side-pots">
          <div className="side-pot">
            <span className="side-pot-label">Current Bet:</span>
            <span className="side-pot-amount">${currentBet}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PotDisplay;
