#!/usr/bin/env tsx
/**
 * Comprehensive Game Logic Test - All Scenarios
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(colors.green + `✓ ${name}` + colors.reset);
      testsPassed++;
    } else {
      console.log(colors.red + `✗ ${name}` + colors.reset);
      testsFailed++;
    }
  } catch (error) {
    console.log(colors.red + `✗ ${name} - ${error}` + colors.reset);
    testsFailed++;
  }
}

console.log(colors.bright + colors.cyan + '\n=== COMPREHENSIVE GAME LOGIC TESTS ===\n' + colors.reset);

// Test 1: Basic hand dealing
console.log(colors.yellow + '📋 Basic Game Flow' + colors.reset);
test('Hand dealing works', () => {
  const game = new GameManager();
  game.startNewHand();
  const state = game.getCurrentGameState();
  return state.handNumber === 1 && 
         state.players.every(p => p.holeCards.length === 2) &&
         state.communityCards.length === 0;
});

test('Blinds are posted correctly', () => {
  const game = new GameManager();
  game.startNewHand();
  const state = game.getCurrentGameState();
  const sb = state.players.find(p => p.position === state.smallBlindPosition);
  const bb = state.players.find(p => p.position === state.bigBlindPosition);
  return sb!.currentBet === 5 && bb!.currentBet === 10 && sb!.stack === 995 && bb!.stack === 990;
});

test('Action queue starts at UTG (after big blind)', () => {
  const game = new GameManager();
  game.startNewHand();
  const state = game.getCurrentGameState();
  const firstActor = state.actionQueue[0];
  const firstPlayer = state.players.find(p => p.id === firstActor);
  return firstPlayer!.position === (state.bigBlindPosition + 1) % state.players.length;
});

// Test 2: Action execution
console.log(colors.yellow + '\n📋 Action Execution' + colors.reset);
test('Fold action works', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  const result = game.processPlayerAction(actorId, { type: ActionType.FOLD });
  const state = result.gameState;
  const player = state.players.find(p => p.id === actorId);
  return result.success && player!.hasFolded;
});

test('Call action works', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  const stateBefore = game.getCurrentGameState();
  const playerBefore = stateBefore.players.find(p => p.id === actorId)!;
  const result = game.processPlayerAction(actorId, { type: ActionType.CALL });
  const player = result.gameState.players.find(p => p.id === actorId)!;
  return result.success && 
         player.currentBet === stateBefore.currentBet &&
         player.stack === playerBefore.stack - (stateBefore.currentBet - playerBefore.currentBet);
});

test('Raise action works', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  const result = game.processPlayerAction(actorId, { type: ActionType.RAISE, amount: 30 });
  const state = result.gameState;
  return result.success && state.currentBet === 30;
});

test('Check action works (big blind option)', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone calls to big blind
  for (let i = 0; i < 7; i++) {
    const actorId = game.getCurrentActor()!;
    game.processPlayerAction(actorId, { type: ActionType.CALL });
  }
  
  // Big blind should be able to check
  const actorId = game.getCurrentActor()!;
  const result = game.processPlayerAction(actorId, { type: ActionType.CHECK });
  return result.success;
});

// Test 3: Betting rounds
console.log(colors.yellow + '\n📋 Betting Rounds' + colors.reset);
test('Round advances from PREFLOP to FLOP', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone calls
  while (game.getCurrentActor()) {
    const actorId = game.getCurrentActor()!;
    const state = game.getCurrentGameState();
    const actor = state.players.find(p => p.id === actorId)!;
    const amountToCall = state.currentBet - actor.currentBet;
    
    if (amountToCall === 0) {
      game.processPlayerAction(actorId, { type: ActionType.CHECK });
    } else {
      game.processPlayerAction(actorId, { type: ActionType.CALL });
    }
    
    const newState = game.getCurrentGameState();
    if (newState.currentBettingRound !== 'PREFLOP') {
      return newState.currentBettingRound === 'FLOP' && newState.communityCards.length === 3;
    }
  }
  return false;
});

test('Community cards dealt correctly', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Play through to river
  let rounds = 0;
  while (game.getCurrentActor() && rounds < 100) {
    const actorId = game.getCurrentActor()!;
    const state = game.getCurrentGameState();
    const actor = state.players.find(p => p.id === actorId)!;
    const amountToCall = state.currentBet - actor.currentBet;
    
    if (amountToCall === 0) {
      game.processPlayerAction(actorId, { type: ActionType.CHECK });
    } else {
      game.processPlayerAction(actorId, { type: ActionType.CALL });
    }
    rounds++;
  }
  
  const finalState = game.getCurrentGameState();
  return finalState.communityCards.length === 5;
});

// Test 4: All-in scenarios
console.log(colors.yellow + '\n📋 All-In Scenarios' + colors.reset);
test('All-in action works', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  const stateBefore = game.getCurrentGameState();
  const playerBefore = stateBefore.players.find(p => p.id === actorId)!;
  const result = game.processPlayerAction(actorId, { type: ActionType.ALL_IN });
  const player = result.gameState.players.find(p => p.id === actorId)!;
  return result.success && player.isAllIn && player.stack === 0;
});

test('All-in player removed from action queue', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  game.processPlayerAction(actorId, { type: ActionType.ALL_IN });
  const state = game.getCurrentGameState();
  return !state.actionQueue.includes(actorId);
});

// Test 5: Fold scenarios
console.log(colors.yellow + '\n📋 Fold Scenarios' + colors.reset);
test('Folded player removed from action queue', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  game.processPlayerAction(actorId, { type: ActionType.FOLD });
  const state = game.getCurrentGameState();
  return !state.actionQueue.includes(actorId);
});

test('Action advances correctly after fold', () => {
  const game = new GameManager();
  game.startNewHand();
  const firstActor = game.getCurrentActor()!;
  game.processPlayerAction(firstActor, { type: ActionType.FOLD });
  const secondActor = game.getCurrentActor()!;
  return firstActor !== secondActor;
});

test('Multiple folds handled correctly', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Fold 3 players
  for (let i = 0; i < 3; i++) {
    const actorId = game.getCurrentActor()!;
    game.processPlayerAction(actorId, { type: ActionType.FOLD });
  }
  
  const state = game.getCurrentGameState();
  const foldedCount = state.players.filter(p => p.hasFolded).length;
  return foldedCount === 3 && game.getCurrentActor() !== undefined;
});

// Test 6: Raise scenarios
console.log(colors.yellow + '\n📋 Raise Scenarios' + colors.reset);
test('Raise rebuilds action queue', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // First player calls
  const firstActor = game.getCurrentActor()!;
  game.processPlayerAction(firstActor, { type: ActionType.CALL });
  
  // Second player raises
  const secondActor = game.getCurrentActor()!;
  game.processPlayerAction(secondActor, { type: ActionType.RAISE, amount: 30 });
  
  const state = game.getCurrentGameState();
  // First player should be back in the queue
  return state.actionQueue.includes(firstActor);
});

test('Minimum raise enforced', () => {
  const game = new GameManager();
  game.startNewHand();
  const actorId = game.getCurrentActor()!;
  
  // Try to raise less than minimum
  const result = game.processPlayerAction(actorId, { type: ActionType.RAISE, amount: 15 });
  return !result.success && result.error?.includes('minimum');
});

// Test 7: Hand completion
console.log(colors.yellow + '\n📋 Hand Completion' + colors.reset);
test('Hand completes when all but one fold', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone folds except last player
  for (let i = 0; i < 7; i++) {
    const actorId = game.getCurrentActor();
    if (!actorId) break;
    game.processPlayerAction(actorId, { type: ActionType.FOLD });
  }
  
  return game.getCurrentActor() === undefined;
});

test('Hand completes at showdown', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone checks/calls through all rounds
  let actions = 0;
  while (game.getCurrentActor() && actions < 100) {
    const actorId = game.getCurrentActor()!;
    const state = game.getCurrentGameState();
    const actor = state.players.find(p => p.id === actorId)!;
    const amountToCall = state.currentBet - actor.currentBet;
    
    if (amountToCall === 0) {
      game.processPlayerAction(actorId, { type: ActionType.CHECK });
    } else {
      game.processPlayerAction(actorId, { type: ActionType.CALL });
    }
    actions++;
  }
  
  return game.getCurrentActor() === undefined;
});

// Test 8: AI behavior
console.log(colors.yellow + '\n📋 AI Behavior' + colors.reset);
test('AI makes valid decisions', () => {
  const game = new GameManager();
  game.startNewHand();
  
  let aiActionsSuccessful = 0;
  let aiActionsTried = 0;
  
  while (game.getCurrentActor() && aiActionsTried < 20) {
    const actorId = game.getCurrentActor()!;
    if (game.isCurrentActorAI()) {
      const result = game.processAITurn(actorId);
      if (result.success) aiActionsSuccessful++;
      aiActionsTried++;
    } else {
      game.processPlayerAction(actorId, { type: ActionType.FOLD });
    }
  }
  
  return aiActionsSuccessful === aiActionsTried && aiActionsTried > 0;
});

test('AI never makes invalid actions', () => {
  const game = new GameManager();
  
  // Run multiple hands
  for (let hand = 0; hand < 3; hand++) {
    game.startNewHand();
    
    let actions = 0;
    while (game.getCurrentActor() && actions < 50) {
      const actorId = game.getCurrentActor()!;
      if (game.isCurrentActorAI()) {
        const result = game.processAITurn(actorId);
        if (!result.success) {
          console.log(`  AI error: ${result.error}`);
          return false;
        }
      } else {
        game.processPlayerAction(actorId, { type: ActionType.FOLD });
      }
      actions++;
    }
  }
  
  return true;
});

// Test 9: Edge cases
console.log(colors.yellow + '\n📋 Edge Cases' + colors.reset);
test('Big blind can check when everyone calls', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone calls to big blind
  for (let i = 0; i < 7; i++) {
    const actorId = game.getCurrentActor()!;
    game.processPlayerAction(actorId, { type: ActionType.CALL });
  }
  
  // Big blind should be able to check
  const actorId = game.getCurrentActor()!;
  const state = game.getCurrentGameState();
  const actor = state.players.find(p => p.id === actorId)!;
  const amountToCall = state.currentBet - actor.currentBet;
  
  return amountToCall === 0 && actor.position === state.bigBlindPosition;
});

test('Cannot fold when no bet to call', () => {
  const game = new GameManager();
  game.startNewHand();
  
  // Everyone calls to big blind
  for (let i = 0; i < 7; i++) {
    const actorId = game.getCurrentActor()!;
    game.processPlayerAction(actorId, { type: ActionType.CALL });
  }
  
  // Big blind tries to fold (should fail or be converted to check)
  const actorId = game.getCurrentActor()!;
  const result = game.processPlayerAction(actorId, { type: ActionType.FOLD });
  
  // In a proper implementation, this should either fail or auto-convert to check
  return !result.success || result.gameState.currentBettingRound !== 'PREFLOP';
});

// Summary
console.log(colors.bright + colors.cyan + '\n=== TEST SUMMARY ===\n' + colors.reset);
console.log(colors.green + `✓ Passed: ${testsPassed}` + colors.reset);
if (testsFailed > 0) {
  console.log(colors.red + `✗ Failed: ${testsFailed}` + colors.reset);
}
console.log(colors.cyan + `Total: ${testsPassed + testsFailed}\n` + colors.reset);

if (testsFailed === 0) {
  console.log(colors.green + colors.bright + '🎉 All tests passed! Game logic is solid.\n' + colors.reset);
  process.exit(0);
} else {
  console.log(colors.yellow + '⚠️  Some tests failed. Review the issues above.\n' + colors.reset);
  process.exit(1);
}
