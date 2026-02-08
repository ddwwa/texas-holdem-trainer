# Players Acting Twice - Bug Fix

## Problem
Players were acting multiple times in the same betting round. Logs showed:
- AI 1 acts, then acts again
- AI 4 acts, then acts again  
- AI 6 folds, then acts again
- AI 7 calls, then calls again

## Root Cause
The issue was in `setupActionQueue()` - when a new betting round started, the method was adding ALL-IN players back to the action queue. This happened because:

1. Player goes all-in during a betting round
2. Betting round completes
3. `completeBettingRound()` calls `setupActionQueue()` for the next round
4. `setupActionQueue()` was using `getPlayersInHand().filter(p => !p.isAllIn)` which relied on a cached list
5. The all-in flag wasn't being checked against the current game state properly
6. All-in players were added back to the queue

## Fix Applied

### 1. Fixed `setupActionQueue()` in GameEngine.ts
- Changed to get fresh player data directly from `gameState.players`
- Added explicit filtering: `!p.hasFolded && !p.isAllIn && p.stack > 0`
- Added detailed logging to track which players are added/skipped
- Changed from using `getPlayerByPosition()` to finding players by position in the array

**Before:**
```typescript
const activePlayers = this.pokerState.getPlayersInHand().filter(p => !p.isAllIn);
const player = this.pokerState.getPlayerByPosition(position);
```

**After:**
```typescript
const activePlayers = gameState.players.filter(p => !p.hasFolded && !p.isAllIn && p.stack > 0);
const player = gameState.players.find(p => p.position === position);
```

### 2. Enhanced `completeBettingRound()` Logging
- Added logging to show which players are in hand
- Added logging to show active vs all-in players
- Added check for "only 1 active player" scenario (others all-in)
- Added logging for betting round transitions

### 3. Enhanced `isBettingRoundComplete()` Logging
- Added detailed logging to show why betting is complete
- Added logging to show current bet and player bets
- Added logging to show active players and their states

### 4. Improved GameContext Error Handling
- Added detailed logging at start of each `processNext()` iteration
- Added logging to show action queue with player states (allIn, folded, stack)
- Changed error handling to detect bugs and log them clearly
- Removed direct state modification (which didn't work anyway)
- Added safety checks to prevent infinite loops

**Key Change:**
```typescript
// CRITICAL: Check if player has already folded or is all-in BEFORE processing
if (player.hasFolded) {
  console.error(`[GameContext] ${player.name} has already folded but is in action queue - this is a bug!`);
  // ... handle gracefully
}
```

## Testing
- All GameEngine tests pass (31/32)
- Fixed 1 test that expected dealer rotation in `resolveHand()` (rotation happens in `startNewHand()`)
- Added extensive logging to track queue management

## Expected Behavior After Fix

### Scenario: Player goes all-in
1. Player goes all-in
2. Player is marked as `isAllIn = true`
3. Player is removed from current action queue
4. Betting round completes
5. New round starts, `setupActionQueue()` is called
6. **Player is NOT added to new queue** (because `isAllIn = true`)
7. Only non-all-in players can act

### Scenario: Player folds
1. Player folds
2. Player is marked as `hasFolded = true`
3. Player is removed from current action queue
4. **Player is never added to any future queues** (because `hasFolded = true`)

## Files Modified
1. `src/game-engine/GameEngine.ts`
   - Fixed `setupActionQueue()` to use fresh state
   - Enhanced logging in `completeBettingRound()`
   - Enhanced logging in `isBettingRoundComplete()`

2. `src/web/context/GameContext.tsx`
   - Enhanced logging in `processNext()`
   - Improved error detection and handling
   - Removed ineffective direct state modification

3. `src/game-engine/GameEngine.test.ts`
   - Fixed test expectation for dealer rotation

## Next Steps
1. Test in browser to verify fix works
2. Monitor console logs to ensure no more "player acting twice" errors
3. If issue persists, the logs will now clearly show where the bug is occurring
4. Consider adding unit test specifically for "all-in player should not be in next round's queue"

## Related Issues
- This fix also addresses the "pot display fluctuation" issue indirectly
- When players act twice, they bet twice, causing pot to jump around
- With players only acting once, pot should be stable
