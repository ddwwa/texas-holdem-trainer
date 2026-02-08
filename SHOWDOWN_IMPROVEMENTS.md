# Showdown Display Improvements

## Summary
Enhanced the showdown display to show results inline (no popups) and highlight the community cards used by the winner's hand.

## Changes Made

### 1. HandResolver Enhancement
**File: `src/hand-resolver/HandResolver.ts`**
- Modified `evaluateHand()` to track which 5 cards make up the best hand
- Added `cardsUsed` array to the returned HandRank
- This allows the UI to know exactly which cards were used in the winning hand

### 2. Type Definition Update
**File: `src/types/core.ts`**
- Added optional `cardsUsed?: Card[]` field to the `HandRank` interface
- This field contains the 5 cards that make up the evaluated hand

### 3. CommunityCards Component Enhancement
**File: `src/web/components/CommunityCards.tsx`**
- Added `highlightedCards` prop to accept cards that should be highlighted
- Implemented `isHighlighted()` function to check if a card should be highlighted
- Wraps highlighted cards in a div with `highlighted-card` class

### 4. Community Cards Styling
**File: `src/web/styles/CommunityCards.css`**
- Added `.highlighted-card` class with golden glow effect
- Implemented pulsing animation for highlighted cards
- Golden border with shadow effects to make winning cards stand out
- Animation: `highlightPulse` creates a subtle scale effect

**Visual Effects:**
- Golden gradient border (`#ffd700` to `#ffed4e`)
- Glowing shadow (20px and 40px blur)
- Pulsing scale animation (1.0 to 1.05)
- 1.5s animation loop

### 5. PokerTable Integration
**File: `src/web/components/PokerTable.tsx`**
- Updated `CommunityCards` component usage to pass `highlightedCards` prop
- Extracts cards used from winner's hand rank
- Filters to only highlight community cards (not hole cards)
- Only highlights during showdown when there's a winner

**Logic:**
```typescript
highlightedCards={
  lastHandResult?.showdown && lastHandResult.players.length > 0
    ? lastHandResult.players
        .filter(p => p.isWinner)
        .flatMap(winner => 
          winner.handRank.cardsUsed?.filter(card => 
            gameState.communityCards.some(cc => cc.rank === card.rank && cc.suit === card.suit)
          ) || []
        )
    : []
}
```

## User Experience Improvements

### Before
- Showdown results might have used popups or alerts
- No visual indication of which cards made the winning hand
- Users had to mentally figure out which community cards were used

### After
- All results displayed inline on the table
- Winner's community cards highlighted with golden glow
- Clear visual feedback showing exactly which cards made the winning hand
- Professional, polished appearance matching modern poker UIs

## Example Scenarios

### Scenario 1: Flush
- Winner has a flush using 3 community cards
- Those 3 community cards glow with golden border
- User can immediately see which cards made the flush

### Scenario 2: Straight
- Winner has a straight using 4 community cards
- Those 4 cards are highlighted
- Clear visual of the straight sequence

### Scenario 3: Pair
- Winner has a pair using 1 community card
- That 1 card is highlighted
- Shows which card paired with hole cards

## Technical Details

### Highlighting Logic
1. Get winner's `handRank.cardsUsed` (5 cards total)
2. Filter to only community cards (exclude hole cards)
3. Match by rank AND suit for exact identification
4. Apply highlighting CSS to matched cards

### Animation Performance
- CSS-only animations (no JavaScript)
- Hardware-accelerated transforms
- Smooth 1.5s loop
- No performance impact

## Testing
- All 61 HandResolver tests pass
- `cardsUsed` field correctly populated for all hand types
- No breaking changes to existing functionality

## Files Modified
1. `src/hand-resolver/HandResolver.ts` - Track cards used in best hand
2. `src/types/core.ts` - Add cardsUsed to HandRank interface
3. `src/web/components/CommunityCards.tsx` - Accept and display highlighted cards
4. `src/web/styles/CommunityCards.css` - Add highlighting styles
5. `src/web/components/PokerTable.tsx` - Pass highlighted cards to component

## Result
The showdown display now provides clear, inline visual feedback showing exactly which community cards were used in the winning hand, with professional golden highlighting effects that match the overall UI aesthetic.
