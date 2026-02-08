#!/usr/bin/env tsx
/**
 * Automated Demo - Watch a complete poker hand with GTO analysis
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';
import { Action } from './src/types/core';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printHeader() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Texas Hold\'em Trainer - Automated Demo               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

function printGameState(game: GameManager) {
  const state = game.getCurrentGameState();
  
  console.log(colors.bright + `\n📊 Hand #${state.handNumber} - ${state.currentBettingRound}` + colors.reset);
  console.log('─'.repeat(60));
  
  const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
  console.log(colors.yellow + `💰 Pot: $${totalPot}` + colors.reset);
  
  if (state.communityCards.length > 0) {
    const cardStr = state.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
    console.log(colors.green + `🃏 Community: ${cardStr}` + colors.reset);
  }
  
  console.log('─'.repeat(60));
  
  state.players.forEach((player) => {
    const isDealer = player.position === state.dealerPosition;
    const isSB = player.position === state.smallBlindPosition;
    const isBB = player.position === state.bigBlindPosition;
    const isCurrentActor = state.actionQueue[state.currentActorIndex] === player.id;
    
    let prefix = '  ';
    if (isCurrentActor) prefix = colors.bright + '▶ ' + colors.reset;
    
    let badges = '';
    if (isDealer) badges += ' [D]';
    if (isSB) badges += ' [SB]';
    if (isBB) badges += ' [BB]';
    
    let status = '';
    if (player.hasFolded) status = colors.red + ' (FOLDED)' + colors.reset;
    else if (player.isAllIn) status = colors.magenta + ' (ALL-IN)' + colors.reset;
    
    const color = player.isAI ? colors.blue : colors.green;
    
    // Show cards for human player
    let cards = '';
    if (!player.isAI && player.holeCards.length > 0) {
      cards = ' 🎴 ' + player.holeCards.map(c => `${c.rank}${c.suit}`).join(' ');
    }
    
    console.log(
      `${prefix}${color}${player.name}${colors.reset}${badges}: ` +
      `$${player.stack} (bet: $${player.currentBet})${status}${cards}`
    );
  });
  
  console.log('─'.repeat(60));
}

function printAction(playerName: string, action: string, isAI: boolean) {
  const color = isAI ? colors.blue : colors.green;
  console.log(`\n${color}${playerName}${colors.reset} ${action}`);
}

function printGTOAnalysis(gtoSolution: any, comparison: any) {
  console.log('\n' + colors.cyan + '═'.repeat(60));
  console.log('📈 GTO ANALYSIS');
  console.log('═'.repeat(60) + colors.reset);
  
  console.log(colors.bright + `Recommended: ${gtoSolution.recommendedAction}` + colors.reset);
  
  console.log('\nAction Frequencies:');
  gtoSolution.actionFrequencies.forEach((freq: number, action: string) => {
    if (freq > 0) {
      const bar = '█'.repeat(Math.round(freq * 20));
      console.log(`  ${action.padEnd(10)} ${bar} ${(freq * 100).toFixed(1)}%`);
    }
  });
  
  console.log('\n' + colors.yellow + 'Reasoning:' + colors.reset);
  gtoSolution.reasoning.forEach((reason: string) => {
    console.log(`  • ${reason}`);
  });
  
  if (comparison) {
    console.log('\n' + colors.magenta + 'Feedback:' + colors.reset);
    const feedbackColor = comparison.isOptimal ? colors.green : colors.yellow;
    console.log(feedbackColor + `  ${comparison.feedback}` + colors.reset);
  }
  
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
}

async function main() {
  console.clear();
  printHeader();
  
  console.log('\n🎲 Starting automated demo...\n');
  await sleep(1000);
  
  const game = new GameManager();
  game.startNewHand();
  
  console.clear();
  printHeader();
  printGameState(game);
  
  console.log('\n' + colors.bright + '🎯 Watch as the game plays out with GTO analysis!' + colors.reset);
  await sleep(1000);
  
  let actionCount = 0;
  const maxActions = 30; // Prevent infinite loops
  
  while (game.getCurrentActor() && actionCount < maxActions) {
    const actorId = game.getCurrentActor();
    if (!actorId) break;
    
    const state = game.getCurrentGameState();
    const actor = state.players.find(p => p.id === actorId);
    if (!actor) break;
    
    if (game.isCurrentActorAI()) {
      console.clear();
      printHeader();
      printGameState(game);
      printAction(actor.name, '🤖 is thinking...', true);
      await sleep(400);
      
      const aiResult = game.processAITurn(actorId);
      
      if (aiResult.success && aiResult.action) {
        const actionStr = aiResult.action.type + 
          (aiResult.action.amount ? ` $${aiResult.action.amount}` : '');
        printAction(actor.name, actionStr, true);
        await sleep(600);
      }
    } else {
      // Human player - make a smart decision
      console.clear();
      printHeader();
      printGameState(game);
      
      const amountToCall = state.currentBet - actor.currentBet;
      
      let action;
      if (amountToCall === 0) {
        // No bet - check or bet
        action = { type: ActionType.CHECK };
        printAction(actor.name, 'checks', false);
      } else if (amountToCall <= 20) {
        // Small bet - call
        action = { type: ActionType.CALL };
        printAction(actor.name, `calls $${amountToCall}`, false);
      } else {
        // Large bet - fold
        action = { type: ActionType.FOLD };
        printAction(actor.name, 'folds', false);
      }
      
      await sleep(300);
      
      const result = game.processPlayerAction(actorId, action);
      
      if (result.success && result.gtoSolution && result.comparison) {
        await sleep(300);
        printGTOAnalysis(result.gtoSolution, result.comparison);
        await sleep(2000);
      }
    }
    
    actionCount++;
  }
  
  // Final state
  console.clear();
  printHeader();
  printGameState(game);
  
  const finalState = game.getCurrentGameState();
  const you = finalState.players.find(p => !p.isAI);
  
  console.log('\n' + colors.bright + colors.yellow + '🏆 Hand Complete!' + colors.reset);
  if (you) {
    const profit = you.stack - 1000;
    const profitColor = profit >= 0 ? colors.green : colors.red;
    console.log(`Your final stack: $${you.stack} (${profitColor}${profit >= 0 ? '+' : ''}$${profit}${colors.reset})`);
  }
  
  console.log('\n' + colors.cyan + '✓ Demo completed successfully!' + colors.reset);
  console.log('\nKey features demonstrated:');
  console.log('  • 8-player Texas Hold\'em simulation');
  console.log('  • Real-time GTO analysis and feedback');
  console.log('  • Dealer button rotation');
  console.log('  • Pot management and betting rounds');
  console.log('  • AI opponent decision-making');
  console.log('\n' + colors.green + 'All systems working correctly! 🎰' + colors.reset + '\n');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
