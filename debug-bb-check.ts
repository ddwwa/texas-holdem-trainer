#!/usr/bin/env tsx
/**
 * Debug BB check scenario
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const game = new GameManager();
game.startNewHand();

console.log('\n=== SIMULATING BB CHECK SCENARIO ===\n');

// Everyone calls to the big blind
const actions = [
  { player: 'player_3', action: { type: ActionType.CALL } }, // AI 3 calls
  { player: 'player_4', action: { type: ActionType.CALL } }, // AI 4 calls
  { player: 'player_5', action: { type: ActionType.CALL } }, // AI 5 calls
  { player: 'player_6', action: { type: ActionType.CALL } }, // AI 6 calls
  { player: 'player_7', action: { type: ActionType.CALL } }, // AI 7 calls
  { player: 'player_0', action: { type: ActionType.CALL } }, // You call
  { player: 'player_1', action: { type: ActionType.CALL } }, // AI 1 (SB) calls
];

for (const { player, action } of actions) {
  const result = game.processPlayerAction(player, action);
  if (!result.success) {
    console.log(`Failed: ${player} - ${result.error}`);
    break;
  }
  console.log(`✓ ${player} ${action.type}`);
}

// Now it's AI 2's turn (big blind)
const state = game.getCurrentGameState();
const currentActor = game.getCurrentActor();
const actor = state.players.find(p => p.id === currentActor);

console.log('\n=== BIG BLIND SITUATION ===');
console.log(`Current Actor: ${actor?.name} (${currentActor})`);
console.log(`Actor Stack: ${actor?.stack}`);
console.log(`Actor Current Bet: ${actor?.currentBet}`);
console.log(`Game Current Bet: ${state.currentBet}`);
console.log(`Amount to Call: ${state.currentBet - (actor?.currentBet || 0)}`);
console.log(`Pot Size: ${state.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);

// Try to get AI decision
console.log('\n=== AI DECISION ===');
const aiResult = game.processAITurn(currentActor!);
console.log(`Success: ${aiResult.success}`);
if (aiResult.action) {
  console.log(`Action: ${aiResult.action.type} ${aiResult.action.amount || ''}`);
}
if (aiResult.error) {
  console.log(`Error: ${aiResult.error}`);
}
