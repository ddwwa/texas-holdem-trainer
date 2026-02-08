import * as readline from 'readline';
import { GameEngine } from './src/game-engine/GameEngine';
import { ActionType, HandCategory } from './src/types/enums';
import { Action, Card } from './src/types/core';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const engine = new GameEngine(4, 1000, 5, 10);

function cardToString(card: Card): string {
  if (!card || !card.rank || !card.suit) return '??';
  return `${card.rank}${card.suit}`;
}

function handCategoryToString(category: HandCategory): string {
  switch (category) {
    case HandCategory.ROYAL_FLUSH: return 'Royal Flush';
    case HandCategory.STRAIGHT_FLUSH: return 'Straight Flush';
    case HandCategory.FOUR_OF_A_KIND: return 'Four of a Kind';
    case HandCategory.FULL_HOUSE: return 'Full House';
    case HandCategory.FLUSH: return 'Flush';
    case HandCategory.STRAIGHT: return 'Straight';
    case HandCategory.THREE_OF_A_KIND: return 'Three of a Kind';
    case HandCategory.TWO_PAIR: return 'Two Pair';
    case HandCategory.PAIR: return 'Pair';
    case HandCategory.HIGH_CARD: return 'High Card';
    default: return 'Unknown';
  }
}

function displayGameState() {
  const state = engine.getGameState();
  
  console.log('\n' + '='.repeat(80));
  console.log(`HAND #${state.handNumber} - ${state.currentBettingRound}`);
  console.log('='.repeat(80));
  
  // Show community cards
  if (state.communityCards.length > 0) {
    console.log('\nCommunity Cards:', state.communityCards.map(cardToString).join(' '));
  }
  
  // Show pot
  const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
  console.log(`\nPot: ${totalPot} | Current Bet: ${state.currentBet}`);
  
  // Show all players
  console.log('\nPlayers:');
  state.players.forEach((p, i) => {
    const isDealer = i === state.dealerPosition ? ' [D]' : '';
    const isSB = i === state.smallBlindPosition ? ' [SB]' : '';
    const isBB = i === state.bigBlindPosition ? ' [BB]' : '';
    const status = p.hasFolded ? ' [FOLDED]' : p.isAllIn ? ' [ALL-IN]' : '';
    const isCurrent = state.actionQueue[state.currentActorIndex] === p.id ? ' <-- CURRENT' : '';
    
    let cards = '';
    if (p.id === 'player_0') {
      cards = p.holeCards.length > 0 ? ` [${p.holeCards.map(cardToString).join(' ')}]` : '';
    } else {
      cards = p.holeCards.length > 0 ? ' [??]' : '';
    }
    
    console.log(`  ${p.name}${isDealer}${isSB}${isBB}: ${p.stack} (bet: ${p.currentBet})${cards}${status}${isCurrent}`);
  });
  
  console.log('\nAction Queue:', state.actionQueue.map(id => {
    const p = state.players.find(pl => pl.id === id);
    return p ? p.name : id;
  }).join(' -> '));
  console.log(`Current Actor Index: ${state.currentActorIndex} / ${state.actionQueue.length}`);
}

function processAITurns(): boolean {
  let state = engine.getGameState();
  let lastRound = state.currentBettingRound;
  
  console.log(`\n[DEBUG] processAITurns - Queue: ${state.actionQueue.length}, Index: ${state.currentActorIndex}`);
  
  while (state.actionQueue.length > 0 && state.currentActorIndex < state.actionQueue.length) {
    const currentActorId = state.actionQueue[state.currentActorIndex];
    const currentActor = state.players.find(p => p.id === currentActorId);
    
    if (!currentActor || !currentActor.isAI) {
      console.log(`[DEBUG] Human player's turn`);
      return true;
    }
    
    const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
    const amountToCall = state.currentBet - currentActor.currentBet;
    let action: Action;
    
    if (amountToCall === 0) {
      if (Math.random() < 0.7) {
        action = { type: ActionType.CHECK };
      } else {
        const betAmount = Math.max(10, Math.floor(totalPot * 0.5));
        action = { type: ActionType.BET, amount: Math.min(betAmount, currentActor.stack) };
      }
    } else if (currentActor.stack >= amountToCall) {
      const rand = Math.random();
      if (rand < 0.3) {
        action = { type: ActionType.FOLD };
      } else if (rand < 0.8) {
        action = { type: ActionType.CALL };
      } else {
        const raiseAmount = state.currentBet * 2;
        action = { type: ActionType.RAISE, amount: Math.min(raiseAmount, currentActor.stack + currentActor.currentBet) };
      }
    } else {
      action = Math.random() < 0.7 ? { type: ActionType.FOLD } : { type: ActionType.ALL_IN };
    }
    
    console.log(`\n${currentActor.name} ${action.type}${action.amount ? ` ${action.amount}` : ''}`);
    
    const result = engine.executeAction(currentActorId, action);
    if (!result.success) {
      console.log(`ERROR: ${result.error}`);
      return false;
    }
    
    state = engine.getGameState();
    
    // Check if betting round changed
    if (state.currentBettingRound !== lastRound) {
      console.log(`\n*** BETTING ROUND COMPLETE - Moving to ${state.currentBettingRound} ***`);
      displayGameState();
      lastRound = state.currentBettingRound;
    }
    
    if (state.actionQueue.length === 0) {
      console.log(`\n[DEBUG] Hand complete`);
      return false;
    }
  }
  
  return state.actionQueue.length > 0;
}

function promptAction(): Promise<void> {
  return new Promise((resolve) => {
    const state = engine.getGameState();
    const currentActorId = state.actionQueue[state.currentActorIndex];
    const player = state.players.find(p => p.id === currentActorId);
    
    if (!player) {
      console.log('ERROR: No current player');
      resolve();
      return;
    }
    
    const amountToCall = state.currentBet - player.currentBet;
    
    console.log('\n' + '-'.repeat(80));
    console.log('YOUR TURN!');
    console.log(`Your cards: ${player.holeCards.map(cardToString).join(' ')}`);
    console.log(`Your stack: ${player.stack} | Your bet: ${player.currentBet}`);
    console.log(`Amount to call: ${amountToCall}`);
    
    let options = '\nOptions: ';
    if (amountToCall === 0) {
      options += '(c)heck, (b)et [amount], (a)ll-in';
    } else {
      options += `(f)old, (c)all ${amountToCall}, (r)aise [amount], (a)ll-in`;
    }
    
    rl.question(options + '\nYour action: ', (answer) => {
      const input = answer.trim().toLowerCase();
      let action: Action | null = null;
      
      if (input === 'f' || input === 'fold') {
        action = { type: ActionType.FOLD };
      } else if (input === 'c' || input === 'check' || input === 'call') {
        action = amountToCall === 0 ? { type: ActionType.CHECK } : { type: ActionType.CALL };
      } else if (input === 'a' || input === 'allin') {
        action = { type: ActionType.ALL_IN };
      } else if (input.startsWith('b')) {
        const parts = input.split(' ');
        const amount = parseInt(parts[1] || '0');
        if (amount > 0) {
          action = { type: ActionType.BET, amount };
        }
      } else if (input.startsWith('r')) {
        const parts = input.split(' ');
        const amount = parseInt(parts[1] || '0');
        if (amount > 0) {
          action = { type: ActionType.RAISE, amount };
        }
      }
      
      if (!action) {
        console.log('Invalid action. Try again.');
        resolve();
        return;
      }
      
      const result = engine.executeAction(currentActorId, action);
      if (!result.success) {
        console.log(`ERROR: ${result.error}`);
      }
      
      resolve();
    });
  });
}

let previousStacks: Map<string, number> = new Map();

async function playHand() {
  console.log('\n\n' + '#'.repeat(80));
  console.log('STARTING NEW HAND');
  console.log('#'.repeat(80));
  
  // Save stacks before hand starts
  const initialState = engine.getGameState();
  previousStacks.clear();
  initialState.players.forEach(p => {
    previousStacks.set(p.id, p.stack);
  });
  
  engine.dealHand();
  displayGameState();
  
  if (!processAITurns()) {
    displayGameState();
    showHandResult();
    return;
  }
  
  while (true) {
    displayGameState();
    
    const state = engine.getGameState();
    
    if (state.actionQueue.length === 0) {
      showHandResult();
      break;
    }
    
    const currentActorId = state.actionQueue[state.currentActorIndex];
    const currentActor = state.players.find(p => p.id === currentActorId);
    
    if (!currentActor) {
      console.log('ERROR: No current actor');
      break;
    }
    
    if (currentActor.isAI) {
      if (!processAITurns()) {
        displayGameState();
        showHandResult();
        break;
      }
    } else {
      await promptAction();
      
      // Check if hand completed after player action
      const newState = engine.getGameState();
      if (newState.actionQueue.length === 0) {
        displayGameState();
        showHandResult();
        break;
      }
      
      if (!processAITurns()) {
        displayGameState();
        showHandResult();
        break;
      }
    }
  }
}

function showHandResult() {
  const state = engine.getGameState();
  const handResolver = engine.getHandResolver();
  
  console.log('\n' + '='.repeat(80));
  console.log('HAND COMPLETE - SHOWDOWN');
  console.log('='.repeat(80));
  
  // Show community cards
  if (state.communityCards.length > 0) {
    console.log('\nCommunity Cards:', state.communityCards.map(cardToString).join(' '));
  }
  
  console.log('\nAll Players\' Hands:');
  state.players.forEach(p => {
    const cards = p.holeCards.length > 0 ? p.holeCards.map(cardToString).join(' ') : 'No cards';
    const status = p.hasFolded ? ' [FOLDED]' : '';
    
    // Evaluate hand if player didn't fold and has cards
    let handDescription = '';
    if (!p.hasFolded && p.holeCards.length > 0 && state.communityCards.length > 0) {
      const handRank = handResolver.evaluateHand(p.holeCards, state.communityCards);
      handDescription = ` - ${handCategoryToString(handRank.category)}`;
    }
    
    console.log(`  ${p.name}: [${cards}]${handDescription}${status}`);
  });
  
  // Show pot distribution
  const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
  console.log(`\nTotal Pot: ${totalPot}`);
  
  // Determine winners by comparing stacks
  console.log('\nWinners:');
  let foundWinner = false;
  state.players.forEach(p => {
    const previousStack = previousStacks.get(p.id) || p.stack;
    const change = p.stack - previousStack;
    if (change > 0) {
      console.log(`  ${p.name} wins ${change} chips!`);
      foundWinner = true;
    }
  });
  
  if (!foundWinner) {
    console.log('  No winners (all folded or split pot with no change)');
  }
  
  console.log('\nFinal Stacks:');
  state.players.forEach(p => {
    const previousStack = previousStacks.get(p.id) || p.stack;
    const change = p.stack - previousStack;
    const changeStr = change > 0 ? ` (+${change})` : change < 0 ? ` (${change})` : ' (0)';
    console.log(`  ${p.name}: ${p.stack}${changeStr}`);
  });
}

async function main() {
  console.log('Welcome to Terminal Poker!');
  console.log('You are "You" (player_0)');
  console.log('Commands: fold/f, call/c, check/c, bet [amount]/b [amount], raise [amount]/r [amount], allin/a');
  
  while (true) {
    await playHand();
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('\nPlay another hand? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() !== 'y') {
      break;
    }
  }
  
  console.log('\nThanks for playing!');
  rl.close();
}

main().catch(console.error);
