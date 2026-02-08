import { GameEngine } from './src/game-engine/GameEngine';
import { ActionType } from './src/types/enums';
import { Action } from './src/types/core';

const engine = new GameEngine(4, 1000, 5, 10);

function cardToString(card: any): string {
  if (!card || !card.rank || !card.suit) return '??';
  return `${card.rank}${card.suit}`;
}

function displayState(label: string) {
  const state = engine.getGameState();
  console.log(`\n=== ${label} ===`);
  console.log(`Round: ${state.currentBettingRound}`);
  console.log(`Pot: ${state.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
  console.log(`Current Bet: ${state.currentBet}`);
  console.log(`Action Queue: ${state.actionQueue.length} players, index: ${state.currentActorIndex}`);
  console.log(`Community Cards: ${state.communityCards.map(cardToString).join(' ') || 'none'}`);
  
  state.players.forEach(p => {
    const isCurrent = state.actionQueue[state.currentActorIndex] === p.id ? ' <--' : '';
    const status = p.hasFolded ? ' [FOLDED]' : p.isAllIn ? ' [ALL-IN]' : '';
    console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}${status}${isCurrent}`);
  });
}

function processAllPlayers() {
  let iterations = 0;
  const maxIterations = 100;
  
  while (iterations < maxIterations) {
    iterations++;
    
    const state = engine.getGameState();
    
    if (state.actionQueue.length === 0) {
      console.log('\n[COMPLETE] Action queue empty - hand complete');
      return true;
    }
    
    if (state.currentActorIndex >= state.actionQueue.length) {
      console.log('\n[ERROR] Current actor index out of bounds!');
      console.log(`  Index: ${state.currentActorIndex}, Queue length: ${state.actionQueue.length}`);
      return false;
    }
    
    const currentActorId = state.actionQueue[state.currentActorIndex];
    const currentActor = state.players.find(p => p.id === currentActorId);
    
    if (!currentActor) {
      console.log('\n[ERROR] Current actor not found!');
      return false;
    }
    
    // Make decision for any player (AI or human)
    const amountToCall = state.currentBet - currentActor.currentBet;
    let action: Action;
    
    if (amountToCall === 0) {
      // Always check when no bet
      action = { type: ActionType.CHECK };
    } else if (currentActor.stack >= amountToCall) {
      // Always call when facing a bet
      action = { type: ActionType.CALL };
    } else {
      // Fold if can't afford
      action = { type: ActionType.FOLD };
    }
    
    console.log(`\n[ACTION] ${currentActor.name} ${action.type}${action.amount ? ` ${action.amount}` : ''}`);
    
    const result = engine.executeAction(currentActorId, action);
    if (!result.success) {
      console.log(`[ERROR] Action failed: ${result.error}`);
      return false;
    }
  }
  
  console.log('\n[ERROR] Max iterations reached!');
  return false;
}

console.log('Testing game logic with automated play...\n');

// Deal hand
console.log('=== DEALING HAND ===');
engine.dealHand();
displayState('After Deal');

// Process preflop
console.log('\n\n=== PREFLOP BETTING ===');
if (!processAllPlayers()) {
  console.log('\nFAILED during preflop');
  process.exit(1);
}

displayState('After Preflop');

// Check if hand is complete
const state = engine.getGameState();
if (state.actionQueue.length === 0) {
  console.log('\n✓ Hand completed successfully!');
  displayState('Final State');
} else {
  console.log('\n✗ Hand did not complete - still have action queue');
  displayState('Stuck State');
}
