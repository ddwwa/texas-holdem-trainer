#!/usr/bin/env tsx
/**
 * Simple Automated Demo - Runs a complete hand without pausing
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const game = new GameManager();
game.startNewHand();

console.log('\n=== TEXAS HOLD\'EM TRAINER - QUICK DEMO ===\n');

const state = game.getCurrentGameState();
console.log(`Starting Hand #${state.handNumber}`);
console.log(`Dealer: Position ${state.dealerPosition}`);
console.log(`Small Blind: Position ${state.smallBlindPosition}`);
console.log(`Big Blind: Position ${state.bigBlindPosition}`);
console.log(`\nAction Order: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}\n`);

let actionCount = 0;
const maxActions = 50;

while (game.getCurrentActor() && actionCount < maxActions) {
  const actorId = game.getCurrentActor();
  if (!actorId) break;
  
  const currentState = game.getCurrentGameState();
  const actor = currentState.players.find(p => p.id === actorId);
  if (!actor) break;
  
  console.log(`[${currentState.currentBettingRound}] ${actor.name} to act...`);
  
  if (game.isCurrentActorAI()) {
    const aiResult = game.processAITurn(actorId);
    if (!aiResult.success) {
      console.log(`  ❌ AI turn failed: ${aiResult.error}`);
      break;
    }
    if (aiResult.action) {
      console.log(`  → ${aiResult.action.type} ${aiResult.action.amount || ''}`);
    }
  } else {
    // Human player - make a simple decision
    const amountToCall = currentState.currentBet - actor.currentBet;
    
    let action;
    if (amountToCall === 0) {
      action = { type: ActionType.CHECK };
      console.log(`  → CHECK`);
    } else if (amountToCall <= 20) {
      action = { type: ActionType.CALL };
      console.log(`  → CALL ${amountToCall}`);
    } else {
      action = { type: ActionType.FOLD };
      console.log(`  → FOLD`);
    }
    
    const result = game.processPlayerAction(actorId, action);
    if (!result.success) {
      console.log(`  ❌ Action failed: ${result.error}`);
      break;
    }
  }
  
  actionCount++;
}

const finalState = game.getCurrentGameState();
const you = finalState.players.find(p => !p.isAI);

console.log('\n=== HAND COMPLETE ===');
console.log(`Total actions: ${actionCount}`);
console.log(`Final betting round: ${finalState.currentBettingRound}`);
console.log(`Players remaining: ${finalState.players.filter(p => !p.hasFolded).length}`);

if (you) {
  const profit = you.stack - 1000;
  console.log(`\nYour stack: $${you.stack} (${profit >= 0 ? '+' : ''}${profit})`);
}

console.log('\n✓ Demo completed successfully!\n');
