#!/usr/bin/env tsx
/**
 * Debug script to test action queue order
 */

import { GameManager } from './src/game-manager/GameManager';

const game = new GameManager();
game.startNewHand();

const state = game.getCurrentGameState();

console.log('\n=== GAME SETUP ===');
console.log(`Dealer Position: ${state.dealerPosition}`);
console.log(`Small Blind Position: ${state.smallBlindPosition}`);
console.log(`Big Blind Position: ${state.bigBlindPosition}`);

console.log('\n=== PLAYERS ===');
state.players.forEach(player => {
  const isDealer = player.position === state.dealerPosition;
  const isSB = player.position === state.smallBlindPosition;
  const isBB = player.position === state.bigBlindPosition;
  
  let badges = '';
  if (isDealer) badges += ' [DEALER]';
  if (isSB) badges += ' [SB]';
  if (isBB) badges += ' [BB]';
  
  console.log(`Position ${player.position}: ${player.name}${badges} - Stack: ${player.stack}, Bet: ${player.currentBet}`);
});

console.log('\n=== ACTION QUEUE ===');
console.log(`Current Actor Index: ${state.currentActorIndex}`);
console.log(`Action Queue Length: ${state.actionQueue.length}`);
console.log('\nAction Order:');
state.actionQueue.forEach((playerId, index) => {
  const player = state.players.find(p => p.id === playerId);
  const isCurrent = index === state.currentActorIndex;
  console.log(`${isCurrent ? '▶ ' : '  '}${index + 1}. ${player?.name} (Position ${player?.position})`);
});

console.log('\n=== EXPECTED ORDER (Preflop) ===');
console.log('1. Position 3 (AI 3) - UTG');
console.log('2. Position 4 (AI 4)');
console.log('3. Position 5 (AI 5)');
console.log('4. Position 6 (AI 6)');
console.log('5. Position 7 (AI 7)');
console.log('6. Position 0 (You) - Dealer/Button');
console.log('7. Position 1 (AI 1) - Small Blind');
console.log('8. Position 2 (AI 2) - Big Blind');

console.log('\n=== FIRST ACTOR ===');
const firstActor = game.getCurrentActor();
const firstPlayer = state.players.find(p => p.id === firstActor);
console.log(`Current Actor: ${firstPlayer?.name} (Position ${firstPlayer?.position})`);
console.log(`Expected: AI 3 (Position 3)`);
