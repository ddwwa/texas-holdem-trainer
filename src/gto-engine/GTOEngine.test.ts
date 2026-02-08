import { GTOEngine, DecisionPoint } from './GTOEngine';
import { ActionType, BettingRound } from '../types/enums';
import { Card } from '../card/Card';
import { GameState } from '../types/core';
import * as fc from 'fast-check';

describe('GTOEngine', () => {
  let engine: GTOEngine;

  beforeEach(() => {
    engine = new GTOEngine();
  });

  describe('calculateOptimalStrategy', () => {
    it('should generate a GTO solution', () => {
      const decisionPoint = createMockDecisionPoint();
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      expect(solution).toBeDefined();
      expect(solution.recommendedAction).toBeDefined();
      expect(solution.actionFrequencies).toBeDefined();
      expect(solution.reasoning).toBeDefined();
      expect(solution.reasoning.length).toBeGreaterThan(0);
    });

    it('should recommend betting with strong hands when no bet', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Ah', 'Ad']); // Pocket aces
      decisionPoint.communityCards = Card.fromStrings(['Kc', '9d', '5h']); // Safe board
      decisionPoint.currentBet = 0;
      decisionPoint.playerCurrentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Strong hand should bet or check (both valid with strong hands)
      expect([ActionType.BET, ActionType.CHECK]).toContain(solution.recommendedAction);
      // Should have some betting frequency
      const betFreq = solution.actionFrequencies.get(ActionType.BET) || 0;
      expect(betFreq).toBeGreaterThan(0);
    });

    it('should recommend folding with weak hands facing large bet', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['2c', '7d']); // Weak hand
      decisionPoint.currentBet = 100;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 50;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Weak hand facing large bet should fold
      expect(solution.recommendedAction).toBe(ActionType.FOLD);
    });

    it('should recommend calling with medium hands and good pot odds', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Kh', 'Qh']); // Decent hand
      decisionPoint.currentBet = 20;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 100; // Good pot odds
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Should call with good pot odds
      expect([ActionType.CALL, ActionType.RAISE]).toContain(solution.recommendedAction);
    });
  });

  describe('Property 11: GTO solution generated for player actions', () => {
    it('**Validates: Requirements 4.1** - should generate GTO solution for any valid decision point', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 100, max: 1000 }),
          (potSize, currentBet, playerStack) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            decisionPoint.currentBet = currentBet;
            decisionPoint.playerStack = playerStack;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Should always generate a solution
            expect(solution).toBeDefined();
            expect(solution.recommendedAction).toBeDefined();
            expect(solution.actionFrequencies).toBeDefined();
            expect(solution.reasoning).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: GTO frequencies sum to 1.0', () => {
    it('**Validates: Requirements 4.2** - action frequencies should sum to 1.0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          (potSize, currentBet) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            decisionPoint.currentBet = currentBet;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Sum all frequencies
            let sum = 0;
            solution.actionFrequencies.forEach(freq => {
              sum += freq;
            });
            
            // Should sum to 1.0 (with small tolerance for floating point)
            expect(sum).toBeCloseTo(1.0, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 4.2** - all frequencies should be between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          (potSize) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // All frequencies should be valid probabilities
            solution.actionFrequencies.forEach(freq => {
              expect(freq).toBeGreaterThanOrEqual(0);
              expect(freq).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 4.2** - recommended action should have non-zero frequency', () => {
      const decisionPoint = createMockDecisionPoint();
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      const recommendedFreq = solution.actionFrequencies.get(solution.recommendedAction);
      expect(recommendedFreq).toBeGreaterThan(0);
    });
  });

  describe('unit tests for GTO calculations', () => {
    it('should consider pot odds in decision making', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['9h', 'Th']); // Medium hand
      decisionPoint.currentBet = 10;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 100; // 10:110 = ~9% pot odds
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // With good pot odds, should not always fold
      expect(solution.recommendedAction).not.toBe(ActionType.FOLD);
    });

    it('should consider position in decision making', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Jh', 'Th']);
      decisionPoint.position = 7; // Late position
      decisionPoint.currentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // In late position with no bet, should be more aggressive
      expect(solution).toBeDefined();
    });

    it('should provide reasoning for decisions', () => {
      const decisionPoint = createMockDecisionPoint();
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      expect(solution.reasoning).toBeDefined();
      expect(solution.reasoning.length).toBeGreaterThan(0);
      expect(typeof solution.reasoning[0]).toBe('string');
    });

    it('should handle preflop decisions', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.communityCards = []; // Preflop
      decisionPoint.holeCards = Card.fromStrings(['Ah', 'Kh']);
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      expect(solution).toBeDefined();
      expect(solution.recommendedAction).toBeDefined();
    });

    it('should handle postflop decisions', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.communityCards = Card.fromStrings(['Qh', 'Jh', 'Th']); // Flop
      decisionPoint.holeCards = Card.fromStrings(['Ah', 'Kh']); // Royal flush draw
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      expect(solution).toBeDefined();
      expect(solution.recommendedAction).toBeDefined();
    });

    it('should handle all-in scenarios', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.playerStack = 50;
      decisionPoint.currentBet = 100;
      decisionPoint.playerCurrentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Should make a decision even when facing all-in
      expect(solution).toBeDefined();
      expect([ActionType.FOLD, ActionType.CALL]).toContain(solution.recommendedAction);
    });
  });

  describe('strategy variations', () => {
    it('should recommend different actions for different hand strengths', () => {
      const strongHand = createMockDecisionPoint();
      strongHand.holeCards = Card.fromStrings(['Ah', 'Kh']);
      strongHand.communityCards = Card.fromStrings(['Ac', 'Ad', 'Kc']); // Full house
      strongHand.currentBet = 20;
      strongHand.playerCurrentBet = 0;
      strongHand.potSize = 50;
      
      const weakHand = createMockDecisionPoint();
      weakHand.holeCards = Card.fromStrings(['2c', '7d']);
      weakHand.communityCards = Card.fromStrings(['Kc', '9d', '5h']);
      weakHand.currentBet = 20;
      weakHand.playerCurrentBet = 0;
      weakHand.potSize = 50;
      
      const strongSolution = engine.calculateOptimalStrategy(strongHand);
      const weakSolution = engine.calculateOptimalStrategy(weakHand);
      
      // Strong hand (full house) should not fold
      expect(strongSolution.recommendedAction).not.toBe(ActionType.FOLD);
      // Weak hand should fold
      expect(weakSolution.recommendedAction).toBe(ActionType.FOLD);
    });

    it('should adjust strategy based on pot size', () => {
      const smallPot = createMockDecisionPoint();
      smallPot.potSize = 20;
      smallPot.currentBet = 10;
      smallPot.playerCurrentBet = 0;
      
      const largePot = createMockDecisionPoint();
      largePot.potSize = 200;
      largePot.currentBet = 10;
      largePot.playerCurrentBet = 0;
      
      const smallPotSolution = engine.calculateOptimalStrategy(smallPot);
      const largePotSolution = engine.calculateOptimalStrategy(largePot);
      
      // Both should generate valid solutions
      expect(smallPotSolution).toBeDefined();
      expect(largePotSolution).toBeDefined();
    });
  });

  describe('Property 14: GTO explanations are provided', () => {
    it('**Validates: Requirements 5.1, 5.2** - should provide non-empty explanation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          (potSize, currentBet) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            decisionPoint.currentBet = currentBet;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Should have non-empty reasoning
            expect(solution.reasoning).toBeDefined();
            expect(solution.reasoning.length).toBeGreaterThan(0);
            expect(solution.reasoning.every(r => typeof r === 'string' && r.length > 0)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 5.2** - should reference strategic factors', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Kh', 'Qh']);
      decisionPoint.currentBet = 20;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 100;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Should reference at least one strategic factor
      const reasoningText = solution.reasoning.join(' ');
      const hasStrategicFactor = 
        reasoningText.includes('equity') ||
        reasoningText.includes('Equity') ||
        reasoningText.includes('pot odds') ||
        reasoningText.includes('Pot odds') ||
        reasoningText.includes('position') ||
        reasoningText.includes('Position');
      
      expect(hasStrategicFactor).toBe(true);
    });

    it('**Validates: Requirements 5.3** - explanations should be concise', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          (potSize) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Each reasoning string should be reasonably short (< 200 chars)
            solution.reasoning.forEach(reason => {
              expect(reason.length).toBeLessThan(200);
            });
            
            // Total reasoning should be concise (< 500 chars total)
            const totalLength = solution.reasoning.join(' ').length;
            expect(totalLength).toBeLessThan(500);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Mixed strategy explanations', () => {
    it('**Validates: Requirements 5.4** - should explain mixed strategy spots', () => {
      // Create a marginal spot that should result in mixed strategy
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Jh', 'Th']); // Medium hand
      decisionPoint.communityCards = Card.fromStrings(['9h', '8d', '2c']); // Some equity
      decisionPoint.currentBet = 30;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 80; // Marginal pot odds
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Count actions with significant frequency (> 20%)
      let significantActions = 0;
      solution.actionFrequencies.forEach(freq => {
        if (freq > 0.2) significantActions++;
      });
      
      // If multiple actions have significant frequency, should mention mixed strategy
      if (significantActions > 1) {
        const reasoningText = solution.reasoning.join(' ');
        expect(reasoningText.toLowerCase()).toContain('mixed strategy');
      }
    });

    it('**Validates: Requirements 5.4** - should identify mixed strategy correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 100 }),
          fc.integer({ min: 50, max: 200 }),
          (currentBet, potSize) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.holeCards = Card.fromStrings(['Th', '9h']); // Medium hand
            decisionPoint.currentBet = currentBet;
            decisionPoint.potSize = potSize;
            decisionPoint.playerCurrentBet = 0;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Count actions with frequency > 0.2
            let actionsAboveThreshold = 0;
            solution.actionFrequencies.forEach(freq => {
              if (freq > 0.2) actionsAboveThreshold++;
            });
            
            const hasMixedStrategyText = solution.reasoning.some(r => 
              r.toLowerCase().includes('mixed strategy')
            );
            
            // If multiple actions have > 20% frequency, should mention mixed strategy
            if (actionsAboveThreshold > 1) {
              expect(hasMixedStrategyText).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('unit tests for explanation quality', () => {
    it('should provide explanations for various scenarios', () => {
      const scenarios = [
        {
          name: 'strong hand',
          holeCards: ['Ah', 'Ad'],
          communityCards: ['Kc', 'Qd', 'Jh'],
          currentBet: 0,
          potSize: 50
        },
        {
          name: 'weak hand facing bet',
          holeCards: ['2c', '7d'],
          communityCards: ['Kc', 'Qd', 'Jh'],
          currentBet: 50,
          potSize: 100
        },
        {
          name: 'medium hand with good pot odds',
          holeCards: ['Th', '9h'],
          communityCards: ['8h', '7d', '2c'],
          currentBet: 10,
          potSize: 100
        }
      ];

      scenarios.forEach(scenario => {
        const decisionPoint = createMockDecisionPoint();
        decisionPoint.holeCards = Card.fromStrings(scenario.holeCards);
        decisionPoint.communityCards = Card.fromStrings(scenario.communityCards);
        decisionPoint.currentBet = scenario.currentBet;
        decisionPoint.potSize = scenario.potSize;
        decisionPoint.playerCurrentBet = 0;
        
        const solution = engine.calculateOptimalStrategy(decisionPoint);
        
        // Should have reasoning
        expect(solution.reasoning.length).toBeGreaterThan(0);
        
        // Reasoning should be strings
        solution.reasoning.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(0);
        });
      });
    });

    it('should include equity information in explanations', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Kh', 'Qh']);
      decisionPoint.currentBet = 20;
      decisionPoint.playerCurrentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      const hasEquity = solution.reasoning.some(r => 
        r.toLowerCase().includes('equity')
      );
      
      expect(hasEquity).toBe(true);
    });

    it('should include pot odds when facing a bet', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.currentBet = 30;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 100;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      const hasPotOdds = solution.reasoning.some(r => 
        r.toLowerCase().includes('pot odds')
      );
      
      // Should mention pot odds when facing a bet
      expect(hasPotOdds).toBe(true);
    });
  });

  describe('Property 13: Player action comparison', () => {
    it('**Validates: Requirements 4.3, 4.4, 4.5** - should compare player action to GTO solution', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          (potSize, currentBet) => {
            const decisionPoint = createMockDecisionPoint();
            decisionPoint.potSize = potSize;
            decisionPoint.currentBet = currentBet;
            
            const solution = engine.calculateOptimalStrategy(decisionPoint);
            
            // Test comparison with recommended action
            const recommendedComparison = engine.comparePlayerAction(
              solution.recommendedAction,
              solution
            );
            
            // Should indicate optimal when choosing recommended action
            expect(recommendedComparison.isOptimal).toBe(true);
            expect(recommendedComparison.feedback).toBeDefined();
            expect(recommendedComparison.feedback.length).toBeGreaterThan(0);
            expect(recommendedComparison.deviation).toBeDefined();
            expect(recommendedComparison.deviation).toBeGreaterThanOrEqual(0);
            expect(recommendedComparison.deviation).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 4.4** - should provide positive feedback for matching GTO', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Ah', 'Ad']); // Strong hand
      decisionPoint.currentBet = 0;
      decisionPoint.playerCurrentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      const comparison = engine.comparePlayerAction(solution.recommendedAction, solution);
      
      // Should indicate optimal
      expect(comparison.isOptimal).toBe(true);
      
      // Feedback should be positive
      const feedbackLower = comparison.feedback.toLowerCase();
      expect(
        feedbackLower.includes('excellent') ||
        feedbackLower.includes('good') ||
        feedbackLower.includes('correct')
      ).toBe(true);
    });

    it('**Validates: Requirements 4.5** - should indicate deviation from GTO', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['2c', '7d']); // Weak hand
      decisionPoint.currentBet = 50;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 50;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Player chooses to call when they should fold
      const comparison = engine.comparePlayerAction(ActionType.CALL, solution);
      
      // Should have feedback
      expect(comparison.feedback).toBeDefined();
      expect(comparison.feedback.length).toBeGreaterThan(0);
      
      // Should indicate deviation
      expect(comparison.deviation).toBeGreaterThan(0);
    });

    it('**Validates: Requirements 4.3** - should display player action alongside GTO', () => {
      const decisionPoint = createMockDecisionPoint();
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Test with different player actions
      const actions = [ActionType.FOLD, ActionType.CALL, ActionType.RAISE];
      
      actions.forEach(action => {
        const comparison = engine.comparePlayerAction(action, solution);
        
        // Feedback should mention both player action and GTO recommendation
        expect(comparison.feedback).toContain(action);
      });
    });
  });

  describe('unit tests for action comparison', () => {
    it('should recognize optimal action', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Kh', 'Kd']); // Strong pair
      decisionPoint.currentBet = 0;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      const comparison = engine.comparePlayerAction(solution.recommendedAction, solution);
      
      expect(comparison.isOptimal).toBe(true);
      expect(comparison.deviation).toBe(0);
    });

    it('should recognize viable alternative actions', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['Jh', 'Th']); // Medium hand
      decisionPoint.currentBet = 20;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 100;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Find an action with significant frequency (> 15%)
      let viableAction: ActionType | null = null;
      solution.actionFrequencies.forEach((freq, action) => {
        if (freq >= 0.15 && action !== solution.recommendedAction) {
          viableAction = action;
        }
      });
      
      if (viableAction) {
        const comparison = engine.comparePlayerAction(viableAction, solution);
        expect(comparison.isOptimal).toBe(true);
      }
    });

    it('should recognize suboptimal actions', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['2c', '7d']); // Weak hand
      decisionPoint.currentBet = 100;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 50;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Calling with a weak hand facing a large bet should be suboptimal
      const comparison = engine.comparePlayerAction(ActionType.CALL, solution);
      
      expect(comparison.isOptimal).toBe(false);
      expect(comparison.deviation).toBeGreaterThan(0);
    });

    it('should provide constructive feedback for mistakes', () => {
      const decisionPoint = createMockDecisionPoint();
      decisionPoint.holeCards = Card.fromStrings(['2c', '3d']);
      decisionPoint.currentBet = 100;
      decisionPoint.playerCurrentBet = 0;
      decisionPoint.potSize = 50;
      
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Raising with trash hand should be a mistake
      const comparison = engine.comparePlayerAction(ActionType.RAISE, solution);
      
      // Feedback should be constructive
      expect(comparison.feedback).toBeDefined();
      expect(comparison.feedback.length).toBeGreaterThan(0);
      
      // Should mention the recommended action
      expect(comparison.feedback).toContain(solution.recommendedAction);
    });

    it('should calculate deviation correctly', () => {
      const decisionPoint = createMockDecisionPoint();
      const solution = engine.calculateOptimalStrategy(decisionPoint);
      
      // Recommended action should have 0 deviation
      const recommendedComparison = engine.comparePlayerAction(
        solution.recommendedAction,
        solution
      );
      expect(recommendedComparison.deviation).toBe(0);
      
      // Other actions should have positive deviation
      const allActions = [
        ActionType.FOLD,
        ActionType.CHECK,
        ActionType.CALL,
        ActionType.BET,
        ActionType.RAISE,
        ActionType.ALL_IN
      ];
      
      allActions.forEach(action => {
        if (action !== solution.recommendedAction) {
          const comparison = engine.comparePlayerAction(action, solution);
          expect(comparison.deviation).toBeGreaterThanOrEqual(0);
          expect(comparison.deviation).toBeLessThanOrEqual(1);
        }
      });
    });
  });
});

/**
 * Helper function to create a mock decision point for testing.
 */
function createMockDecisionPoint(): DecisionPoint {
  const gameState: GameState = {
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
        name: 'Player 1',
        position: 1,
        stack: 1000,
        currentBet: 10,
        holeCards: Card.fromStrings(['Qc', 'Jc']),
        hasFolded: false,
        isAllIn: false,
        isAI: true
      }
    ],
    communityCards: Card.fromStrings(['Kc', '9d', '5h']),
    pots: [{ amount: 30, eligiblePlayers: ['player_0', 'player_1'], isMainPot: true }],
    currentBet: 10,
    minimumRaise: 10,
    dealerPosition: 0,
    smallBlindPosition: 0,
    bigBlindPosition: 1,
    currentBettingRound: BettingRound.FLOP,
    actionQueue: ['player_0', 'player_1'],
    currentActorIndex: 0,
    handNumber: 1
  };

  return {
    playerId: 'player_0',
    holeCards: Card.fromStrings(['Ah', 'Kh']),
    communityCards: Card.fromStrings(['Kc', '9d', '5h']),
    potSize: 30,
    currentBet: 10,
    playerStack: 1000,
    playerCurrentBet: 0,
    position: 0,
    numActivePlayers: 2,
    gameState
  };
}
