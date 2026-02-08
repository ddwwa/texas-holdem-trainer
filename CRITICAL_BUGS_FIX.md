# Critical Bugs Fix - Pot Display and Player Acting Twice

## Bug 1: Pot Shows 0 (React State Mutation)

### Problem
Logs showed:
```
[GameContext] After AI 5 FOLD: pot = 0, pots array: [{…}]
[GameEngine] getGameState: returning state with pot total = 94, pots: [{…}]
```

GameEngine correctly returns pot = 94, but GameContext calculates pot = 0 from the same pots array!

### Root Cause
`PotManager.getPots()` returns the actual pots array with a spread operator `[...this.pots]`, which creates a shallow copy. The pot objects themselves are still references to the original objects.

When React state is set with this array, and then PotManager modifies the pot amounts (e.g., during `addToPot()`), the React state's pots array is also modified because they share the same pot object references.

This causes:
1. GameEngine reads fresh pot data: pot = 94
2. React state has stale/mutated pot data: pot = 0
3. UI displays the stale data

### Fix
Changed `getGameState()` to create a **deep copy** of the pots array:

```typescript
// Before (shallow copy - BAD)
state.pots = this.potManager.getPots();

// After (deep copy - GOOD)
const pots = this.potManager.getPots();
state.pots = pots.map(pot => ({
  amount: pot.amount,
  eligiblePlayers: [...pot.eligiblePlayers],
  isMainPot: pot.isMainPot
}));
```

Now each pot object is a new object, preventing mutations from affecting React state.

## Bug 2: Player Acts Twice After Someone Folds

### Problem
Logs showed:
```
Queue: ['You', 'AI 1', 'AI 4', 'AI 5'], index = 3 (AI 5's turn)
AI 5 folds
Queue: ['You', 'AI 1', 'AI 4'], index = 0 (You act again!)
```

After AI 5 folded, the index was reset to 0, causing "You" to act again even though you already called.

### Root Cause
In `executeFold()`, when the current actor folds:
1. Player is removed from queue
2. Index becomes out of bounds (3 >= 3)
3. Code called `resetActorIndex()` which sets index to 0
4. This puts the first player back in action

The correct behavior is to leave the index out of bounds, which triggers `isBettingRoundComplete()`.

### Fix
Removed the `resetActorIndex()` call when the current actor folds and index goes out of bounds:

```typescript
// Before
if (currentIndex >= newQueue.length) {
  if (newQueue.length > 0) {
    this.pokerState.resetActorIndex(); // BAD - resets to 0
  }
}

// After
if (currentIndex >= newQueue.length) {
  // Index is out of bounds, which is correct - betting round will complete
  console.log(`Index ${currentIndex} >= queue length ${newQueue.length}, betting round should complete`);
}
```

Now when a player folds and the index goes out of bounds, it stays out of bounds, triggering the betting round to complete properly.

## Testing

### Test Case 1: Pot Display
1. Start a hand
2. Players bet/raise
3. Someone folds
4. **Expected**: Pot should stay the same or increase, never go to 0
5. **Before fix**: Pot would show 0 after fold
6. **After fix**: Pot displays correctly

### Test Case 2: Player Acting Twice
1. You call
2. Everyone else calls
3. Last player folds
4. **Expected**: Betting round completes, next round starts
5. **Before fix**: You would get another turn to act
6. **After fix**: Betting round completes correctly

## Files Modified
1. `src/game-engine/GameEngine.ts`
   - `getGameState()`: Deep copy pots array
   - `executeFold()`: Don't reset index when out of bounds, added logging

## Impact
These were critical bugs that made the game unplayable:
- Pot showing 0 confused players about game state
- Players acting twice broke the fundamental game flow

Both are now fixed with proper state management and index handling.
