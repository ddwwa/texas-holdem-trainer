# Bet vs Raise Button Logic Fix

## Problem

When another player bet and then folded, leaving you as the only player in the queue, the UI showed a "Bet" button instead of a "Raise" button. Clicking "Bet" resulted in the error:

```
Action failed: Cannot bet. There is already a bet. Use RAISE instead
```

## Root Cause

The button logic was using `canCheck` (which is `amountToCall === 0`) to determine whether to show BET or RAISE buttons:

```typescript
// OLD LOGIC (WRONG)
const canCheck = amountToCall === 0;

{canCheck && <BetButton />}        // Show BET if you've matched the bet
{canRaise && !canCheck && <RaiseButton />}  // Show RAISE if you haven't matched
```

The problem: `amountToCall` is calculated as `gameState.currentBet - player.currentBet`. If you've already matched the current bet (e.g., you called earlier), then `amountToCall === 0`, so `canCheck` is true, and the BET button shows.

But if someone bet earlier in the round (even if they folded), `gameState.currentBet > 0`, so you can't BET - you must RAISE!

## Solution

Changed the logic to check `gameState.currentBet` directly:

```typescript
// NEW LOGIC (CORRECT)
const noBetYet = gameState.currentBet === 0; // No one has bet this round
const canBet = noBetYet && player.stack > 0; // Can only BET if no bet exists
const canRaise = !noBetYet && player.stack > amountToCall; // Can only RAISE if bet exists

{canBet && <BetButton />}    // Show BET only if no bet on table
{canRaise && <RaiseButton />} // Show RAISE if there's a bet on table
```

## Key Insight

- **BET**: Only available when `gameState.currentBet === 0` (no one has bet this round)
- **RAISE**: Only available when `gameState.currentBet > 0` (someone has bet)
- **CHECK**: Available when `amountToCall === 0` (you've matched the current bet)
- **CALL**: Available when `amountToCall > 0` (you need to match a bet)

These are mutually exclusive:
- If `currentBet === 0`: You can CHECK or BET
- If `currentBet > 0`: You can CALL, RAISE, or FOLD

## Files Modified

- `src/web/components/ActionButtons.tsx` - Fixed button display logic

## Testing

Test scenarios:
- [x] No bet yet → CHECK and BET buttons show
- [x] Someone bets → CALL and RAISE buttons show
- [x] You call, someone raises → CALL and RAISE buttons show
- [x] Someone bets then folds → RAISE button shows (not BET)
- [x] Everyone checks → CHECK button shows next round
