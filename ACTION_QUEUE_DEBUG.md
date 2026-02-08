# Action Queue Bug - Debugging

## Problem
Players are acting multiple times in the same betting round. From the logs:
- AI 6 acts twice (FOLD both times)
- AI 7 acts twice (CALL both times)  
- AI 1 acts multiple times
- AI 4 acts multiple times

## Hypothesis
The action queue is being corrupted when it's rebuilt after aggressive actions (BET/RAISE). Players who have already acted are being added back to the queue incorrectly.

## Debugging Approach

### Added Logging
Added detailed console logging to `GameEngine.ts`:

1. **In `executeAction`:**
   - Log player name and action type
   - Log current action queue (with player names)
   - Log current actor index
   - Log whether we should advance to next player
   - Log queue and index after action

2. **In `rebuildActionQueueAfterAggression`:**
   - Log when queue is being rebuilt
   - Log current bet amount
   - Log each player being checked (with their state)
   - Log which players are added to the new queue
   - Log the final new queue

### What to Look For

When you run the game again, look for these patterns in the console:

1. **Queue Rebuilding:**
   - After a RAISE, you should see `[GameEngine] Rebuilding queue after aggression`
   - Check if the new queue contains only players who need to act
   - Verify that players who have already matched the bet are NOT in the queue

2. **Duplicate Actions:**
   - If a player acts twice, check the queue before each action
   - See if they were removed and then re-added
   - Check if the actor index is being managed correctly

3. **Index Management:**
   - After FOLD: index should be adjusted (player removed from queue)
   - After BET/RAISE: index should be reset to 0 (queue rebuilt)
   - After CHECK/CALL: index should advance by 1

## Potential Root Causes

### Theory 1: Queue Rebuild Logic
The `rebuildActionQueueAfterAggression` method might be adding players incorrectly. It checks:
```typescript
player.currentBet < gameState.currentBet
```

This should work, but timing might be an issue. If the bet is updated before the queue is rebuilt, players who just called might be added back.

### Theory 2: Index Management
After rebuilding the queue, we call `resetActorIndex()` which sets index to 0. But if there's a race condition or the queue is rebuilt multiple times, the index might point to the wrong player.

### Theory 3: CALL + All-In
When a player calls and goes all-in, they're removed from the queue. But the index adjustment might be wrong, causing the next player to be skipped or the same player to act again.

## Next Steps

1. **Run the game** and collect the detailed logs
2. **Analyze the logs** to see exactly when players are added to the queue
3. **Identify the pattern** - is it after specific actions? Specific betting sequences?
4. **Fix the root cause** based on the evidence

## Expected Behavior

After a RAISE by AI 1:
- Queue should contain: [AI 2, AI 3, AI 4, AI 5, AI 6, AI 7, Player]
- (Excluding AI 1 who raised, and any folded/all-in players)
- Index should be 0 (pointing to AI 2)

After AI 2 folds:
- Queue should contain: [AI 3, AI 4, AI 5, AI 6, AI 7, Player]
- Index should be 0 (pointing to AI 3)

After AI 3 calls:
- Queue should contain: [AI 3, AI 4, AI 5, AI 6, AI 7, Player]
- Index should be 1 (pointing to AI 4)

If AI 4 raises:
- Queue should be rebuilt: [AI 5, AI 6, AI 7, Player, AI 3]
- (Excluding AI 4 who raised, AI 2 who folded)
- (AI 3 is included because they need to act on the raise)
- Index should be 0 (pointing to AI 5)

## Files Modified
- `src/game-engine/GameEngine.ts` - Added detailed logging to `executeAction` and `rebuildActionQueueAfterAggression`
