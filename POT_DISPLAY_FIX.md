# Pot Display Showing 0 - Investigation and Fix

## Problem
The pot display sometimes shows $0 during gameplay, even though there should be chips in the pot.

## Investigation

### Potential Causes
1. **State timing issue**: UI renders before pot is updated
2. **Pot reset bug**: Pot being reset when it shouldn't be
3. **Missing pots array**: `gameState.pots` might be undefined temporarily
4. **React state staleness**: Old state being displayed before new state arrives

### Code Analysis

#### How Pots Work
1. `PotManager` maintains an array of `Pot` objects
2. Each pot has an `amount` and `eligiblePlayers`
3. `GameEngine.getGameState()` syncs pots from PotManager: `state.pots = this.potManager.getPots()`
4. `PokerTable` calculates total: `gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)`

#### When Pots Are Modified
1. **`addToPot()`**: Called when player bets/raises/calls - INCREASES pot
2. **`reset()`**: Called at start of new hand - CLEARS pot to 0
3. **`createSidePot()`**: Called when player goes all-in for less - REORGANIZES pots

#### When Player Bets Are Reset
- `resetPlayerBets()` is called in `completeBettingRound()` when advancing to next round
- This resets `player.currentBet` to 0 but should NOT affect pots
- Pots should remain intact across betting rounds

## Fixes Applied

### 1. Added Defensive Check in PokerTable
**Before:**
```typescript
totalPot={gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}
```

**After:**
```typescript
totalPot={gameState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0}
```

This prevents crashes if `pots` is undefined and defaults to 0 instead of crashing.

### 2. Added Logging to PotManager
Added console logs to track:
- When chips are added to pot: `addToPot()`
- When pot is reset: `reset()`
- Current pot total after each operation

### 3. Added Logging to GameContext
Added console logs to track:
- Pot total after each player action
- Pot total when community cards are dealt

## Expected Behavior

### Normal Flow
1. **Hand starts**: Pot = 0
2. **Blinds posted**: Pot = 15 (SB 5 + BB 10)
3. **Player calls**: Pot = 25 (15 + 10)
4. **Player raises to 30**: Pot = 45 (25 + 20)
5. **Betting round completes**: Pot = 45 (unchanged)
6. **Flop dealt**: Pot = 45 (unchanged)
7. **New betting round**: Pot = 45 (unchanged)
8. **Player bets 20**: Pot = 65 (45 + 20)

### When Pot Should Be 0
- Only at the very start of a new hand (after `dealHand()` is called)
- After hand is resolved and before next hand starts

### When Pot Should NEVER Be 0
- During any betting round (after blinds are posted)
- When community cards are dealt
- When players are acting

## Testing Instructions

1. **Start a new game** - Pot should be 0
2. **Blinds are posted** - Pot should be 15 (or whatever blinds are)
3. **Players act** - Pot should increase with each bet/call/raise
4. **Flop is dealt** - Pot should stay the same (not go to 0)
5. **Turn is dealt** - Pot should stay the same (not go to 0)
6. **River is dealt** - Pot should stay the same (not go to 0)
7. **Hand resolves** - Pot goes to winner, then resets to 0 for next hand

## Monitoring

With the added logging, you should see in the console:
```
[PotManager] addToPot: player_1 adds 10, pot 15 -> 25, total: 25
[GameContext] After AI 1 CALL: pot = 25
Community cards changed: 0 -> 3, pot = 25
[PotManager] addToPot: player_2 adds 20, pot 25 -> 45, total: 45
[GameContext] After AI 2 BET: pot = 45
```

If you see pot = 0 when it shouldn't be, the logs will show exactly when and why.

## Possible Root Causes (if issue persists)

### Theory 1: React State Batching
React might be batching state updates, causing the UI to render with an intermediate state where pots haven't been synced yet.

**Solution**: Use `useEffect` to ensure pot display updates after state changes.

### Theory 2: GameManager State Copy
`gameManager.getCurrentGameState()` returns a copy of the state. If the copy is made before pots are synced, it will have stale pot data.

**Solution**: Ensure `getGameState()` is always called AFTER pot operations complete.

### Theory 3: Multiple State Objects
If there are multiple game state objects floating around (old vs new), the UI might be rendering the old one.

**Solution**: Ensure only one source of truth for game state.

## Files Modified
1. `src/pot-manager/PotManager.ts` - Added logging to `addToPot()` and `reset()`
2. `src/web/components/PokerTable.tsx` - Added defensive check for undefined pots
3. `src/web/context/GameContext.tsx` - Added logging for pot tracking

## Next Steps
1. Play a game in the browser
2. Watch the console logs
3. If pot shows 0, check the logs to see:
   - Was `reset()` called unexpectedly?
   - Is the pot actually 0 in PotManager?
   - Or is it just a display/timing issue?
4. Report findings with console logs
