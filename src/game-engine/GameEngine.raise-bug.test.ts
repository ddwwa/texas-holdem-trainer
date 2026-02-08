import { GameEngine } from './GameEngine';
import { ActionType } from '../types/enums';

describe('GameEngine - Raise Bug Debug', () => {
  test('should handle raise scenario: AI3 calls 10, Player raises to 40, AI1 calls 40, AI3 should act again', () => {
    const engine = new GameEngine(8, 1000, 5, 10);
    engine.dealHand();
    
    let gameState = engine.getGameState();
    
    console.log('\n=== INITIAL STATE ===');
    console.log('Betting Round:', gameState.currentBettingRound);
    console.log('Current Bet:', gameState.currentBet);
    console.log('Action Queue:', gameState.actionQueue);
    console.log('Current Actor Index:', gameState.currentActorIndex);
    
    // Log all players
    gameState.players.forEach((p, i) => {
      console.log(`Player ${i} (${p.id}): Stack=$${p.stack}, Bet=$${p.currentBet}, Position=${p.position}`);
    });
    
    // Simulate actions until we can reproduce the bug
    let actionCount = 0;
    const maxActions = 20;
    
    while (actionCount < maxActions && gameState.actionQueue.length > 0) {
      const currentActor = gameState.actionQueue[gameState.currentActorIndex];
      const player = gameState.players.find(p => p.id === currentActor);
      
      if (!player) {
        console.log('ERROR: Current actor not found');
        break;
      }
      
      console.log(`\n--- Action ${actionCount + 1} ---`);
      console.log(`Current Actor: ${player.name} (${player.id})`);
      console.log(`Player Stack: $${player.stack}, Current Bet: $${player.currentBet}`);
      console.log(`Game Current Bet: $${gameState.currentBet}`);
      console.log(`Amount to Call: $${gameState.currentBet - player.currentBet}`);
      
      let action;
      let actionDesc;
      
      // Simulate specific scenario:
      // - First few AI players call
      // - Player (position 0) raises
      // - Next AI calls the raise
      // - Check if previous AI gets to act again
      
      if (player.isAI) {
        // AI logic: just call for now to keep it simple
        const amountToCall = gameState.currentBet - player.currentBet;
        if (amountToCall === 0) {
          action = { type: ActionType.CHECK };
          actionDesc = 'CHECK';
        } else {
          action = { type: ActionType.CALL };
          actionDesc = `CALL $${amountToCall}`;
        }
      } else {
        // Human player - simulate a raise to $40
        action = { type: ActionType.RAISE, amount: 40 };
        actionDesc = 'RAISE to $40';
      }
      
      console.log(`Action: ${actionDesc}`);
      
      const result = engine.executeAction(currentActor, action);
      
      if (!result.success) {
        console.log(`ERROR: ${result.error}`);
        break;
      }
      
      gameState = engine.getGameState();
      
      console.log(`After action:`);
      console.log(`  Current Bet: $${gameState.currentBet}`);
      console.log(`  Action Queue Length: ${gameState.actionQueue.length}`);
      console.log(`  Action Queue: ${gameState.actionQueue.join(', ')}`);
      console.log(`  Current Actor Index: ${gameState.currentActorIndex}`);
      console.log(`  Betting Round: ${gameState.currentBettingRound}`);
      
      // Log players who haven't matched the bet
      const playersNotMatched = gameState.players.filter(p => 
        !p.hasFolded && !p.isAllIn && p.currentBet < gameState.currentBet
      );
      if (playersNotMatched.length > 0) {
        console.log(`  Players who haven't matched bet:`);
        playersNotMatched.forEach(p => {
          console.log(`    ${p.name}: Bet=$${p.currentBet}, needs $${gameState.currentBet - p.currentBet} more`);
        });
      }
      
      actionCount++;
      
      // Stop if we've advanced to flop
      if (gameState.currentBettingRound !== 'PREFLOP') {
        console.log('\n=== ROUND ADVANCED TO FLOP ===');
        break;
      }
    }
    
    console.log('\n=== FINAL STATE ===');
    console.log('Betting Round:', gameState.currentBettingRound);
    console.log('Action Queue Length:', gameState.actionQueue.length);
    console.log('Community Cards:', gameState.communityCards.length);
    
    // Check if all players matched the bet
    const playersInHand = gameState.players.filter(p => !p.hasFolded);
    const allMatched = playersInHand.every(p => 
      p.isAllIn || p.currentBet === gameState.currentBet
    );
    
    console.log('All players matched bet:', allMatched);
    
    if (!allMatched) {
      console.log('\nBUG DETECTED: Not all players matched the bet but round advanced!');
      playersInHand.forEach(p => {
        if (!p.isAllIn && p.currentBet < gameState.currentBet) {
          console.log(`  ${p.name}: Bet=$${p.currentBet}, should be $${gameState.currentBet}`);
        }
      });
    }
    
    // The test should ensure all players matched the bet before advancing
    expect(allMatched || gameState.actionQueue.length > 0).toBe(true);
  });
});
