import * as fc from 'fast-check';
import {
  Rank,
  Suit,
  ActionType,
  BettingRound,
  HandCategory,
  Card,
  Player,
  GameState,
  Pot
} from './index';

describe('Core Data Models', () => {
  describe('Type Definitions', () => {
    it('should create a valid Card', () => {
      const card: Card = {
        rank: Rank.ACE,
        suit: Suit.SPADES
      };
      
      expect(card.rank).toBe(Rank.ACE);
      expect(card.suit).toBe(Suit.SPADES);
    });

    it('should create a valid Player', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        stack: 1000,
        holeCards: [],
        position: 0,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
        isAI: false
      };
      
      expect(player.id).toBe('player1');
      expect(player.stack).toBe(1000);
      expect(player.isAI).toBe(false);
    });

    it('should create a valid Pot', () => {
      const pot: Pot = {
        amount: 100,
        eligiblePlayers: ['player1', 'player2'],
        isMainPot: true
      };
      
      expect(pot.amount).toBe(100);
      expect(pot.eligiblePlayers).toHaveLength(2);
      expect(pot.isMainPot).toBe(true);
    });
  });

  describe('Enums', () => {
    it('should have all Rank values', () => {
      const ranks = Object.values(Rank);
      expect(ranks).toHaveLength(13);
      expect(ranks).toContain(Rank.ACE);
      expect(ranks).toContain(Rank.TWO);
      expect(ranks).toContain(Rank.KING);
    });

    it('should have all Suit values', () => {
      const suits = Object.values(Suit);
      expect(suits).toHaveLength(4);
      expect(suits).toContain(Suit.HEARTS);
      expect(suits).toContain(Suit.DIAMONDS);
      expect(suits).toContain(Suit.CLUBS);
      expect(suits).toContain(Suit.SPADES);
    });

    it('should have all ActionType values', () => {
      const actions = Object.values(ActionType);
      expect(actions).toHaveLength(6);
      expect(actions).toContain(ActionType.FOLD);
      expect(actions).toContain(ActionType.CHECK);
      expect(actions).toContain(ActionType.CALL);
      expect(actions).toContain(ActionType.BET);
      expect(actions).toContain(ActionType.RAISE);
      expect(actions).toContain(ActionType.ALL_IN);
    });

    it('should have all BettingRound values', () => {
      const rounds = Object.values(BettingRound);
      expect(rounds).toHaveLength(4);
      expect(rounds).toContain(BettingRound.PREFLOP);
      expect(rounds).toContain(BettingRound.FLOP);
      expect(rounds).toContain(BettingRound.TURN);
      expect(rounds).toContain(BettingRound.RIVER);
    });

    it('should have all HandCategory values', () => {
      const categories = Object.values(HandCategory);
      expect(categories).toHaveLength(10);
      expect(categories).toContain(HandCategory.HIGH_CARD);
      expect(categories).toContain(HandCategory.ROYAL_FLUSH);
    });
  });

  describe('Property 24: Game state completeness', () => {
    /**
     * **Validates: Requirements 8.1-8.7, 6.4**
     * 
     * Property: For any game state, it should contain all necessary information:
     * - Player stacks (8.1)
     * - Positions (8.2)
     * - Dealer button (8.3)
     * - Betting round (8.4)
     * - Community cards (8.5)
     * - Current bet (8.6)
     * - Folded status for each player (8.7)
     * - Pot size (6.4)
     */
    it('property: game state contains all required fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // handNumber
          fc.integer({ min: 0, max: 7 }), // dealerPosition
          fc.constantFrom(...Object.values(BettingRound)), // bettingRound
          fc.integer({ min: 0, max: 1000 }), // currentBet
          (handNumber, dealerPosition, bettingRound, currentBet) => {
            // Create a minimal valid game state
            const gameState: GameState = {
              handNumber,
              dealerPosition,
              smallBlindPosition: (dealerPosition + 1) % 8,
              bigBlindPosition: (dealerPosition + 2) % 8,
              players: Array.from({ length: 8 }, (_, i) => ({
                id: `player${i}`,
                name: `Player ${i}`,
                stack: 1000,
                holeCards: [],
                position: i,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: i > 0
              })),
              communityCards: [],
              pots: [{
                amount: 0,
                eligiblePlayers: [],
                isMainPot: true
              }],
              currentBettingRound: bettingRound,
              currentBet,
              minimumRaise: currentBet,
              actionQueue: [],
              currentActorIndex: 0
            };

            // Verify all required fields are present
            // Requirement 8.1: Player stacks
            expect(gameState.players).toBeDefined();
            expect(gameState.players.length).toBe(8);
            gameState.players.forEach(player => {
              expect(player.stack).toBeDefined();
              expect(typeof player.stack).toBe('number');
            });

            // Requirement 8.2: Player positions
            gameState.players.forEach(player => {
              expect(player.position).toBeDefined();
              expect(typeof player.position).toBe('number');
              expect(player.position).toBeGreaterThanOrEqual(0);
              expect(player.position).toBeLessThan(8);
            });

            // Requirement 8.3: Dealer button
            expect(gameState.dealerPosition).toBeDefined();
            expect(typeof gameState.dealerPosition).toBe('number');
            expect(gameState.dealerPosition).toBeGreaterThanOrEqual(0);
            expect(gameState.dealerPosition).toBeLessThan(8);

            // Requirement 8.4: Betting round
            expect(gameState.currentBettingRound).toBeDefined();
            expect(Object.values(BettingRound)).toContain(gameState.currentBettingRound);

            // Requirement 8.5: Community cards
            expect(gameState.communityCards).toBeDefined();
            expect(Array.isArray(gameState.communityCards)).toBe(true);

            // Requirement 8.6: Current bet
            expect(gameState.currentBet).toBeDefined();
            expect(typeof gameState.currentBet).toBe('number');
            expect(gameState.currentBet).toBeGreaterThanOrEqual(0);

            // Requirement 8.7: Folded status
            gameState.players.forEach(player => {
              expect(player.hasFolded).toBeDefined();
              expect(typeof player.hasFolded).toBe('boolean');
            });

            // Requirement 6.4: Pot size
            expect(gameState.pots).toBeDefined();
            expect(Array.isArray(gameState.pots)).toBe(true);
            expect(gameState.pots.length).toBeGreaterThan(0);
            gameState.pots.forEach(pot => {
              expect(pot.amount).toBeDefined();
              expect(typeof pot.amount).toBe('number');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
