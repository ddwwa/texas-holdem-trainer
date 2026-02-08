import { GameEngine } from './src/game-engine/GameEngine';
import { ActionType } from './src/types/enums';

const engine = new GameEngine(8, 1000, 5, 10);
engine.dealHand();

let state = engine.getGameState();
console.log('\n=== INITIAL STATE ===');
console.log('Action Queue:', state.actionQueue);
console.log('Current Actor Index:', state.currentActorIndex);
console.log('Current Bet:', state.currentBet);

// Simulate a few calls
for (let i = 0; i < 3; i++) {
  const currentActor = state.actionQueue[state.currentActorIndex];
  console.log(`\n--- Action ${i + 1}: ${currentActor} CALLS ---`);
  
  const result = engine.executeAction(currentActor, { type: ActionType.CALL });
  if (!result.success) {
    console.error('ERROR:', result.error);
    break;
  }
  
  state = engine.getGameState();
  console.log('After CALL:');
  console.log('  Action Queue Length:', state.actionQueue.length);
  console.log('  Current Actor Index:', state.currentActorIndex);
  console.log('  Current Bet:', state.currentBet);
}

// Now player raises
const currentActor = state.actionQueue[state.currentActorIndex];
console.log(`\n--- PLAYER RAISES to 40 ---`);
console.log('Before raise - Current Actor:', currentActor);
console.log('Before raise - Index:', state.currentActorIndex);

const raiseResult = engine.executeAction(currentActor, { type: ActionType.RAISE, amount: 40 });
if (!raiseResult.success) {
  console.error('ERROR:', raiseResult.error);
} else {
  state = engine.getGameState();
  console.log('After RAISE:');
  console.log('  Action Queue:', state.actionQueue);
  console.log('  Current Actor Index:', state.currentActorIndex);
  console.log('  Current Bet:', state.currentBet);
  console.log('  Next actor should be:', state.actionQueue[state.currentActorIndex]);
  
  // Try to execute next action
  if (state.currentActorIndex < state.actionQueue.length) {
    const nextActor = state.actionQueue[state.currentActorIndex];
    console.log(`\n--- Next AI (${nextActor}) CALLS ---`);
    
    const callResult = engine.executeAction(nextActor, { type: ActionType.CALL });
    if (!callResult.success) {
      console.error('ERROR:', callResult.error);
    } else {
      state = engine.getGameState();
      console.log('After CALL:');
      console.log('  Current Actor Index:', state.currentActorIndex);
      console.log('  Action Queue Length:', state.actionQueue.length);
    }
  }
}
