#!/usr/bin/env tsx
/**
 * Enhanced Interactive Texas Hold'em Poker
 * Complete poker information display with GTO analysis
 */

import * as readline from 'readline';
import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';
import { Action } from './src/types/core';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const game = new GameManager();
let handCount = 0;

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

function clearScreen() {
  console.log('\x1Bc');
}

function printHeader() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              🎰 TEXAS HOLD\'EM TRAINER - INTERACTIVE MODE 🎰               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

function printGameState() {
  const state = game.getCurrentGameState();
  
  // Hand and round info
  console.log(colors.bright + colors.yellow);
  console.log(`\n┌─ HAND #${state.handNumber} ─ ${state.currentBettingRound} ─────────────────────────────────────┐`);
  console.log(colors.reset);
  
  // Pot information
  const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
  console.log(colors.yellow + `│ 💰 POT: $${totalPot}` + colors.reset);
  
  // Show side pots if they exist
  if (state.pots.length > 1) {
    state.pots.forEach((pot, idx) => {
      const potType = pot.isMainPot ? 'Main Pot' : `Side Pot ${idx}`;
      console.log(colors.dim + `│    ${potType}: $${pot.amount} (${pot.eligiblePlayers.length} players)` + colors.reset);
    });
  }
  
  // Current bet info
  if (state.currentBet > 0) {
    console.log(colors.yellow + `│ 📊 Current Bet: $${state.currentBet} | Min Raise: $${state.minimumRaise}` + colors.reset);
  }
  
  console.log(colors.yellow + '└────────────────────────────────────────────────────────────────────────────┘' + colors.reset);
  
  // Community cards
  if (state.communityCards.length > 0) {
    const cardStr = state.communityCards.map(c => formatCard(c.rank, c.suit)).join(' ');
    console.log(colors.green + `\n🃏 BOARD: ${cardStr}` + colors.reset);
  }
  
  // Players
  console.log(colors.cyan + '\n┌─ PLAYERS ──────────────────────────────────────────────────────────────────┐' + colors.reset);
  
  state.players.forEach((player) => {
    const isDealer = player.position === state.dealerPosition;
    const isSB = player.position === state.smallBlindPosition;
    const isBB = player.position === state.bigBlindPosition;
    const isCurrentActor = state.actionQueue[state.currentActorIndex] === player.id;
    
    let prefix = '│ ';
    if (isCurrentActor) prefix = colors.bright + '│ ▶ ' + colors.reset;
    
    let badges = '';
    if (isDealer) badges += colors.yellow + ' [D]' + colors.reset;
    if (isSB) badges += colors.cyan + ' [SB]' + colors.reset;
    if (isBB) badges += colors.magenta + ' [BB]' + colors.reset;
    
    let status = '';
    if (player.hasFolded) status = colors.red + ' (FOLDED)' + colors.reset;
    else if (player.isAllIn) status = colors.magenta + ' (ALL-IN)' + colors.reset;
    
    const nameColor = player.isAI ? colors.blue : colors.green + colors.bright;
    const name = player.name.padEnd(8);
    
    // Stack display with color coding
    let stackColor = colors.white;
    if (player.stack === 0) stackColor = colors.red;
    else if (player.stack < 500) stackColor = colors.yellow;
    else if (player.stack > 1500) stackColor = colors.green;
    
    const stackStr = `$${player.stack}`.padEnd(6);
    const betStr = player.currentBet > 0 ? `Bet: $${player.currentBet}` : '';
    
    console.log(
      `${prefix}${nameColor}${name}${colors.reset}${badges}: ` +
      `${stackColor}${stackStr}${colors.reset} ${betStr}${status}`
    );
  });
  
  console.log(colors.cyan + '└────────────────────────────────────────────────────────────────────────────┘' + colors.reset);
}

function formatCard(rank: string, suit: string): string {
  const suitSymbols: { [key: string]: string } = {
    '♠': '♠',
    '♥': '♥',
    '♦': '♦',
    '♣': '♣',
    'spades': '♠',
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣'
  };
  
  const suitColor = (suit === '♥' || suit === '♦' || suit === 'hearts' || suit === 'diamonds') 
    ? colors.red 
    : colors.white;
  
  const symbol = suitSymbols[suit] || suit;
  return `${colors.bright}[${rank}${suitColor}${symbol}${colors.white}]${colors.reset}`;
}

function printYourCards() {
  const state = game.getCurrentGameState();
  const you = state.players.find(p => !p.isAI);
  
  if (you && you.holeCards.length > 0) {
    const cards = you.holeCards.map(c => formatCard(c.rank, c.suit)).join(' ');
    console.log(colors.bright + colors.green + `\n🎴 YOUR CARDS: ${cards}` + colors.reset);
    
    // Show hand strength if there are community cards
    if (state.communityCards.length > 0) {
      // This would require hand evaluation - simplified for now
      console.log(colors.dim + '   (Check GTO analysis for hand strength)' + colors.reset);
    }
  }
}

function printActionHistory() {
  const state = game.getCurrentGameState();
  const recentActions: string[] = [];
  
  // Show last few actions in current round
  state.players.forEach(player => {
    if (player.currentBet > 0 && !player.hasFolded) {
      recentActions.push(`${player.name}: $${player.currentBet}`);
    } else if (player.hasFolded) {
      recentActions.push(`${player.name}: Folded`);
    }
  });
  
  if (recentActions.length > 0) {
    console.log(colors.dim + '\n📝 Recent Actions: ' + recentActions.join(' | ') + colors.reset);
  }
}

function printGTOAnalysis(gtoSolution: any, comparison: any) {
  console.log('\n' + colors.cyan + '═'.repeat(80));
  console.log('📈 GTO ANALYSIS & FEEDBACK');
  console.log('═'.repeat(80) + colors.reset);
  
  // Recommended action
  console.log(colors.bright + colors.yellow + `\n🎯 RECOMMENDED: ${gtoSolution.recommendedAction}` + colors.reset);
  
  // Action frequencies with visual bars
  console.log(colors.white + '\n📊 Action Frequencies:' + colors.reset);
  gtoSolution.actionFrequencies.forEach((freq: number, action: string) => {
    if (freq > 0) {
      const barLength = Math.round(freq * 40);
      const bar = '█'.repeat(barLength);
      const percentage = (freq * 100).toFixed(1);
      const isRecommended = action === gtoSolution.recommendedAction;
      const color = isRecommended ? colors.green : colors.white;
      console.log(`  ${color}${action.padEnd(12)} ${bar} ${percentage}%${colors.reset}`);
    }
  });
  
  // Reasoning
  console.log(colors.yellow + '\n💡 Reasoning:' + colors.reset);
  gtoSolution.reasoning.forEach((reason: string) => {
    console.log(`  • ${reason}`);
  });
  
  // Feedback on your play
  if (comparison) {
    console.log(colors.magenta + '\n🎓 Your Play:' + colors.reset);
    const feedbackColor = comparison.isOptimal ? colors.green : colors.yellow;
    const icon = comparison.isOptimal ? '✓' : '⚠';
    console.log(feedbackColor + `  ${icon} ${comparison.feedback}` + colors.reset);
  }
  
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
}

function getAvailableActions(): string[] {
  const state = game.getCurrentGameState();
  const actorId = game.getCurrentActor();
  if (!actorId) return [];
  
  const actor = state.players.find(p => p.id === actorId);
  if (!actor) return [];
  
  const actions: string[] = [];
  const amountToCall = state.currentBet - actor.currentBet;
  
  actions.push('fold');
  
  if (amountToCall === 0) {
    actions.push('check');
    if (actor.stack > 0) {
      actions.push('bet');
    }
  } else {
    if (actor.stack >= amountToCall) {
      actions.push('call');
    }
    if (actor.stack > amountToCall) {
      actions.push('raise');
    }
  }
  
  if (actor.stack > 0) {
    actions.push('all-in');
  }
  
  return actions;
}

async function showHandResult() {
  clearScreen();
  printHeader();
  
  const state = game.getCurrentGameState();
  const playersInHand = state.players.filter(p => !p.hasFolded);
  const playersFolded = state.players.filter(p => p.hasFolded);
  const you = state.players.find(p => !p.isAI);
  
  console.log('\n' + colors.bright + colors.yellow + '═'.repeat(80));
  console.log('🏆 HAND COMPLETE - SHOWDOWN');
  console.log('═'.repeat(80) + colors.reset);
  
  // Show final board
  if (state.communityCards.length > 0) {
    const cardStr = state.communityCards.map(c => formatCard(c.rank, c.suit)).join(' ');
    console.log(colors.green + `\n🃏 FINAL BOARD: ${cardStr}` + colors.reset);
  }
  
  // Show folded players
  if (playersFolded.length > 0) {
    console.log(colors.dim + `\n❌ Folded: ${playersFolded.map(p => p.name).join(', ')}` + colors.reset);
  }
  
  // Show all players' cards and hands
  console.log(colors.cyan + '\n┌─ SHOWDOWN ─────────────────────────────────────────────────────────────────┐' + colors.reset);
  
  if (playersInHand.length === 1) {
    // Only one player left - they win without showdown
    const winner = playersInHand[0];
    console.log(colors.green + `│ ${winner.name} wins (all others folded)` + colors.reset);
    
    // Still show the winner's cards
    if (winner.holeCards.length > 0) {
      const cards = winner.holeCards.map(c => formatCard(c.rank, c.suit)).join(' ');
      console.log(`│ ${winner.name}'s cards: ${cards}`);
    }
  } else {
    // Multiple players - show all hands
    const { HandResolver } = require('./src/hand-resolver/HandResolver');
    const handResolver = new HandResolver();
    
    // Evaluate all hands
    const playerHands = playersInHand.map(player => {
      const handRank = handResolver.evaluateHand(player.holeCards, state.communityCards);
      return {
        player,
        handRank,
        handName: getHandName(handRank.category)
      };
    });
    
    // Sort by hand strength (best first)
    playerHands.sort((a, b) => handResolver.compareHands(b.handRank, a.handRank));
    
    // Determine winners (handle ties)
    const bestHandValue = playerHands[0].handRank;
    const winners = playerHands.filter(ph => 
      handResolver.compareHands(ph.handRank, bestHandValue) === 0
    );
    
    // Display each player's hand
    playerHands.forEach((ph) => {
      const isWinner = winners.some(w => w.player.id === ph.player.id);
      const cards = ph.player.holeCards.map(c => formatCard(c.rank, c.suit)).join(' ');
      const nameColor = isWinner ? colors.green + colors.bright : colors.white;
      const winnerBadge = isWinner ? ' 👑' : '';
      
      console.log(`│`);
      console.log(`│ ${nameColor}${ph.player.name}${winnerBadge}${colors.reset}`);
      console.log(`│   Cards: ${cards}`);
      console.log(`│   Hand:  ${colors.yellow}${ph.handName}${colors.reset}`);
    });
    
    // Show tie information if applicable
    if (winners.length > 1) {
      console.log(`│`);
      console.log(`│ ${colors.cyan}🤝 Pot split ${winners.length} ways${colors.reset}`);
    }
  }
  
  console.log(colors.cyan + '└────────────────────────────────────────────────────────────────────────────┘' + colors.reset);
  
  // Show pot distribution
  const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
  console.log(colors.yellow + `\n💰 Total Pot: $${totalPot}` + colors.reset);
  
  // Show your result
  if (you) {
    const profit = you.stack - 1000;
    const profitColor = profit >= 0 ? colors.green : colors.red;
    const profitSign = profit >= 0 ? '+' : '';
    console.log(`\n📊 Your stack: $${you.stack} (${profitColor}${profitSign}$${profit}${colors.reset})`);
    
    if (playersInHand.find(p => p.id === you.id)) {
      const youInWinners = playersInHand.find(p => p.id === you.id);
      if (youInWinners) {
        const { HandResolver } = require('./src/hand-resolver/HandResolver');
        const handResolver = new HandResolver();
        const yourHandRank = handResolver.evaluateHand(you.holeCards, state.communityCards);
        const yourHandName = getHandName(yourHandRank.category);
        console.log(colors.green + `   ✓ You made it to showdown with ${yourHandName}!` + colors.reset);
      }
    } else {
      console.log(colors.dim + '   You folded this hand' + colors.reset);
    }
  }
  
  await new Promise(resolve => {
    rl.question(colors.dim + '\n[Press Enter to continue...]' + colors.reset, () => resolve(null));
  });
}

function getHandName(category: string): string {
  const handNames: { [key: string]: string } = {
    'royal-flush': 'Royal Flush',
    'straight-flush': 'Straight Flush',
    'four-of-a-kind': 'Four of a Kind',
    'full-house': 'Full House',
    'flush': 'Flush',
    'straight': 'Straight',
    'three-of-a-kind': 'Three of a Kind',
    'two-pair': 'Two Pair',
    'pair': 'Pair',
    'high-card': 'High Card'
  };
  
  // Handle both formats: 'two-pair' and 'TWO_PAIR'
  const normalized = category.toLowerCase().replace(/_/g, '-');
  return handNames[normalized] || category;
}

function printAvailableActions() {
  const state = game.getCurrentGameState();
  const actorId = game.getCurrentActor();
  const actor = state.players.find(p => p.id === actorId);
  
  if (!actor) return;
  
  const amountToCall = state.currentBet - actor.currentBet;
  const availableActions = getAvailableActions();
  
  console.log('\n' + colors.bright + colors.white + '┌─ YOUR OPTIONS ─────────────────────────────────────────────────────────────┐' + colors.reset);
  
  availableActions.forEach((action, idx) => {
    let display = action.toUpperCase();
    let info = '';
    
    if (action === 'call') {
      info = colors.yellow + ` ($${amountToCall})` + colors.reset;
    } else if (action === 'raise') {
      const minRaise = state.currentBet + state.minimumRaise;
      info = colors.yellow + ` (min: $${minRaise})` + colors.reset;
    } else if (action === 'bet') {
      info = colors.yellow + ` (min: $${state.minimumRaise})` + colors.reset;
    } else if (action === 'all-in') {
      info = colors.magenta + ` ($${actor.stack})` + colors.reset;
    }
    
    console.log(`│ ${colors.bright}${idx + 1}.${colors.reset} ${display}${info}`);
  });
  
  console.log(colors.white + '└────────────────────────────────────────────────────────────────────────────┘' + colors.reset);
}

function promptAction(): Promise<Action> {
  return new Promise((resolve) => {
    const state = game.getCurrentGameState();
    const actorId = game.getCurrentActor();
    const actor = state.players.find(p => p.id === actorId);
    
    if (!actor) {
      resolve({ type: ActionType.FOLD });
      return;
    }
    
    const amountToCall = state.currentBet - actor.currentBet;
    const availableActions = getAvailableActions();
    
    rl.question(colors.bright + '\n👉 Enter action number (or type action name): ' + colors.reset, (answer) => {
      const input = answer.trim().toLowerCase();
      
      // Check if it's a number (action selection)
      const actionNum = parseInt(input);
      if (!isNaN(actionNum) && actionNum >= 1 && actionNum <= availableActions.length) {
        const selectedAction = availableActions[actionNum - 1];
        
        if (selectedAction === 'bet' || selectedAction === 'raise') {
          rl.question(colors.yellow + 'Enter amount: $' + colors.reset, (amountStr) => {
            const amount = parseInt(amountStr);
            resolve({
              type: selectedAction === 'bet' ? ActionType.BET : ActionType.RAISE,
              amount
            });
          });
        } else {
          const actionType = selectedAction.toUpperCase().replace('-', '_') as ActionType;
          resolve({ type: ActionType[actionType as keyof typeof ActionType] });
        }
      } else {
        // Try to parse as action name
        const actionName = input.toUpperCase().replace('-', '_');
        if (ActionType[actionName as keyof typeof ActionType]) {
          const actionType = ActionType[actionName as keyof typeof ActionType];
          
          if (actionType === ActionType.BET || actionType === ActionType.RAISE) {
            rl.question(colors.yellow + 'Enter amount: $' + colors.reset, (amountStr) => {
              const amount = parseInt(amountStr);
              resolve({ type: actionType, amount });
            });
          } else {
            resolve({ type: actionType });
          }
        } else {
          console.log(colors.red + '❌ Invalid action. Please try again.' + colors.reset);
          promptAction().then(resolve);
        }
      }
    });
  });
}

async function playHand() {
  handCount++;
  clearScreen();
  printHeader();
  
  console.log(colors.bright + colors.cyan + `\n🎲 Starting Hand #${handCount}...` + colors.reset);
  await sleep(1000);
  
  game.startNewHand();
  
  while (game.getCurrentActor()) {
    clearScreen();
    printHeader();
    printGameState();
    printYourCards();
    printActionHistory();
    
    const actorId = game.getCurrentActor();
    if (!actorId) break;
    
    if (game.isCurrentActorAI()) {
      const state = game.getCurrentGameState();
      const actor = state.players.find(p => p.id === actorId);
      console.log('\n' + colors.blue + `🤖 ${actor?.name} is thinking...` + colors.reset);
      await sleep(400);
      
      const aiResult = game.processAITurn(actorId);
      
      if (aiResult.success && aiResult.action) {
        const actionStr = aiResult.action.type + 
          (aiResult.action.amount ? ` $${aiResult.action.amount}` : '');
        console.log(colors.blue + `   → ${actionStr}` + colors.reset);
        await sleep(600);
      } else if (!aiResult.success) {
        console.log(colors.red + `   ❌ Error: ${aiResult.error}` + colors.reset);
        await sleep(2000);
        break;
      }
    } else {
      printAvailableActions();
      const action = await promptAction();
      const result = game.processPlayerAction(actorId, action);
      
      if (result.success) {
        if (result.gtoSolution && result.comparison) {
          clearScreen();
          printHeader();
          printGameState();
          printYourCards();
          printGTOAnalysis(result.gtoSolution, result.comparison);
          
          await new Promise(resolve => {
            rl.question(colors.dim + '\n[Press Enter to continue...]' + colors.reset, () => resolve(null));
          });
        }
      } else {
        console.log(colors.red + `\n❌ Error: ${result.error}` + colors.reset);
        await sleep(2000);
      }
    }
  }
  
  // Show final state with showdown
  await showHandResult();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  clearScreen();
  printHeader();
  
  console.log(colors.white + '\nWelcome to Texas Hold\'em Trainer!' + colors.reset);
  console.log('You\'ll play against 7 AI opponents and receive real-time GTO feedback.\n');
  console.log(colors.dim + 'Features:' + colors.reset);
  console.log('  • Complete game state visualization');
  console.log('  • Real-time GTO strategy analysis');
  console.log('  • Detailed action feedback');
  console.log('  • Professional poker interface\n');
  
  await new Promise(resolve => {
    rl.question(colors.bright + 'Press Enter to start your first hand...' + colors.reset, () => resolve(null));
  });
  
  while (true) {
    await playHand();
    
    const answer = await new Promise<string>(resolve => {
      rl.question(colors.bright + '\n🎰 Play another hand? (y/n): ' + colors.reset, (ans) => resolve(ans));
    });
    
    if (answer.toLowerCase() !== 'y') {
      break;
    }
  }
  
  clearScreen();
  printHeader();
  console.log(colors.green + '\n✨ Thanks for playing! See you at the tables! 🎰\n' + colors.reset);
  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error(colors.red + 'Error:', error + colors.reset);
  rl.close();
  process.exit(1);
});
