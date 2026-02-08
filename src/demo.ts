import { GameEngine } from './game-engine/GameEngine';
import { ActionType } from './types/enums';

/**
 * Simple terminal demo of the Texas Hold'em game engine
 */
function demo() {
  console.log('='.repeat(60));
  console.log('TEXAS HOLD\'EM POKER - GAME ENGINE DEMO');
  console.log('='.repeat(60));
  console.log();

  // Initialize game with 8 players, $1000 starting stacks, $5/$10 blinds
  const engine = new GameEngine(8, 1000, 5, 10);
  
  console.log('🎲 Starting a new hand...\n');
  engine.dealHand();
  
  let gameState = engine.getGameState();
  
  // Display initial game state
  console.log('📊 GAME STATE:');
  console.log(`   Hand #${gameState.handNumber}`);
  console.log(`   Betting Round: ${gameState.currentBettingRound}`);
  console.log(`   Current Bet: $${gameState.currentBet}`);
  console.log(`   Pot: $${engine.getPotManager().getTotalPotAmount()}`);
  console.log();
  
  // Display players
  console.log('👥 PLAYERS:');
  gameState.players.forEach((player, idx) => {
    const isDealer = idx === gameState.dealerPosition ? ' 🔘' : '';
    const isSB = idx === gameState.smallBlindPosition ? ' (SB)' : '';
    const isBB = idx === gameState.bigBlindPosition ? ' (BB)' : '';
    
    let cards = 'No cards';
    if (player.holeCards.length > 0) {
      // Only show human player's cards
      if (idx === 0) {
        cards = `${player.holeCards[0].rank}${player.holeCards[0].suit} ${player.holeCards[1].rank}${player.holeCards[1].suit}`;
      } else {
        cards = '🂠 🂠'; // Hidden cards for AI players
      }
    }
    
    console.log(`   ${idx}. ${player.name}${isDealer}${isSB}${isBB}`);
    console.log(`      Stack: $${player.stack} | Bet: $${player.currentBet} | Cards: ${cards}`);
  });
  console.log();
  
  // Simulate some actions
  console.log('🎮 PREFLOP ACTION:');
  console.log('-'.repeat(60));
  
  const actionQueue = [...gameState.actionQueue];
  let actionCount = 0;
  
  for (const playerId of actionQueue) {
    gameState = engine.getGameState();
    
    // Stop if round has advanced
    if (gameState.currentBettingRound !== 'PREFLOP') break;
    
    // Check if it's this player's turn
    if (gameState.actionQueue[gameState.currentActorIndex] !== playerId) continue;
    
    const player = gameState.players.find(p => p.id === playerId)!;
    
    // Simple AI: first 3 players call, rest fold
    let action;
    if (actionCount < 3) {
      action = { type: ActionType.CALL };
      console.log(`   ${player.name} calls $${gameState.currentBet - player.currentBet}`);
    } else {
      action = { type: ActionType.FOLD };
      console.log(`   ${player.name} folds`);
    }
    
    const result = engine.executeAction(playerId, action);
    if (!result.success) {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    actionCount++;
  }
  
  console.log();
  
  // Show flop
  gameState = engine.getGameState();
  if (gameState.currentBettingRound === 'FLOP') {
    console.log('🃏 FLOP:');
    const flopCards = gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
    console.log(`   ${flopCards}`);
    console.log(`   Pot: $${engine.getPotManager().getTotalPotAmount()}`);
    console.log();
    
    // Everyone checks on flop
    console.log('🎮 FLOP ACTION:');
    console.log('-'.repeat(60));
    const flopQueue = [...gameState.actionQueue];
    
    for (const playerId of flopQueue) {
      gameState = engine.getGameState();
      if (gameState.currentBettingRound !== 'FLOP') break;
      if (gameState.actionQueue[gameState.currentActorIndex] !== playerId) continue;
      
      const player = gameState.players.find(p => p.id === playerId)!;
      console.log(`   ${player.name} checks`);
      engine.executeAction(playerId, { type: ActionType.CHECK });
    }
    console.log();
  }
  
  // Show turn
  gameState = engine.getGameState();
  if (gameState.currentBettingRound === 'TURN') {
    console.log('🃏 TURN:');
    const turnCards = gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
    console.log(`   ${turnCards}`);
    console.log(`   Pot: $${engine.getPotManager().getTotalPotAmount()}`);
    console.log();
    
    // Everyone checks on turn
    console.log('🎮 TURN ACTION:');
    console.log('-'.repeat(60));
    const turnQueue = [...gameState.actionQueue];
    
    for (const playerId of turnQueue) {
      gameState = engine.getGameState();
      if (gameState.currentBettingRound !== 'TURN') break;
      if (gameState.actionQueue[gameState.currentActorIndex] !== playerId) continue;
      
      const player = gameState.players.find(p => p.id === playerId)!;
      console.log(`   ${player.name} checks`);
      engine.executeAction(playerId, { type: ActionType.CHECK });
    }
    console.log();
  }
  
  // Show river
  gameState = engine.getGameState();
  if (gameState.currentBettingRound === 'RIVER') {
    console.log('🃏 RIVER:');
    const riverCards = gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
    console.log(`   ${riverCards}`);
    console.log(`   Pot: $${engine.getPotManager().getTotalPotAmount()}`);
    console.log();
    
    // Everyone checks on river
    console.log('🎮 RIVER ACTION:');
    console.log('-'.repeat(60));
    const riverQueue = [...gameState.actionQueue];
    
    for (const playerId of riverQueue) {
      gameState = engine.getGameState();
      if (gameState.currentBettingRound !== 'RIVER') break;
      if (gameState.actionQueue[gameState.currentActorIndex] !== playerId) continue;
      
      const player = gameState.players.find(p => p.id === playerId)!;
      console.log(`   ${player.name} checks`);
      engine.executeAction(playerId, { type: ActionType.CHECK });
    }
    console.log();
  }
  
  // Show final results
  gameState = engine.getGameState();
  console.log('🏆 SHOWDOWN:');
  console.log('-'.repeat(60));
  
  const playersInHand = gameState.players.filter(p => !p.hasFolded);
  
  if (playersInHand.length > 0 && gameState.communityCards.length === 5) {
    playersInHand.forEach(player => {
      const handRank = engine.getHandResolver().evaluateHand(
        player.holeCards,
        gameState.communityCards
      );
      const cards = `${player.holeCards[0].rank}${player.holeCards[0].suit} ${player.holeCards[1].rank}${player.holeCards[1].suit}`;
      console.log(`   ${player.name}: ${cards}`);
      console.log(`      Hand: ${handRank.category} (value: ${handRank.value})`);
    });
  } else {
    console.log(`   Hand ended early - ${playersInHand.length} player(s) remaining`);
    if (playersInHand.length > 0) {
      console.log(`   Winner: ${playersInHand[0].name}`);
    }
  }
  
  console.log();
  console.log('💰 FINAL STACKS:');
  gameState.players.forEach((player, idx) => {
    const change = player.stack - 1000;
    const changeStr = change >= 0 ? `+$${change}` : `-$${Math.abs(change)}`;
    console.log(`   ${idx}. ${player.name}: $${player.stack} (${changeStr})`);
  });
  
  console.log();
  console.log('='.repeat(60));
  console.log('Demo complete! ✨');
  console.log('='.repeat(60));
}

// Run the demo
demo();
