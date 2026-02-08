# Bug Fixes Summary

## Issues Fixed

### 1. Action Queue Index Management Bug
**Problem**: After a player folded, the action queue would return to a player who had already acted instead of advancing to the next player.

**Root Cause**: In `GameEngine.executeFold()`, when the current actor folded, the index wasn't being explicitly set, causing it to default to an incorrect value.

**Fix**: Modified `executeFold()` to explicitly set the actor index when the current player folds:
```typescript
if (foldingPlayerIndex === currentIndex) {
  if (currentIndex >= newQueue.length) {
    if (newQueue.length > 0) {
      this.pokerState.resetActorIndex();
    }
  } else {
    // Index is valid, explicitly set it to maintain position
    this.pokerState.setActorIndex(currentIndex);
  }
}
```

**File**: `src/game-engine/GameEngine.ts`

---

### 2. AI Raise Amount Calculation Bug
**Problem**: AI players were calculating raise amounts incorrectly, leading to invalid raises that didn't meet minimum raise requirements.

**Root Cause**: AI was calculating a raise size but not ensuring it met the minimum raise requirement (`currentBet + minimumRaise`).

**Fix**: Updated all AI strategies to calculate the total bet amount correctly:
```typescript
const raiseSize = Math.floor(potSize * 0.65);
const totalBet = player.currentBet + amountToCall + raiseSize;
const minRaise = gameState.currentBet + gameState.minimumRaise;

if (totalBet >= minRaise && totalBet <= player.currentBet + player.stack) {
  return { type: ActionType.RAISE, amount: totalBet };
}
```

**Files**: `src/ai-player/AIPlayer.ts` (all three strategies)

---

### 3. AI Bet vs Raise Confusion
**Problem**: AI was trying to RAISE when there was no current bet (should use BET instead).

**Root Cause**: AI logic didn't distinguish between situations where there's a bet to call vs no bet.

**Fix**: Added conditional logic to use BET when `amountToCall === 0` and RAISE otherwise:
```typescript
if (handStrength > 0.7) {
  if (amountToCall === 0) {
    // No current bet - use BET action
    const betAmount = Math.min(Math.floor(potSize * 0.65), player.stack);
    if (betAmount > 0 && betAmount <= player.stack) {
      return { type: ActionType.BET, amount: betAmount };
    }
    return { type: ActionType.CHECK };
  } else {
    // There's a bet to call - use RAISE action
    // ... raise logic
  }
}
```

**Files**: `src/ai-player/AIPlayer.ts` (all three strategies)

---

### 4. AI Folding When Should Check
**Problem**: AI was trying to FOLD when `amountToCall === 0`, which is invalid (must CHECK instead).

**Root Cause**: When hand strength was below the play threshold, AI would return FOLD without checking if there was actually a bet to fold to.

**Fix**: Added check to return CHECK instead of FOLD when there's no bet:
```typescript
if (handStrength < playThreshold) {
  // Can't fold when there's no bet - must check
  if (amountToCall === 0) {
    return { type: ActionType.CHECK };
  }
  return { type: ActionType.FOLD };
}
```

**Files**: `src/ai-player/AIPlayer.ts` (all three strategies)

---

## Verification

### Action Queue Order (Preflop)
✓ AI 3 (UTG) acts first
✓ AI 4, 5, 6, 7 act in order
✓ You (Dealer) acts
✓ AI 1 (Small Blind) acts
✓ AI 2 (Big Blind) acts last

### Test Results
- All 396 tests passing
- 12 test suites passing
- No regressions introduced

### Demo Tests
- `simple-demo.ts` - Runs complete hand successfully
- `test-action-queue.ts` - Verifies correct action order
- `test-fold-sequence.ts` - Verifies fold handling
- `debug-bb-check.ts` - Verifies big blind can check

## Files Modified
1. `src/game-engine/GameEngine.ts` - Fixed action queue index management
2. `src/ai-player/AIPlayer.ts` - Fixed AI decision logic (4 separate issues)

## Impact
- Game now runs smoothly without getting stuck
- AI makes valid decisions in all scenarios
- Action queue maintains correct order through folds and raises
- All players act in the correct sequence
