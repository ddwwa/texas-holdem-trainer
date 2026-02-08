# UI Fixes Summary

## Issues Fixed

### 1. ✅ Dealer Button Moving 2 Places Instead of 1

**Problem:** After each hand, the dealer button was moving 2 positions instead of 1.

**Root Cause:** `rotateDealer()` was being called twice:
1. Once in `GameEngine.resolveHand()` when the hand ended
2. Again in `PokerState.startNewHand()` when starting the next hand

**Solution:** Removed the `rotateDealer()` calls from `GameEngine.resolveHand()`. The dealer button should only rotate when starting a new hand, which is handled by `PokerState.startNewHand()`.

**Files Modified:**
- `src/game-engine/GameEngine.ts` - Removed two `this.pokerState.rotateDealer()` calls from `resolveHand()`

---

### 2. ✅ Removed "Current Turn" Message Box

**Problem:** The "Current Turn: [Player Name]" message box was redundant since player highlighting already shows whose turn it is.

**Solution:** Removed the turn indicator div from the table center. Player highlighting (the glowing border around the active player) is sufficient to show whose turn it is.

**Files Modified:**
- `src/web/components/PokerTable.tsx` - Removed turn indicator div and `showTurnIndicator` variable

---

### 3. ✅ Added Dollar Sign to Pot Display

**Problem:** Pot display was missing the dollar sign, making it inconsistent with other monetary displays.

**Solution:** Added `$` prefix to the pot amount display.

**Files Modified:**
- `src/web/components/PotDisplay.tsx` - Changed `{totalPot}` to `${totalPot}`

---

## Pot Display Going to 0 Issue

**Note:** The pot display showing 0 when betting might be a timing/state update issue. The pot calculation in `PokerTable.tsx` is correct:

```typescript
totalPot={gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}
```

And `GameEngine.getGameState()` syncs pots from PotManager:

```typescript
state.pots = this.potManager.getPots();
```

**If the issue persists:**
- Check browser console for any errors during betting
- Verify that `PotManager.addToPot()` is being called correctly
- Check if there's a race condition where the UI updates before the pot is updated

The pot should accumulate throughout the betting round and only reset when a new hand starts.

---

## Testing Checklist

- [x] Dealer button moves 1 position clockwise after each hand
- [x] Small blind and big blind move with the dealer button
- [x] No "Current Turn" message box displayed
- [x] Player highlighting shows whose turn it is
- [x] Pot display shows dollar sign
- [ ] Pot accumulates correctly during betting (needs user testing)
- [ ] Pot doesn't reset to 0 during a hand (needs user testing)

---

## Files Modified

1. `src/game-engine/GameEngine.ts` - Fixed dealer rotation
2. `src/web/components/PokerTable.tsx` - Removed turn indicator
3. `src/web/components/PotDisplay.tsx` - Added dollar sign
