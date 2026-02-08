# All-In Queue Management Fix

## Problem Identified

From the logs:
```
After action - queue: ['AI 4']
After action - actor index: 1
```

The queue has 1 player but the index is 1 (out of bounds). This causes `getCurrentActor()` to return `undefined`, making the game stuck.

## Root Cause

When a player calls and goes all-in:
1. Queue is `['AI 1', 'AI 4']`, index is 0 (AI 1's turn)
2. AI 1 calls and goes all-in
3. `executeCall()` marks player as all-in but doesn't remove from queue
4. `executeAction()` calls `advanceActor()`, incrementing index to 1
5. Queue is still `['AI 1', 'AI 4']`, index is 1 (AI 4's turn) ✓ CORRECT
6. AI 4 acts...
7. But AI 1 is still in the queue even though they're all-in!

Later, when the queue is rebuilt or cleaned, AI 1 is removed, but the index isn't adjusted properly, causing it to go out of bounds.

## Solution

### Part 1: Don't Remove in executeCall
Removed the queue manipulation from `executeCall()`. Just mark the player as all-in.

### Part 2: Clean Queue After Advancing
After `advanceActor()` is called in `executeAction()`, clean up all-in players from the queue:

1. Check if current actor is all-in → remove them, don't adjust index (it now points to next player)
2. Remove any other all-in players from queue
3. If index is now out of bounds, reset to 0

This ensures:
- All-in players are removed from the queue
- The index always points to a valid player
- No players act when they shouldn't

## Code Changes

**src/game-engine/GameEngine.ts:**

1. **executeCall()**: Simplified to just mark player as all-in, no queue manipulation

2. **executeAction()**: Added queue cleanup after `advanceActor()`:
   ```typescript
   // After advancing, check if any players went all-in
   const currentActor = updatedGameState.actionQueue[updatedGameState.currentActorIndex];
   if (currentActor) {
     const currentPlayer = this.pokerState.getPlayer(currentActor);
     if (currentPlayer && currentPlayer.isAllIn) {
       // Remove current all-in player
       const newQueue = updatedGameState.actionQueue.filter(id => id !== currentActor);
       this.pokerState.setActionQueue(newQueue);
     }
   }
   
   // Remove any other all-in players
   const cleanedQueue = finalGameState.actionQueue.filter(id => {
     const p = this.pokerState.getPlayer(id);
     return p && !p.isAllIn;
   });
   ```

## Expected Behavior After Fix

When AI 1 calls all-in:
1. Queue: `['AI 1', 'AI 4']`, index: 0
2. AI 1 calls, marked as all-in
3. `advanceActor()` → index: 1
4. Clean queue → remove AI 1 → Queue: `['AI 4']`
5. Index 1 is out of bounds, but current actor was AI 1 (all-in), so we removed them
6. Index stays at 1, but queue length is 1, so we reset to 0
7. Final: Queue: `['AI 4']`, index: 0 ✓ CORRECT

## Testing

Run the game and go all-in. Check that:
1. Game doesn't get stuck
2. Only non-all-in players remain in the action queue
3. Actor index is always valid (< queue.length)
4. All players act exactly once per betting round (unless queue is rebuilt by a raise)

## Files Modified
- `src/game-engine/GameEngine.ts` - Fixed all-in queue management in `executeCall()` and `executeAction()`
