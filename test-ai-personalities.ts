/**
 * Test script to verify AI personalities are working correctly
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

console.log('=== Testing AI Personalities ===\n');

// Create a game
const manager = new GameManager(5, 10, 8, 1000);

// Start a new hand
manager.startNewHand();

// Get initial game state
let gameState = manager.getCurrentGameState();

console.log('Players and their personalities:');
gameState.players.forEach((player, index) => {
  console.log(`${index + 1}. ${player.name} (${player.isAI ? 'AI' : 'Human'}) - Stack: $${player.stack}`);
});

console.log('\n=== Starting Hand ===');
console.log(`Dealer position: ${gameState.dealerPosition}`);
console.log(`Community cards: ${gameState.communityCards.length === 0 ? 'None yet' : gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);
console.log(`Pot: $${gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
console.log(`Current bet: $${gameState.currentBet}`);

// Play through a few actions to see AI behavior
console.log('\n=== AI Actions ===');
let actionsProcessed = 0;
const maxActions = 10;

while (actionsProcessed < maxActions) {
  const currentActor = manager.getCurrentActor();
  
  if (!currentActor) {
    console.log('No current actor - hand may be over');
    break;
  }
  
  const isAI = manager.isCurrentActorAI();
  
  if (!isAI) {
    // Human player - fold to let AI continue
    console.log(`\n${currentActor} (Human) - Folding to continue test`);
    const result = manager.processPlayerAction(currentActor, { type: ActionType.FOLD });
    if (!result.success) {
      console.log(`Error: ${result.error}`);
      break;
    }
    gameState = result.gameState;
  } else {
    // AI player - let them decide
    const result = manager.processAITurn(currentActor);
    if (!result.success) {
      console.log(`Error: ${result.error}`);
      break;
    }
    
    const player = result.gameState.players.find(p => p.id === currentActor);
    const actionStr = result.action?.type === ActionType.BET || result.action?.type === ActionType.RAISE 
      ? `${result.action.type} $${result.action.amount}`
      : result.action?.type;
    
    console.log(`${player?.name}: ${actionStr}`);
    gameState = result.gameState;
  }
  
  actionsProcessed++;
}

console.log('\n=== Final State ===');
console.log(`Pot: $${gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
console.log(`Current bet: $${gameState.currentBet}`);
console.log(`Betting round: ${gameState.currentBettingRound}`);

console.log('\n✅ AI Personality test complete!');
