#!/usr/bin/env tsx
/**
 * Simple test - just show the game works
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';

console.log('═══════════════════════════════════════════════════════');
console.log('  Texas Hold\'em Trainer - Simple Test');
console.log('═══════════════════════════════════════════════════════\n');

const game = new GameManager();

// Start a hand
console.log('✓ Starting hand...');
game.startNewHand();

const state = game.getCurrentGameState();
console.log(`✓ Hand #${state.handNumber} started`);
console.log(`✓ Dealer at position ${state.dealerPosition}`);
console.log(`✓ Pot: $${state.pots[0].amount}`);

// Show your cards
const you = state.players.find(p => !p.isAI);
if (you && you.holeCards.length > 0) {
  const cards = you.holeCards.map(c => `${c.rank}${c.suit}`).join(' ');
  console.log(`✓ Your cards: ${cards}`);
}

// Make a player action
console.log('\n✓ Making your action...');
const actorId = game.getCurrentActor();
if (actorId && !game.isCurrentActorAI()) {
  const result = game.processPlayerAction(actorId, { type: ActionType.CALL });
  console.log(`✓ Action result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.gtoSolution) {
    console.log(`\n📈 GTO Analysis:`);
    console.log(`   Recommended: ${result.gtoSolution.recommendedAction}`);
    console.log(`   Reasoning: ${result.gtoSolution.reasoning[0]}`);
  }
  
  if (result.comparison) {
    console.log(`\n💬 Feedback:`);
    console.log(`   ${result.comparison.feedback}`);
  }
}

// Let AI players act (limit to 10 actions)
console.log('\n✓ AI players acting...');
let count = 0;
while (game.getCurrentActor() && count < 10) {
  const id = game.getCurrentActor();
  if (id && game.isCurrentActorAI()) {
    game.processAITurn(id);
    count++;
    console.log(`   AI action ${count} completed`);
  } else {
    break;
  }
}

console.log(`\n✓ ${count} AI actions completed`);

// Show final state
const finalState = game.getCurrentGameState();
console.log(`✓ Current round: ${finalState.currentBettingRound}`);
console.log(`✓ Pot: $${finalState.pots[0].amount}`);

if (finalState.communityCards.length > 0) {
  const cards = finalState.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
  console.log(`✓ Community cards: ${cards}`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ Test completed successfully!');
console.log('═══════════════════════════════════════════════════════\n');
