import { GameEngine } from './game-engine/GameEngine.js';
import { ActionType } from './types/enums.js';
import { Action } from './types/core.js';

console.log('=== Texas Hold\'em Trainer - Debug Mode ===\n');

// Create game engine
const engine = new GameEngine(8, 1000, 5, 10);

// Deal initial hand
console.log('Dealing new hand...\n');
engine.dealHand();

let gameState = engine.getGameState();

// Display initial state
console.log('Initial State:');
console.log(`Betting Round: ${gameState.currentBettingRound}`);
console.log(`Current Bet: $${gameState.currentBet}`);
console.log(`Pot: $${gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
console.log(`\nPlayers:`);
gameState.players.forEach((p, i) => {
  console.log(`  ${i}. ${p.name} - Stack: $${p.stack}, Bet: $${p.currentBet}, Cards: ${p.holeCards.map(c => c.toString()).join(', ')}`);
});
console.log(`\nAction Queue: ${gameState.actionQueue.join(', ')}`);
console.log(`Current Actor Index: ${gameState.currentActorIndex}`);
console.log(`Current Actor: ${gameState.actionQueue[gameState.currentActorIndex]}\n`);

// Simulate AI turns until it's player's turn
let iterations = 0;
const maxIterations = 100;

console.log('Processing AI turns...\n');

while (iterations < maxIterations) {
  iterations++;
  
  gameState = engine.getGameState();
  
  if (gameState.actionQueue.length === 0) {
    console.log('Hand complete - no more actions\n');
    break;
  }
  
  const currentActor = gameState.actionQueue[gameState.currentActorIndex];
  const player = gameState.players.find(p => p.id === currentActor);
  
  if (!player) {
    console.log('ERROR: Current actor not found\n');
    break;
  }
  
  if (!player.isAI) {
    console.log(`It's ${player.name}'s turn (human player)\n`);
    break;
  }

  // AI decision logic
  const amountToCall = gameState.currentBet - player.currentBet;
  let action: Action;
  
  console.log(`[AI Turn] ${player.name} (Stack: $${player.stack}, Current Bet: $${player.currentBet})`);
  console.log(`  Amount to call: $${amountToCall}`);
  
  if (amountToCall === 0 || player.currentBet === gameState.currentBet) {
    const rand = Math.random();
    if (rand < 0.7) {
      action = { type: ActionType.CHECK };
      console.log(`  Decision: CHECK`);
    } else {
      const betAmount = Math.floor(gameState.pots[0].amount * (0.5 + Math.random() * 0.5));
      action = { type: ActionType.BET, amount: Math.min(betAmount, player.stack) };
      console.log(`  Decision: BET $${action.amount}`);
    }
  } else if (player.stack >= amountToCall) {
    const rand = Math.random();
    if (rand < 0.3) {
      action = { type: ActionType.FOLD };
      console.log(`  Decision: FOLD`);
    } else if (rand < 0.8) {
      action = { type: ActionType.CALL };
      console.log(`  Decision: CALL $${amountToCall}`);
    } else {
      const raiseAmount = gameState.currentBet + Math.floor(gameState.currentBet * (1 + Math.random()));
      action = { type: ActionType.RAISE, amount: Math.min(raiseAmount, player.stack + player.currentBet) };
      console.log(`  Decision: RAISE to $${action.amount}`);
    }
  } else {
    const rand = Math.random();
    if (rand < 0.7) {
      action = { type: ActionType.FOLD };
      console.log(`  Decision: FOLD (can't afford)`);
    } else {
      action = { type: ActionType.ALL_IN };
      console.log(`  Decision: ALL-IN $${player.stack}`);
    }
  }

  const result = engine.executeAction(currentActor, action);
  if (!result.success) {
    console.log(`  ERROR: ${result.error}\n`);
    break;
  }
  
  gameState = engine.getGameState();
  console.log(`  New state - Pot: $${gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}, Current Bet: $${gameState.currentBet}`);
  console.log(`  Betting Round: ${gameState.currentBettingRound}, Community Cards: ${gameState.communityCards.length}`);
  console.log(`  Action Queue Length: ${gameState.actionQueue.length}\n`);
}

if (iterations >= maxIterations) {
  console.log('ERROR: Exceeded maximum iterations\n');
}

// Final state
gameState = engine.getGameState();
console.log('\n=== Final State ===');
console.log(`Betting Round: ${gameState.currentBettingRound}`);
console.log(`Community Cards: ${gameState.communityCards.map(c => c.toString()).join(', ')}`);
console.log(`Pot: $${gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
console.log(`Action Queue Length: ${gameState.actionQueue.length}`);

if (gameState.actionQueue.length > 0) {
  const currentActor = gameState.actionQueue[gameState.currentActorIndex];
  const player = gameState.players.find(p => p.id === currentActor);
  console.log(`\nCurrent Turn: ${player?.name} (${player?.isAI ? 'AI' : 'Human'})`);
}

console.log(`\nPlayers:`);
gameState.players.forEach((p, i) => {
  const status = p.hasFolded ? 'FOLDED' : p.isAllIn ? 'ALL-IN' : 'ACTIVE';
  console.log(`  ${i}. ${p.name} - Stack: $${p.stack}, Bet: $${p.currentBet}, Status: ${status}`);
});
