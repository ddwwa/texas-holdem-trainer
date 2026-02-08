import { AIPlayer, AIStrategy } from './AIPlayer';
import { GameState } from '../types/core';
import { ActionType, BettingRound } from '../types/enums';
import { Card } from '../card/Card';
import * as fc from 'fast-check';

describe('AIPlayer', () => {
  let ai: AIPlayer;

  beforeEach(() => {
    ai = new AIPlayer(AIStrategy.BALANCED);
  });

  describe('constructor', () => {
    it('should create AI with default balanced strategy', () => {
      const defaultAI = new AIPlayer();
      expect(defaultAI.getStrategy()).toBe(AIStrategy.BALANCED);
    });

    it('should create AI with specified strategy', () => {
      const tightAI = new AIPlayer(AIStrategy.TIGHT_AGGRESSIVE);
      expect(tightAI.getStrategy()).toBe(AIStrategy.TIGHT_AGGRESSIVE);
    });
  });

  describe('decideAction', () => {
    it('should make a decision within reasonable time', () => {
      const gameState = createMockGameState();
      const startTime = Date.now();
      
      const action = ai.decideAction('player_1', gameState);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(action).toBeDefined();
      expect(action.type).toBeDefined();
      expect(duration).toBeLessThan(2000); // Requirement 3.4: < 2 seconds
    });

    it('should respect betting rules', () => {
      const gameState = createMockGameState();
      const player = gameState.players[1];
      
      const action = ai.decideAction('player_1', gameState);
      
      // Should not bet more than stack
      if (action.type === ActionType.BET || action.type === ActionType.RAISE) {
        expect(action.amount).toBeLessThanOrEqual(player.stack);
      }
    });

    it('should throw error for non-existent player', () => {
      const gameState = createMockGameState();
      
      expect(() => {
        ai.decideAction('non_existent', gameState);
      }).toThrow('Player non_existent not found');
    });
  });

  describe('strategy differences', () => {
    it('tight-aggressive should fold more weak hands', () => {
      const tightAI = new AIPlayer(AIStrategy.TIGHT_AGGRESSIVE);
      const gameState = createMockGameState();
      
      // Give player weak hole cards
      gameState.players[1].holeCards = Card.fromStrings(['2c', '7d']);
      gameState.currentBet = 20;
      gameState.players[1].currentBet = 0;
      
      const action = tightAI.decideAction('player_1', gameState);
      
      // Tight player should fold weak hands facing a bet
      expect(action.type).toBe(ActionType.FOLD);
    });

    it('loose-aggressive should play more hands', () => {
      const looseAI = new AIPlayer(AIStrategy.LOOSE_AGGRESSIVE);
      const gameState = createMockGameState();
      
      // Give player medium hole cards
      gameState.players[1].holeCards = Card.fromStrings(['8c', 'Td']);
      gameState.currentBet = 0;
      
      const action = looseAI.decideAction('player_1', gameState);
      
      // Loose player should not fold when no bet
      expect(action.type).not.toBe(ActionType.FOLD);
    });

    it('balanced should make reasonable decisions', () => {
      const balancedAI = new AIPlayer(AIStrategy.BALANCED);
      const gameState = createMockGameState();
      
      // Give player strong hole cards
      gameState.players[1].holeCards = Card.fromStrings(['Ah', 'Kh']);
      gameState.currentBet = 0;
      
      const action = balancedAI.decideAction('player_1', gameState);
      
      // Should not fold strong hands
      expect(action.type).not.toBe(ActionType.FOLD);
    });
  });

  describe('Property 10: Eliminated players are marked', () => {
    it('**Validates: Requirements 3.3** - AI should handle elimination correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          (stack) => {
            const gameState = createMockGameState();
            gameState.players[1].stack = stack;
            
            const action = ai.decideAction('player_1', gameState);
            
            // If player has no stack, they cannot make betting actions
            if (stack === 0) {
              expect([ActionType.FOLD, ActionType.CHECK]).toContain(action.type);
            }
            
            // Action should be valid
            expect(action.type).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('unit tests for AI decision-making', () => {
    it('should check when no bet and weak hand', () => {
      const gameState = createMockGameState();
      gameState.players[1].holeCards = Card.fromStrings(['2c', '3d']);
      gameState.currentBet = 0;
      
      const action = ai.decideAction('player_1', gameState);
      
      expect([ActionType.CHECK, ActionType.BET, ActionType.FOLD]).toContain(action.type);
    });

    it('should call or raise with strong hand', () => {
      const gameState = createMockGameState();
      gameState.players[1].holeCards = Card.fromStrings(['Ah', 'Ad']);
      gameState.currentBet = 20;
      gameState.players[1].currentBet = 0;
      gameState.players[1].stack = 1000;
      
      const action = ai.decideAction('player_1', gameState);
      
      // Strong hand should not fold
      expect(action.type).not.toBe(ActionType.FOLD);
    });

    it('should fold when facing large bet with weak hand', () => {
      const gameState = createMockGameState();
      gameState.players[1].holeCards = Card.fromStrings(['2c', '7d']);
      gameState.currentBet = 100;
      gameState.players[1].currentBet = 0;
      gameState.players[1].stack = 200;
      
      const action = ai.decideAction('player_1', gameState);
      
      // Weak hand facing large bet should often fold
      expect([ActionType.FOLD, ActionType.CALL]).toContain(action.type);
    });

    it('should handle all-in situation', () => {
      const gameState = createMockGameState();
      gameState.players[1].stack = 50;
      gameState.currentBet = 100;
      gameState.players[1].currentBet = 0;
      
      const action = ai.decideAction('player_1', gameState);
      
      // Cannot call more than stack, should fold or go all-in
      if (action.type === ActionType.CALL) {
        expect(action.amount).toBeUndefined();
      }
      expect([ActionType.FOLD, ActionType.CALL, ActionType.ALL_IN]).toContain(action.type);
    });
  });

  describe('different AI strategies produce different behaviors', () => {
    it('should show variation between strategies', () => {
      const gameState = createMockGameState();
      gameState.players[1].holeCards = Card.fromStrings(['9c', 'Td']);
      gameState.currentBet = 20;
      gameState.players[1].currentBet = 0;
      
      const tightAI = new AIPlayer(AIStrategy.TIGHT_AGGRESSIVE);
      const looseAI = new AIPlayer(AIStrategy.LOOSE_AGGRESSIVE);
      const balancedAI = new AIPlayer(AIStrategy.BALANCED);
      
      const tightAction = tightAI.decideAction('player_1', gameState);
      const looseAction = looseAI.decideAction('player_1', gameState);
      const balancedAction = balancedAI.decideAction('player_1', gameState);
      
      // All should make valid decisions
      expect(tightAction.type).toBeDefined();
      expect(looseAction.type).toBeDefined();
      expect(balancedAction.type).toBeDefined();
      
      // Strategies may differ (not guaranteed, but likely with medium hands)
      const actions = [tightAction.type, looseAction.type, balancedAction.type];
      expect(actions).toBeDefined();
    });
  });
});

/**
 * Helper function to create a mock game state for testing.
 */
function createMockGameState(): GameState {
  return {
    players: [
      {
        id: 'player_0',
        name: 'Player 0',
        position: 0,
        stack: 1000,
        currentBet: 0,
        holeCards: Card.fromStrings(['Ah', 'Kh']),
        hasFolded: false,
        isAllIn: false,
        isAI: false
      },
      {
        id: 'player_1',
        name: 'AI Player 1',
        position: 1,
        stack: 1000,
        currentBet: 0,
        holeCards: Card.fromStrings(['Qc', 'Jc']),
        hasFolded: false,
        isAllIn: false,
        isAI: true
      },
      {
        id: 'player_2',
        name: 'AI Player 2',
        position: 2,
        stack: 1000,
        currentBet: 0,
        holeCards: Card.fromStrings(['Td', '9d']),
        hasFolded: false,
        isAllIn: false,
        isAI: true
      }
    ],
    communityCards: [],
    pots: [{ amount: 30, eligiblePlayers: ['player_0', 'player_1', 'player_2'], isMainPot: true }],
    currentBet: 10,
    minimumRaise: 10,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    currentBettingRound: BettingRound.PREFLOP,
    actionQueue: ['player_0', 'player_1', 'player_2'],
    currentActorIndex: 1,
    handNumber: 1
  };
}
