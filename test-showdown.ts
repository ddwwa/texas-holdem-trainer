#!/usr/bin/env tsx
/**
 * Test showdown display
 */

import { GameManager } from './src/game-manager/GameManager';
import { ActionType } from './src/types/enums';
import { HandResolver } from './src/hand-resolver/HandResolver';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m'
};

function formatCard(rank: string, suit: string): string {
  const suitSymbols: { [key: string]: string } = {
    'spades': '♠',
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣'
  };
  
  const suitColor = (suit === 'hearts' || suit === 'diamonds') ? colors.red : colors.white;
  const symbol = suitSymbols[suit] || suit;
  return `${colors.bright}[${rank}${suitColor}${symbol}${colors.white}]${colors.reset}`;
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

console.log(colors.bright + colors.cyan + '\n=== SHOWDOWN TEST ===\n' + colors.reset);

const game = new GameManager();
game.startNewHand();

// Play through to showdown - everyone calls/checks
let actions = 0;
while (game.getCurrentActor() && actions < 100) {
  const actorId = game.getCurrentActor()!;
  const state = game.getCurrentGameState();
  const actor = state.players.find(p => p.id === actorId)!;
  const amountToCall = state.currentBet - actor.currentBet;
  
  if (amountToCall === 0) {
    game.processPlayerAction(actorId, { type: ActionType.CHECK });
  } else {
    game.processPlayerAction(actorId, { type: ActionType.CALL });
  }
  actions++;
}

const state = game.getCurrentGameState();
const playersInHand = state.players.filter(p => !p.hasFolded);

console.log(colors.yellow + '🏆 HAND COMPLETE - SHOWDOWN' + colors.reset);
console.log('═'.repeat(60));

// Show final board
if (state.communityCards.length > 0) {
  const cardStr = state.communityCards.map(c => formatCard(c.rank, c.suit)).join(' ');
  console.log(colors.green + `\n🃏 FINAL BOARD: ${cardStr}` + colors.reset);
}

// Show all players' cards and hands
console.log(colors.cyan + '\n┌─ SHOWDOWN ─────────────────────────────────────────────┐' + colors.reset);

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

// Display each player's hand
playerHands.forEach((ph, index) => {
  const isWinner = index === 0;
  const cards = ph.player.holeCards.map(c => formatCard(c.rank, c.suit)).join(' ');
  const nameColor = isWinner ? colors.green + colors.bright : colors.white;
  const winnerBadge = isWinner ? ' 👑' : '';
  
  console.log(`│`);
  console.log(`│ ${nameColor}${ph.player.name}${winnerBadge}${colors.reset}`);
  console.log(`│   Cards: ${cards}`);
  console.log(`│   Hand:  ${colors.yellow}${ph.handName}${colors.reset}`);
});

console.log(colors.cyan + '└────────────────────────────────────────────────────────┘' + colors.reset);

// Show pot
const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
console.log(colors.yellow + `\n💰 Total Pot: $${totalPot}` + colors.reset);

console.log(colors.green + '\n✓ Showdown display working!\n' + colors.reset);
