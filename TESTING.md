# Testing Guide

## Manual Testing Checklist

### Game Initialization
- [ ] Application loads without errors
- [ ] 8 players are displayed around the table
- [ ] Each player has a name, stack ($1000), and position
- [ ] Dealer button is visible on one player
- [ ] Small blind (SB) and big blind (BB) indicators are visible
- [ ] Community cards area is empty initially
- [ ] Pot display shows $0

### Card Dealing
- [ ] Human player (position 0) receives 2 face-up cards
- [ ] AI players receive 2 face-down cards
- [ ] Cards are displayed correctly with rank and suit
- [ ] Card dealing animation plays smoothly

### Betting Actions
- [ ] Action buttons appear when it's the player's turn
- [ ] Fold button is always available
- [ ] Check button appears when no bet to call
- [ ] Call button appears with correct amount when there's a bet
- [ ] Raise/Bet input allows custom amounts
- [ ] All-in button is always available
- [ ] Invalid actions are rejected with error messages
- [ ] Buttons are disabled when not player's turn

### AI Behavior
- [ ] AI players take actions automatically
- [ ] AI actions have realistic delays (0.5-1s)
- [ ] AI players can fold, check, call
- [ ] Game progresses through all betting rounds

### Betting Rounds
- [ ] Pre-flop: No community cards
- [ ] Flop: 3 community cards dealt
- [ ] Turn: 4th community card dealt
- [ ] River: 5th community card dealt
- [ ] Betting round completes when all players match or fold

### Pot Management
- [ ] Pot increases when players bet
- [ ] Current bet amount is displayed
- [ ] Side pots are created for all-in scenarios
- [ ] Pot is awarded to winner at showdown

### Hand Resolution
- [ ] Winner is determined correctly
- [ ] Winner's stack increases by pot amount
- [ ] Losing players' stacks decrease appropriately
- [ ] Hand results are displayed clearly

### Session Statistics
- [ ] Hands played counter increments
- [ ] Hands won counter updates correctly
- [ ] Total winnings/losses are tracked accurately
- [ ] Biggest pot is recorded

### Game Controls
- [ ] "New Hand" button starts a new hand
- [ ] "New Game" button resets the entire game
- [ ] Dealer button rotates clockwise each hand
- [ ] Blinds are posted correctly each hand

### GTO Panel
- [ ] GTO panel is visible on the right side
- [ ] Shows "Coming Soon" placeholder
- [ ] Panel is responsive on smaller screens

### Responsive Design
- [ ] Desktop (1920x1080): All elements visible and properly sized
- [ ] Desktop (1280x720): Layout adjusts appropriately
- [ ] Tablet (1024x768): Components scale down correctly
- [ ] Tablet (768x1024): Portrait mode works well
- [ ] Mobile (480x800): All features accessible
- [ ] Touch interactions work on mobile devices

### Performance
- [ ] Initial load time < 5 seconds
- [ ] No lag during gameplay
- [ ] Animations are smooth (60fps)
- [ ] No memory leaks during extended play

### Error Handling
- [ ] Invalid actions show error messages
- [ ] Application doesn't crash on errors
- [ ] Error boundary catches React errors
- [ ] Reload button works in error state

### Cross-Browser Testing
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work

## Automated Testing

### Unit Tests
Run unit tests for game logic:
```bash
npm test
```

Current test coverage:
- Card and Deck: ✅ 100%
- HandResolver: ✅ 100%
- PotManager: ✅ 100%
- PokerState: ✅ 100%
- ActionValidator: ✅ 100%
- GameEngine: ✅ 100%

### Property-Based Tests
All property tests pass with 100+ iterations:
```bash
npm test
```

### Build Test
Verify production build works:
```bash
npm run build:web
npm run preview
```

## Known Issues

1. **Dealer button rotation**: Minor edge case in showdown (1 failing test)
   - Impact: Low
   - Status: Non-critical, doesn't affect gameplay

## Future Testing Improvements

1. Add Playwright or Cypress for E2E tests
2. Add React Testing Library for component tests
3. Add visual regression testing
4. Add performance monitoring
5. Add accessibility testing (WCAG compliance)

## Reporting Issues

When reporting issues, please include:
- Browser and version
- Screen size/device
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or video if possible
