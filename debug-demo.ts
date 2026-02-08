#!/usr/bin/env tsx
/**
 * Debug Demo - Find where it's getting stuck
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const game = new GameManager();
game.startNewHand();

console.log('\n=== STARTING HAND ===');

let actionCount = 0;
const maxActions = 50;

while (game.getCurrentActor() && actionCount < maxActions) {
  const actorId = game.getCurrentActor();
  if (!actorId) {
    console.log('No current actor, breaking');
    break;
  }
  
  const state = game.getCurrentGameState();
  const actor = state.players.find(p => p.id === actorId);
  if (!actor) {
    console.log('Actor not found, breaking');
    break;
  }
  
  console.log(`\n--- Action ${actionCount + 1} ---`);
  console.log(`Current Actor: ${actor.name} (${actor.id})`);
  console.log(`Betting Round: ${state.currentBettingRound}`);
  console.log(`Current Bet: ${state.currentBet}`);
  console.log(`Actor Bet: ${actor.currentBet}`);
  console.log(`Actor Stack: ${actor.stack}`);
  console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(', ')}`);
  console.log(`Current Index: ${state.currentActorIndex}`);
  
  if (game.isCurrentActorAI()) {
    console.log(`Processing AI turn...`);
    const aiResult = game.processAITurn(actorId);
    
    if (!aiResult.success) {
      console.log(`AI turn failed: ${aiResult.error}`);
      break;
    }
    
    if (aiResult.action) {
      console.log(`AI action: ${aiResult.action.type} ${aiResult.action.amount || ''}`);
    }
  } else {
    // Human player - make a simple decision
    const amountToCall = state.currentBet - actor.currentBet;
    
    let action;
    if (amountToCall === 0) {
      action = { type: ActionType.CHECK };
      console.log('Human checks');
    } else if (amountToCall <= 20) {
      action = { type: ActionType.CALL };
      console.log(`Human calls ${amountToCall}`);
    } else {
      action = { type: ActionType.FOLD };
      console.log('Human folds');
    }
    
    const result = game.processPlayerAction(actorId, action);
    if (!result.success) {
      console.log(`Human action failed: ${result.error}`);
      break;
    }
  }
  
  actionCount++;
  
  // Check if we're stuck in a loop
  const newState = game.getCurrentGameState();
  const newActor = game.getCurrentActor();
  if (newActor === actorId && actionCount > 2) {
    console.log('\n!!! STUCK: Same actor again !!!');
    console.log(`Action Queue: ${newState.actionQueue.join(', ')}`);
    console.log(`Current Index: ${newState.currentActorIndex}`);
    break;
  }
}

console.log(`\n=== COMPLETED ${actionCount} ACTIONS ===`);

const finalState = game.getCurrentGameState();
console.log(`Final Betting Round: ${finalState.currentBettingRound}`);
console.log(`Final Current Actor: ${game.getCurrentActor()}`);
console.log(`Players in hand: ${finalState.players.filter(p => !p.hasFolded).length}`);
