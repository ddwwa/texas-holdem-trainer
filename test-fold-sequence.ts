#!/usr/bin/env tsx
/**
 * Debug script to test fold sequence
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

const game = new GameManager();
game.startNewHand();

console.log('\n=== INITIAL STATE ===');
let state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);

// AI 3 folds
console.log('\n=== AI 3 FOLDS ===');
let actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.FOLD });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 4`);

// AI 4 folds
console.log('\n=== AI 4 FOLDS ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.FOLD });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 5`);

// AI 5 calls
console.log('\n=== AI 5 CALLS ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.CALL });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 6`);

// AI 6 folds
console.log('\n=== AI 6 FOLDS ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.FOLD });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 7`);

// AI 7 calls
console.log('\n=== AI 7 CALLS ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.CALL });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: You`);

// You call
console.log('\n=== YOU CALL ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.CALL });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 1 (Small Blind)`);

// AI 1 calls
console.log('\n=== AI 1 (SB) CALLS ===');
actorId = game.getCurrentActor();
game.processPlayerAction(actorId!, { type: ActionType.CALL });
state = game.getCurrentGameState();
console.log(`Action Queue: ${state.actionQueue.map(id => state.players.find(p => p.id === id)?.name).join(' → ')}`);
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Current Actor: ${state.players.find(p => p.id === state.actionQueue[state.currentActorIndex])?.name}`);
console.log(`Expected: AI 2 (Big Blind)`);
