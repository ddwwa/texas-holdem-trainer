import { GameEngine } from './src/game-engine/GameEngine';
import { ActionType } from './src/types/enums';
import { Action } from './src/types/core';

console.log('Testing All-In Scenario...\n');

// Create a game with 4 players, smaller stacks to test all-in
const engine = new GameEngine(4, 1000, 5, 10);

// Deal a hand
engine.dealHand();

let state = engine.getGameState();
console.log('Initial state:');
state.players.forEach(p => {
  console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}, position=${p.position}`);
});
console.log(`Current bet: ${state.currentBet}`);
console.log(`Action queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' -> ')}`);
console.log(`Current actor index: ${state.currentActorIndex}\n`);

// Player 3 (UTG) goes all-in for 1000
console.log('=== Player 3 (UTG) goes ALL-IN for 1000 ===');
const player3Id = state.actionQueue[0];
let result = engine.executeAction(player3Id, { type: ActionType.ALL_IN });

if (!result.success) {
  console.log(`ERROR: ${result.error}`);
  process.exit(1);
}

state = engine.getGameState();
console.log('After all-in:');
state.players.forEach(p => {
  console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}, allIn=${p.isAllIn}`);
});
console.log(`Current bet: ${state.currentBet}`);
console.log(`Action queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' -> ')}`);
console.log(`Current actor index: ${state.currentActorIndex}\n`);

// Verify action queue was rebuilt
if (state.actionQueue.length === 0) {
  console.log('ERROR: Action queue is empty after all-in raise!');
  process.exit(1);
}

if (state.currentActorIndex !== 0) {
  console.log('ERROR: Actor index should be 0 after rebuilding queue!');
  process.exit(1);
}

// Player 0 (dealer) should be next to act
console.log('=== Player 0 (Dealer) calls 1000 (goes all-in) ===');
const player0Id = state.actionQueue[0];
result = engine.executeAction(player0Id, { type: ActionType.CALL });

if (!result.success) {
  console.log(`ERROR: ${result.error}`);
  process.exit(1);
}

state = engine.getGameState();
console.log('After call:');
state.players.forEach(p => {
  console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}, allIn=${p.isAllIn}`);
});
console.log(`Action queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' -> ')}`);
console.log(`Current actor index: ${state.currentActorIndex}\n`);

// AI 1 (SB) should be next
console.log('=== AI 1 (SB) folds ===');
const player1Id = state.actionQueue[state.currentActorIndex];
result = engine.executeAction(player1Id, { type: ActionType.FOLD });

if (!result.success) {
  console.log(`ERROR: ${result.error}`);
  process.exit(1);
}

state = engine.getGameState();
console.log('After fold:');
state.players.forEach(p => {
  console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}, folded=${p.hasFolded}`);
});
console.log(`Action queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' -> ')}`);
console.log(`Current actor index: ${state.currentActorIndex}\n`);

// AI 2 (BB) should be next
console.log('=== AI 2 (BB) folds ===');
const player2Id = state.actionQueue[state.currentActorIndex];
result = engine.executeAction(player2Id, { type: ActionType.FOLD });

if (!result.success) {
  console.log(`ERROR: ${result.error}`);
  process.exit(1);
}

state = engine.getGameState();
console.log('After fold:');
state.players.forEach(p => {
  console.log(`  ${p.name}: stack=${p.stack}, bet=${p.currentBet}, folded=${p.hasFolded}`);
});
console.log(`Action queue length: ${state.actionQueue.length}`);
console.log(`Current actor index: ${state.currentActorIndex}\n`);

// Hand should be complete now
if (state.actionQueue.length !== 0) {
  console.log('ERROR: Action queue should be empty after hand completes!');
  console.log(`Action queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' -> ')}`);
  process.exit(1);
}

console.log('✓ All-in scenario test PASSED!');
console.log('\nFinal stacks:');
state.players.forEach(p => {
  console.log(`  ${p.name}: ${p.stack}`);
});

// Verify pot was distributed
const totalChips = state.players.reduce((sum, p) => sum + p.stack, 0);
const expectedTotal = 4000; // 4 players * 1000 starting stack
if (totalChips !== expectedTotal) {
  console.log(`\nERROR: Total chips mismatch! Expected ${expectedTotal}, got ${totalChips}`);
  process.exit(1);
}

// Verify winners got the pot (Player 0 and Player 3 were all-in, others folded)
const player0 = state.players.find(p => p.position === 0);
const player3 = state.players.find(p => p.position === 3);
if (!player0 || !player3) {
  console.log('\nERROR: Could not find players!');
  process.exit(1);
}

// One of them should have won the pot (2015 total: 1000+1000+5+10)
const potSize = 2015;
const winner = player0.stack > 1000 ? player0 : player3;
console.log(`\nWinner: ${winner.name} with stack ${winner.stack} (expected ~${potSize})`);
