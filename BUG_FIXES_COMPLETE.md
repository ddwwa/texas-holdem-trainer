# Bug Fixes Complete

## Summary
Fixed two critical bugs in the poker game:
1. **Pot display showing $0** - Fixed by ensuring GameEngine always returns synced pot state
2. **Player acting twice after fold** - Fixed by preventing automatic index reset in setActionQueue()

## Bug 1: Pot Display Showing $0

### Root Cause
The `executeAction()` method in GameEngine was returning `this.pokerState.getGameState()` directly, which didn't include the synced pots from PotManager. The pots were only synced when calling the public `getGameState()` method.

### Symptoms
- Browser console logs showed: `[GameEngine] getGameState: returning state with pot total = 94` but `[GameContext] After AI 5 FOLD: pot = 0`
- GameEngine had correct pot values, but GameContext calculated 0 from the pots array
- This was a state synchronization issue - the pots array objects existed but had amount = 0

### Fix
Changed `executeAction()` to return `this.getGameState()` instead of `this.pokerState.getGameState()`:

**File: src/game-engine/GameEngine.ts**
```typescript
// Before:
return {
  success: true,
  gameState: this.pokerState.getGameState()
};

// After:
return {
  success: true,
  gameState: this.getGameState()  // This syncs pots from PotManager
};
```

Also fixed error return paths to use `this.getGameState()`.

### Impact
- Pot display now always shows correct values
- No more $0 pot displays during gameplay
- All 32 GameEngine tests pass

## Bug 2: Player Acting Twice After Fold

### Root Cause
The `setActionQueue()` method in PokerState was automatically resetting the actor index to 0 every time it was called. This caused issues when:
1. A player folds and is removed from the queue
2. `setActionQueue()` is called with the new queue
3. The index is reset to 0, even though we carefully calculated the correct index in `executeFold()`

### Symptoms
- User logs showed: "I called then everyone call then I got another chance to act"
- After AI 5 folded at index 3, the queue became ['You', 'AI 1', 'AI 4'] and index reset to 0
- This caused 'You' (at index 0) to act again even if they had already acted

### Fix
Removed automatic index reset from `setActionQueue()` and added explicit `resetActorIndex()` calls where appropriate:

**File: src/poker-state/PokerState.ts**
```typescript
// Before:
setActionQueue(playerIds: string[]): void {
  this.gameState.actionQueue = [...playerIds];
  this.gameState.currentActorIndex = 0;  // REMOVED THIS
}

// After:
setActionQueue(playerIds: string[]): void {
  this.gameState.actionQueue = [...playerIds];
  // Don't reset index here - let the caller manage the index
}
```

**File: src/game-engine/GameEngine.ts**
Added explicit `resetActorIndex()` calls in:
- `setupActionQueue()` - when starting a new betting round
- `executeBet()` - after rebuilding queue (already had this)
- `executeRaise()` - after rebuilding queue (already had this)
- `executeAllIn()` - after rebuilding queue for raise all-in (already had this)
- `resolveHand()` - when clearing queue at end of hand

**File: src/poker-state/PokerState.test.ts**
Updated tests to explicitly call `resetActorIndex()` after `setActionQueue()`.

### Impact
- Players no longer act twice in the same betting round
- Index management is now explicit and controlled
- The `executeFold()` logic correctly adjusts the index based on where the fold happened
- All 67 PokerState tests pass
- All 32 GameEngine tests pass

## Testing
All tests pass:
- PokerState: 67/67 tests passing
- GameEngine: 32/32 tests passing

## Files Modified
1. `src/game-engine/GameEngine.ts` - Fixed pot sync and added explicit index resets
2. `src/poker-state/PokerState.ts` - Removed automatic index reset from setActionQueue()
3. `src/poker-state/PokerState.test.ts` - Updated tests to explicitly reset index

## Next Steps
The fixes are complete and tested. The game should now work correctly in the browser:
- Pot display will always show the correct amount
- Players will only act once per betting round (unless a bet/raise requires them to act again)
