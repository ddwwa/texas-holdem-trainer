#!/usr/bin/env tsx
/**
 * Debug AI decision for BB check
 */

import { AIPlayer, AIStrategy } from './src/ai-player/AIPlayer';
import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const game = new GameManager();
game.startNewHand();

// Everyone calls to the big blind
const actions = [
  { player: 'player_3', action: { type: ActionType.CALL } },
  { player: 'player_4', action: { type: ActionType.CALL } },
  { player: 'player_5', action: { type: ActionType.CALL } },
  { player: 'player_6', action: { type: ActionType.CALL } },
  { player: 'player_7', action: { type: ActionType.CALL } },
  { player: 'player_0', action: { type: ActionType.CALL } },
  { player: 'player_1', action: { type: ActionType.CALL } },
];

for (const { player, action } of actions) {
  game.processPlayerAction(player, action);
}

// Now check what AI 2 wants to do
const state = game.getCurrentGameState();
const actor = state.players.find(p => p.id === 'player_2')!;

console.log('\n=== AI 2 (BIG BLIND) STATE ===');
console.log(`Stack: ${actor.stack}`);
console.log(`Current Bet: ${actor.currentBet}`);
console.log(`Game Current Bet: ${state.currentBet}`);
console.log(`Amount to Call: ${state.currentBet - actor.currentBet}`);
console.log(`Pot Size: ${state.pots.reduce((sum, pot) => sum + pot.amount, 0)}`);
console.log(`Minimum Raise: ${state.minimumRaise}`);

// Create AI and get decision
const ai = new AIPlayer(AIStrategy.BALANCED);
const decision = ai.decideAction('player_2', state);

console.log('\n=== AI DECISION ===');
console.log(`Action Type: ${decision.type}`);
console.log(`Action Amount: ${decision.amount || 'N/A'}`);

// Try to execute it
console.log('\n=== EXECUTING ACTION ===');
const result = game.processPlayerAction('player_2', decision);
console.log(`Success: ${result.success}`);
if (result.error) {
  console.log(`Error: ${result.error}`);
}
