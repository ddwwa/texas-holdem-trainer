import { ActionValidator } from './ActionValidator';
import { Action, GameState, Player } from '../types/core';
import { ActionType, BettingRound } from '../types/enums';
import * as fc from 'fast-check';

describe('ActionValidator', () => {
  let validator: ActionValidator;
  let baseGameState: GameState;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    validator = new ActionValidator();

    // Create test players
    player1 = {
      id: 'player_1',
      name: 'Player 1',
      stack: 1000,
      holeCards: [],
      position: 0,
      currentBet: 0,
      hasFolded: false,
      isAllIn: false,
      isAI: false
    };

    player2 = {
      id: 'player_2',
      name: 'Player 2',
      stack: 1000,
      holeCards: [],
      position: 1,
      currentBet: 0,
      hasFolded: false,
      isAllIn: false,
      isAI: true
    };

    // Create base game state
    baseGameState = {
      handNumber: 1,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      players: [player1, player2],
      communityCards: [],
      pots: [{
        amount: 0,
        eligiblePlayers: ['player_1', 'player_2'],
        isMainPot: true
      }],
      currentBettingRound: BettingRound.PREFLOP,
      currentBet: 0,
      minimumRaise: 10,
      actionQueue: ['player_1', 'player_2'],
      currentActorIndex: 0
    };
  });

  describe('validateAction - Turn Order', () => {
    it('should reject action when not player\'s turn', () => {
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_2', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should accept action when it is player\'s turn', () => {
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject action from non-existent player', () => {
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_999', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Player not found');
    });
  });

  describe('validateAction - Player State', () => {
    it('should reject action from folded player', () => {
      player1.hasFolded = true;
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot act after folding');
    });

    it('should reject non-all-in action from all-in player', () => {
      player1.isAllIn = true;
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Player is already all-in');
    });
  });

  describe('getAvailableActions - No Bet Scenario (Requirement 2.1)', () => {
    it('should allow CHECK and BET when no bet has been made', () => {
      baseGameState.currentBet = 0;
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).toContain(ActionType.CHECK);
      expect(actions).toContain(ActionType.BET);
      expect(actions).toContain(ActionType.ALL_IN);
      expect(actions).not.toContain(ActionType.CALL);
      expect(actions).not.toContain(ActionType.RAISE);
      expect(actions).not.toContain(ActionType.FOLD);
    });
  });

  describe('getAvailableActions - Bet Made Scenario (Requirement 2.2)', () => {
    it('should allow FOLD, CALL, and RAISE when bet has been made', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).toContain(ActionType.FOLD);
      expect(actions).toContain(ActionType.CALL);
      expect(actions).toContain(ActionType.RAISE);
      expect(actions).toContain(ActionType.ALL_IN);
      expect(actions).not.toContain(ActionType.CHECK);
      expect(actions).not.toContain(ActionType.BET);
    });
  });

  describe('getAvailableActions - Short Stack (Requirement 2.4)', () => {
    it('should not allow CALL when player has insufficient chips', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      player1.stack = 50; // Less than amount to call
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).not.toContain(ActionType.CALL);
      expect(actions).toContain(ActionType.FOLD);
      expect(actions).toContain(ActionType.ALL_IN);
      expect(actions).not.toContain(ActionType.RAISE);
    });

    it('should allow CALL when player has exactly enough chips', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      player1.stack = 100; // Exactly amount to call
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).toContain(ActionType.CALL);
      expect(actions).not.toContain(ActionType.RAISE); // Can't raise with exact call amount
    });
  });

  describe('getAvailableActions - All-In Always Available (Requirement 2.5)', () => {
    it('should always include ALL_IN when player has chips', () => {
      // No bet scenario
      baseGameState.currentBet = 0;
      let actions = validator.getAvailableActions(player1, baseGameState);
      expect(actions).toContain(ActionType.ALL_IN);

      // Bet made scenario
      baseGameState.currentBet = 100;
      actions = validator.getAvailableActions(player1, baseGameState);
      expect(actions).toContain(ActionType.ALL_IN);

      // Short stack scenario
      player1.stack = 50;
      actions = validator.getAvailableActions(player1, baseGameState);
      expect(actions).toContain(ActionType.ALL_IN);
    });

    it('should not include actions when player has no chips and is not all-in', () => {
      player1.stack = 0;
      player1.isAllIn = false;
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).toEqual([ActionType.FOLD]);
    });

    it('should return empty array when player is already all-in', () => {
      player1.stack = 0;
      player1.isAllIn = true;
      const actions = validator.getAvailableActions(player1, baseGameState);

      expect(actions).toEqual([]);
    });
  });

  describe('validateCheck', () => {
    it('should allow CHECK when no bet has been made', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should allow CHECK when player has matched the bet', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 100;
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject CHECK when facing a bet', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      const action: Action = { type: ActionType.CHECK };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });
  });

  describe('validateCall', () => {
    it('should allow CALL when player has enough chips', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      player1.stack = 1000;
      const action: Action = { type: ActionType.CALL };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject CALL when player has insufficient chips', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      player1.stack = 50;
      const action: Action = { type: ActionType.CALL };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });

    it('should reject CALL when there is no bet to call', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.CALL };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });
  });

  describe('validateBet', () => {
    it('should allow BET with valid amount', () => {
      baseGameState.currentBet = 0;
      baseGameState.minimumRaise = 10;
      const action: Action = { type: ActionType.BET, amount: 50 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject BET when there is already a bet', () => {
      baseGameState.currentBet = 100;
      const action: Action = { type: ActionType.BET, amount: 50 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });

    it('should reject BET with no amount', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.BET };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be greater than 0');
    });

    it('should reject BET with zero amount', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.BET, amount: 0 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be greater than 0');
    });

    it('should reject BET more than stack (Requirement 9.4)', () => {
      baseGameState.currentBet = 0;
      player1.stack = 100;
      const action: Action = { type: ActionType.BET, amount: 150 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient chips');
    });

    it('should reject BET below minimum', () => {
      baseGameState.currentBet = 0;
      baseGameState.minimumRaise = 10;
      const action: Action = { type: ActionType.BET, amount: 5 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be at least');
    });
  });

  describe('validateRaise - Minimum Raise (Requirement 2.3)', () => {
    it('should allow RAISE meeting minimum raise requirement', () => {
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 0;
      player1.stack = 1000;
      const action: Action = { type: ActionType.RAISE, amount: 200 }; // Raise to 200 (100 + 100)
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject RAISE below minimum raise requirement', () => {
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 0;
      const action: Action = { type: ActionType.RAISE, amount: 150 }; // Only raising by 50
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be at least');
    });

    it('should reject RAISE when there is no bet', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.RAISE, amount: 100 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });

    it('should reject RAISE with no amount', () => {
      baseGameState.currentBet = 100;
      const action: Action = { type: ActionType.RAISE };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be greater than 0');
    });

    it('should reject RAISE more than stack (Requirement 9.4)', () => {
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 0;
      player1.stack = 150;
      const action: Action = { type: ActionType.RAISE, amount: 300 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient chips');
    });

    it('should reject RAISE that does not exceed current bet', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      const action: Action = { type: ActionType.RAISE, amount: 100 }; // Same as current bet
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be more than current bet');
    });
  });

  describe('validateAllIn', () => {
    it('should allow ALL_IN when player has chips', () => {
      player1.stack = 500;
      const action: Action = { type: ActionType.ALL_IN };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should reject ALL_IN when player has no chips', () => {
      player1.stack = 0;
      const action: Action = { type: ActionType.ALL_IN };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });
  });

  describe('validateFold', () => {
    it('should allow FOLD when facing a bet', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 0;
      const action: Action = { type: ActionType.FOLD };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Action Rejection (Requirement 2.6)', () => {
    it('should reject action not in available actions list', () => {
      baseGameState.currentBet = 0; // No bet, so CALL should not be available
      const action: Action = { type: ActionType.CALL };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Action not available');
    });

    it('should provide list of available actions in error message', () => {
      baseGameState.currentBet = 0;
      const action: Action = { type: ActionType.RAISE, amount: 100 };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Available actions:');
    });
  });

  describe('Edge Cases', () => {
    it('should handle player who has already bet some amount', () => {
      baseGameState.currentBet = 100;
      player1.currentBet = 50; // Already bet 50
      player1.stack = 1000;
      const action: Action = { type: ActionType.CALL };
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true); // Should only need to call 50 more
    });

    it('should handle raise after player has already bet', () => {
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 50; // Already bet 50
      player1.stack = 1000;
      const action: Action = { type: ActionType.RAISE, amount: 200 }; // Total bet of 200
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(true);
    });

    it('should handle minimum raise with player who has already bet', () => {
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 50;
      const action: Action = { type: ActionType.RAISE, amount: 150 }; // Only 50 more than current bet
      const result = validator.validateAction(action, 'player_1', baseGameState);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be at least 200');
    });
  });

  describe('Complex Scenarios', () => {
    it('should validate correctly in multi-player scenario', () => {
      const player3: Player = {
        id: 'player_3',
        name: 'Player 3',
        stack: 500,
        holeCards: [],
        position: 2,
        currentBet: 100,
        hasFolded: false,
        isAllIn: false,
        isAI: true
      };

      baseGameState.players.push(player3);
      baseGameState.currentBet = 100;
      baseGameState.minimumRaise = 100;
      player1.currentBet = 0;

      // Player 1 should be able to call or raise
      const actions = validator.getAvailableActions(player1, baseGameState);
      expect(actions).toContain(ActionType.CALL);
      expect(actions).toContain(ActionType.RAISE);
      expect(actions).toContain(ActionType.FOLD);
    });

    it('should handle all-in scenario with partial bet', () => {
      baseGameState.currentBet = 100;
      player1.stack = 75; // Can't call full amount
      player1.currentBet = 0;

      const actions = validator.getAvailableActions(player1, baseGameState);
      expect(actions).toContain(ActionType.ALL_IN);
      expect(actions).not.toContain(ActionType.CALL);
      expect(actions).not.toContain(ActionType.RAISE);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 5: Available actions match game state', () => {
      /**
       * **Validates: Requirements 2.1, 2.2**
       * 
       * Property 5: Available actions match game state
       * For any decision point with no current bet, the available actions should include CHECK and BET.
       * For any decision point with a current bet, the available actions should include FOLD, CALL, and RAISE.
       */
      it('**Validates: Requirements 2.1, 2.2** - when no bet has been made, available actions include CHECK and BET', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 100 }), // Player current bet (should be 0 or equal to currentBet for no-bet scenario)
            (playerStack, playerCurrentBet) => {
              // Create a game state with no current bet
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0, // No bet made yet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: 0,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: 0, // No bet has been made
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // When no bet has been made, CHECK and BET should be available (Requirement 2.1)
              expect(availableActions).toContain(ActionType.CHECK);
              expect(availableActions).toContain(ActionType.BET);
              
              // ALL_IN should always be available (Requirement 2.5)
              expect(availableActions).toContain(ActionType.ALL_IN);
              
              // FOLD, CALL, and RAISE should NOT be available when there's no bet
              expect(availableActions).not.toContain(ActionType.CALL);
              expect(availableActions).not.toContain(ActionType.RAISE);
              // FOLD is not available when there's no bet to face
              expect(availableActions).not.toContain(ActionType.FOLD);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.1, 2.2** - when player has matched the bet, available actions include CHECK and BET', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 10, max: 500 }), // Current bet amount
            (playerStack, currentBet) => {
              // Create a game state where player has already matched the bet
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: currentBet, // Player has matched the bet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: currentBet, // There is a bet, but player has matched it
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // When player has matched the bet, CHECK and BET should be available
              expect(availableActions).toContain(ActionType.CHECK);
              expect(availableActions).toContain(ActionType.BET);
              
              // ALL_IN should always be available
              expect(availableActions).toContain(ActionType.ALL_IN);
              
              // FOLD, CALL, and RAISE should NOT be available when player has matched the bet
              expect(availableActions).not.toContain(ActionType.CALL);
              expect(availableActions).not.toContain(ActionType.RAISE);
              expect(availableActions).not.toContain(ActionType.FOLD);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.1, 2.2** - when a bet has been made, available actions include FOLD, CALL, and RAISE', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 10, max: 500 }), // Current bet amount
            fc.integer({ min: 0, max: 50 }), // Player's current bet (less than currentBet)
            (playerStack, currentBet, playerCurrentBet) => {
              // Ensure player's current bet is less than the game's current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet - 1);
              
              // Create a game state with a bet that player hasn't matched
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet, // Player hasn't matched the bet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: currentBet, // There is a bet
                minimumRaise: currentBet, // Minimum raise is typically the size of the current bet
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              const amountToCall = currentBet - actualPlayerBet;

              // When a bet has been made, FOLD should be available (Requirement 2.2)
              expect(availableActions).toContain(ActionType.FOLD);
              
              // CALL should be available if player has enough chips (Requirement 2.2)
              if (playerStack >= amountToCall) {
                expect(availableActions).toContain(ActionType.CALL);
              } else {
                // If player doesn't have enough to call, CALL should not be available (Requirement 2.4)
                expect(availableActions).not.toContain(ActionType.CALL);
              }
              
              // RAISE should be available if player has more than enough to call (Requirement 2.2)
              if (playerStack > amountToCall) {
                expect(availableActions).toContain(ActionType.RAISE);
              } else {
                // If player can only call or has less, RAISE should not be available
                expect(availableActions).not.toContain(ActionType.RAISE);
              }
              
              // ALL_IN should always be available (Requirement 2.5)
              expect(availableActions).toContain(ActionType.ALL_IN);
              
              // CHECK and BET should NOT be available when facing a bet
              expect(availableActions).not.toContain(ActionType.CHECK);
              expect(availableActions).not.toContain(ActionType.BET);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.1, 2.2** - available actions are always consistent with game state', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 500 }), // Current bet
            fc.integer({ min: 0, max: 500 }), // Player current bet
            fc.boolean(), // Has folded
            fc.boolean(), // Is all-in
            (playerStack, currentBet, playerCurrentBet, hasFolded, isAllIn) => {
              // Ensure player's current bet doesn't exceed current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet,
                hasFolded: hasFolded,
                isAllIn: isAllIn,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // If player has folded, no actions should be available
              if (hasFolded) {
                expect(availableActions.length).toBe(0);
                return;
              }

              // If player is all-in, no actions should be available
              if (isAllIn) {
                expect(availableActions.length).toBe(0);
                return;
              }

              // If player has no chips, only FOLD should be available
              if (playerStack === 0) {
                expect(availableActions).toEqual([ActionType.FOLD]);
                return;
              }

              const amountToCall = currentBet - actualPlayerBet;

              // Verify consistency based on whether there's a bet to face
              if (amountToCall === 0) {
                // No bet to face - should have CHECK and BET
                expect(availableActions).toContain(ActionType.CHECK);
                expect(availableActions).toContain(ActionType.BET);
                expect(availableActions).not.toContain(ActionType.FOLD);
                expect(availableActions).not.toContain(ActionType.CALL);
                expect(availableActions).not.toContain(ActionType.RAISE);
              } else {
                // Bet to face - should have FOLD
                expect(availableActions).toContain(ActionType.FOLD);
                expect(availableActions).not.toContain(ActionType.CHECK);
                expect(availableActions).not.toContain(ActionType.BET);
                
                // CALL availability depends on stack
                if (playerStack >= amountToCall) {
                  expect(availableActions).toContain(ActionType.CALL);
                } else {
                  expect(availableActions).not.toContain(ActionType.CALL);
                }
                
                // RAISE availability depends on having more than call amount
                if (playerStack > amountToCall) {
                  expect(availableActions).toContain(ActionType.RAISE);
                } else {
                  expect(availableActions).not.toContain(ActionType.RAISE);
                }
              }

              // ALL_IN should always be available when player has chips
              expect(availableActions).toContain(ActionType.ALL_IN);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 6: All-in is always available', () => {
      /**
       * **Validates: Requirements 2.5**
       * 
       * Property 6: All-in is always available
       * For any decision point, ALL_IN should be included in the available actions
       * when the player has chips, regardless of:
       * - Whether there's a bet or not
       * - The player's stack size
       * - The current betting round
       */
      it('**Validates: Requirements 2.5** - ALL_IN is always available when player has chips', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }), // Player stack (at least 1 chip)
            fc.integer({ min: 0, max: 1000 }), // Current bet
            fc.integer({ min: 0, max: 1000 }), // Player current bet
            fc.constantFrom(BettingRound.PREFLOP, BettingRound.FLOP, BettingRound.TURN, BettingRound.RIVER), // Betting round
            (playerStack, currentBet, playerCurrentBet, bettingRound) => {
              // Ensure player's current bet doesn't exceed current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack, // Player has at least 1 chip
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: bettingRound,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // Property 6: ALL_IN should ALWAYS be available when player has chips
              expect(availableActions).toContain(ActionType.ALL_IN);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.5** - ALL_IN is available regardless of bet presence', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }), // Player stack
            fc.boolean(), // Whether there's a bet or not
            (playerStack, hasBet) => {
              const currentBet = hasBet ? 100 : 0;
              const playerCurrentBet = hasBet ? 0 : 0; // Player hasn't matched bet if there is one
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: playerCurrentBet,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet,
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // ALL_IN should be available whether there's a bet or not
              expect(availableActions).toContain(ActionType.ALL_IN);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.5** - ALL_IN is available with any stack size', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }), // Player stack (any positive amount)
            fc.integer({ min: 0, max: 5000 }), // Current bet (can be larger than stack)
            (playerStack, currentBet) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack, // Can be less than, equal to, or more than current bet
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.TURN,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // ALL_IN should be available regardless of stack size relative to bet
              expect(availableActions).toContain(ActionType.ALL_IN);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.5** - ALL_IN is not available when player has no chips', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000 }), // Current bet
            (currentBet) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: 0, // No chips
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // When player has no chips, ALL_IN should not be available
              expect(availableActions).not.toContain(ActionType.ALL_IN);
              // Only FOLD should be available
              expect(availableActions).toEqual([ActionType.FOLD]);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.5** - ALL_IN is not available when player is already all-in', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000 }), // Current bet
            (currentBet) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: 0,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: true, // Already all-in
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // When player is already all-in, no actions should be available
              expect(availableActions).toEqual([]);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 7: Minimum raise enforcement', () => {
      /**
       * **Validates: Requirements 2.3**
       * 
       * Property 7: Minimum raise enforcement
       * For any raise action, the raise amount should be at least equal to the previous bet or raise amount.
       * This ensures that raises follow standard poker rules where a raise must be at least the size
       * of the previous bet or raise.
       */
      it('**Validates: Requirements 2.3** - raises must meet minimum raise requirement', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 10, max: 500 }), // Current bet
            fc.integer({ min: 10, max: 500 }), // Minimum raise amount
            fc.integer({ min: 0, max: 50 }), // Player's current bet
            (playerStack, currentBet, minimumRaise, playerCurrentBet) => {
              // Ensure player's current bet is less than the game's current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet - 1);
              
              // Ensure player has enough chips to make a valid raise
              const minimumRaiseTotal = currentBet + minimumRaise;
              const amountNeeded = minimumRaiseTotal - actualPlayerBet;
              
              // Skip if player doesn't have enough chips to make minimum raise
              fc.pre(playerStack >= amountNeeded);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: currentBet,
                minimumRaise: minimumRaise,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Test 1: Raise that meets minimum requirement should be valid
              const validRaiseAmount = minimumRaiseTotal;
              const validRaiseAction: Action = {
                type: ActionType.RAISE,
                amount: validRaiseAmount
              };
              const validResult = validator.validateAction(validRaiseAction, 'test_player', gameState);
              expect(validResult.valid).toBe(true);

              // Test 2: Raise that exceeds minimum requirement should be valid
              const largerRaiseAmount = minimumRaiseTotal + 50;
              if (largerRaiseAmount - actualPlayerBet <= playerStack) {
                const largerRaiseAction: Action = {
                  type: ActionType.RAISE,
                  amount: largerRaiseAmount
                };
                const largerResult = validator.validateAction(largerRaiseAction, 'test_player', gameState);
                expect(largerResult.valid).toBe(true);
              }

              // Test 3: Raise below minimum requirement should be rejected
              const belowMinimumAmount = currentBet + Math.floor(minimumRaise / 2);
              if (belowMinimumAmount > currentBet && belowMinimumAmount < minimumRaiseTotal) {
                const invalidRaiseAction: Action = {
                  type: ActionType.RAISE,
                  amount: belowMinimumAmount
                };
                const invalidResult = validator.validateAction(invalidRaiseAction, 'test_player', gameState);
                expect(invalidResult.valid).toBe(false);
                expect(invalidResult.error).toContain('must be at least');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.3** - minimum raise is enforced correctly with various bet sizes', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1000, max: 10000 }), // Player stack (large enough for testing)
            fc.integer({ min: 20, max: 200 }), // Current bet
            (playerStack, currentBet) => {
              // Minimum raise is typically equal to the current bet
              const minimumRaise = currentBet;
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0, // Player hasn't bet yet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet,
                minimumRaise: minimumRaise,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // The minimum valid raise total is currentBet + minimumRaise
              const minimumValidRaise = currentBet + minimumRaise;

              // Test: Raise exactly at minimum should be valid
              const exactMinAction: Action = {
                type: ActionType.RAISE,
                amount: minimumValidRaise
              };
              const exactMinResult = validator.validateAction(exactMinAction, 'test_player', gameState);
              expect(exactMinResult.valid).toBe(true);

              // Test: Raise just below minimum should be invalid
              const belowMinAction: Action = {
                type: ActionType.RAISE,
                amount: minimumValidRaise - 1
              };
              const belowMinResult = validator.validateAction(belowMinAction, 'test_player', gameState);
              expect(belowMinResult.valid).toBe(false);
              expect(belowMinResult.error).toContain('must be at least');
              expect(belowMinResult.error).toContain(minimumValidRaise.toString());
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.3** - minimum raise enforcement with player who has already bet', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1000, max: 10000 }), // Player stack
            fc.integer({ min: 50, max: 200 }), // Current bet
            fc.integer({ min: 10, max: 50 }), // Player's current bet (less than currentBet)
            (playerStack, currentBet, playerCurrentBet) => {
              // Ensure player's current bet is less than the game's current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet - 10);
              
              // Minimum raise is typically equal to the current bet
              const minimumRaise = currentBet;
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.TURN,
                currentBet: currentBet,
                minimumRaise: minimumRaise,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // The minimum valid raise total is currentBet + minimumRaise
              const minimumValidRaise = currentBet + minimumRaise;

              // Test: Raise to exactly minimum should be valid
              const validAction: Action = {
                type: ActionType.RAISE,
                amount: minimumValidRaise
              };
              const validResult = validator.validateAction(validAction, 'test_player', gameState);
              expect(validResult.valid).toBe(true);

              // Test: Raise that's more than currentBet but less than minimum should be invalid
              const insufficientRaise = currentBet + Math.floor(minimumRaise / 2);
              if (insufficientRaise > currentBet && insufficientRaise < minimumValidRaise) {
                const invalidAction: Action = {
                  type: ActionType.RAISE,
                  amount: insufficientRaise
                };
                const invalidResult = validator.validateAction(invalidAction, 'test_player', gameState);
                expect(invalidResult.valid).toBe(false);
                expect(invalidResult.error).toContain('must be at least');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.3** - error message includes correct minimum raise amount', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1000, max: 10000 }), // Player stack
            fc.integer({ min: 20, max: 500 }), // Current bet
            fc.integer({ min: 20, max: 500 }), // Minimum raise
            (playerStack, currentBet, minimumRaise) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: minimumRaise,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Try to raise below minimum
              const minimumValidRaise = currentBet + minimumRaise;
              const belowMinimum = currentBet + 1; // Just above currentBet but below minimum

              if (belowMinimum < minimumValidRaise) {
                const action: Action = {
                  type: ActionType.RAISE,
                  amount: belowMinimum
                };
                const result = validator.validateAction(action, 'test_player', gameState);

                // Should be rejected
                expect(result.valid).toBe(false);
                
                // Error message should contain the minimum raise amount
                expect(result.error).toContain('must be at least');
                expect(result.error).toContain(minimumValidRaise.toString());
                
                // Error message should explain the calculation
                expect(result.error).toContain(currentBet.toString());
                expect(result.error).toContain(minimumRaise.toString());
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 8: Invalid actions are rejected', () => {
      /**
       * **Validates: Requirements 2.6**
       * 
       * Property 8: Invalid actions are rejected
       * For any invalid action (wrong action type for game state, insufficient chips, out of turn),
       * the system should reject it and return an error with details about available actions.
       */
      it('**Validates: Requirements 2.6** - actions not in available actions list are rejected', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 500 }), // Current bet
            fc.integer({ min: 0, max: 500 }), // Player current bet
            fc.constantFrom(...Object.values(ActionType)), // Random action type
            (playerStack, currentBet, playerCurrentBet, actionType) => {
              // Ensure player's current bet doesn't exceed current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // Create an action with the random action type
              const action: Action = {
                type: actionType,
                amount: actionType === ActionType.BET || actionType === ActionType.RAISE ? 100 : undefined
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // If the action is in the available actions list, it should be valid (or fail for other reasons)
              // If the action is NOT in the available actions list, it MUST be rejected
              if (!availableActions.includes(actionType)) {
                // Property 8: Invalid actions must be rejected
                expect(result.valid).toBe(false);
                
                // Error message must indicate the action is not available
                expect(result.error).toContain('Action not available');
                
                // Error message must list the available actions
                expect(result.error).toContain('Available actions:');
                
                // Verify each available action is mentioned in the error
                for (const availableAction of availableActions) {
                  expect(result.error).toContain(availableAction);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - rejected actions include detailed error messages', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 10, max: 500 }), // Current bet (always > 0 for this test)
            (playerStack, currentBet) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0, // Player hasn't matched the bet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet, // There is a bet
                minimumRaise: currentBet,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Try to CHECK when facing a bet (should be invalid)
              const checkAction: Action = { type: ActionType.CHECK };
              const checkResult = validator.validateAction(checkAction, 'test_player', gameState);

              // Should be rejected
              expect(checkResult.valid).toBe(false);
              
              // Error message should be detailed and helpful
              expect(checkResult.error).toBeDefined();
              expect(checkResult.error!.length).toBeGreaterThan(0);
              
              // Should mention that action is not available
              expect(checkResult.error).toContain('Action not available');
              
              // Should list available actions
              expect(checkResult.error).toContain('Available actions:');

              // Try to BET when there's already a bet (should be invalid)
              const betAction: Action = { type: ActionType.BET, amount: 50 };
              const betResult = validator.validateAction(betAction, 'test_player', gameState);

              // Should be rejected
              expect(betResult.valid).toBe(false);
              expect(betResult.error).toBeDefined();
              expect(betResult.error!.length).toBeGreaterThan(0);
              expect(betResult.error).toContain('Action not available');
              expect(betResult.error).toContain('Available actions:');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - error messages list available actions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.boolean(), // Whether there's a bet or not
            (playerStack, hasBet) => {
              const currentBet = hasBet ? 100 : 0;
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.TURN,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // Try an action that's definitely not available
              const invalidAction: Action = {
                type: hasBet ? ActionType.CHECK : ActionType.CALL
              };

              const result = validator.validateAction(invalidAction, 'test_player', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              expect(result.error).toBeDefined();
              
              // Error message must list available actions
              expect(result.error).toContain('Available actions:');
              
              // Each available action should be mentioned in the error message
              for (const action of availableActions) {
                expect(result.error).toContain(action);
              }
              
              // The error message should contain all available actions
              const errorLower = result.error!.toLowerCase();
              for (const action of availableActions) {
                expect(errorLower).toContain(action.toLowerCase());
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - validator consistently rejects invalid actions across all game states', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 50, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 500 }), // Current bet
            fc.constantFrom(BettingRound.PREFLOP, BettingRound.FLOP, BettingRound.TURN, BettingRound.RIVER), // Betting round
            fc.integer({ min: 0, max: 7 }), // Player position
            (playerStack, currentBet, bettingRound, position) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: position,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: bettingRound,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const availableActions = validator.getAvailableActions(player, gameState);

              // Test all action types
              const allActionTypes = Object.values(ActionType);
              
              for (const actionType of allActionTypes) {
                const action: Action = {
                  type: actionType,
                  amount: actionType === ActionType.BET || actionType === ActionType.RAISE ? 100 : undefined
                };

                const result = validator.validateAction(action, 'test_player', gameState);

                // If action is not available, it must be rejected consistently
                if (!availableActions.includes(actionType)) {
                  expect(result.valid).toBe(false);
                  expect(result.error).toContain('Action not available');
                  expect(result.error).toContain('Available actions:');
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - out of turn actions are rejected', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 500 }), // Current bet
            (playerStack, currentBet) => {
              const player1: Player = {
                id: 'player_1',
                name: 'Player 1',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const player2: Player = {
                id: 'player_2',
                name: 'Player 2',
                stack: playerStack,
                holeCards: [],
                position: 1,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: true
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player1, player2],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['player_1', 'player_2'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['player_1', 'player_2'],
                currentActorIndex: 0 // It's player_1's turn
              };

              const validator = new ActionValidator();

              // Try to act as player_2 when it's player_1's turn
              const action: Action = { type: ActionType.CHECK };
              const result = validator.validateAction(action, 'player_2', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Not your turn');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - insufficient chips actions are rejected with helpful error', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 10, max: 100 }), // Player stack (small)
            fc.integer({ min: 101, max: 500 }), // Current bet (larger than stack)
            (playerStack, currentBet) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack, // Not enough to call
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: currentBet,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Try to CALL when player doesn't have enough chips
              const callAction: Action = { type: ActionType.CALL };
              const callResult = validator.validateAction(callAction, 'test_player', gameState);

              // Should be rejected because CALL is not in available actions
              expect(callResult.valid).toBe(false);
              expect(callResult.error).toContain('Action not available');
              
              // Available actions should include ALL_IN but not CALL
              const availableActions = validator.getAvailableActions(player, gameState);
              expect(availableActions).not.toContain(ActionType.CALL);
              expect(availableActions).toContain(ActionType.ALL_IN);

              // Try to RAISE when player doesn't have enough chips
              const raiseAction: Action = { type: ActionType.RAISE, amount: currentBet + 100 };
              const raiseResult = validator.validateAction(raiseAction, 'test_player', gameState);

              // Should be rejected
              expect(raiseResult.valid).toBe(false);
              expect(raiseResult.error).toContain('Action not available');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - folded players cannot act', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 10000 }), // Player stack
            fc.integer({ min: 0, max: 500 }), // Current bet
            fc.constantFrom(...Object.values(ActionType)), // Any action type
            (playerStack, currentBet, actionType) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: true, // Player has folded
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.TURN,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Try any action after folding
              const action: Action = {
                type: actionType,
                amount: actionType === ActionType.BET || actionType === ActionType.RAISE ? 100 : undefined
              };
              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Cannot act after folding');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 2.6** - all-in players cannot act again', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 500 }), // Current bet
            fc.constantFrom(...Object.values(ActionType).filter(a => a !== ActionType.ALL_IN)), // Any action except ALL_IN
            (currentBet, actionType) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: 0,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: true, // Player is already all-in
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: Math.max(10, currentBet),
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();

              // Try any action when already all-in
              const action: Action = {
                type: actionType,
                amount: actionType === ActionType.BET || actionType === ActionType.RAISE ? 100 : undefined
              };
              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Player is already all-in');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 26: Cannot bet more than stack', () => {
      /**
       * **Validates: Requirements 9.4**
       * 
       * Property 26: Cannot bet more than stack
       * For any bet or raise action, the wagered amount should be less than or equal to the player's current stack.
       * This ensures players cannot bet more chips than they have available.
       */
      it('**Validates: Requirements 9.4** - cannot bet more than stack', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 10, max: 1000 }), // Player stack
            fc.integer({ min: 1, max: 2000 }), // Bet amount (can exceed stack)
            (playerStack, betAmount) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: 0,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: 0, // No current bet, so player can BET
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const action: Action = {
                type: ActionType.BET,
                amount: betAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Property 26: Cannot bet more than stack
              if (betAmount > playerStack) {
                // Bet exceeds stack - should be rejected
                expect(result.valid).toBe(false);
                expect(result.error).toContain('Insufficient chips');
                expect(result.error).toContain(betAmount.toString());
                expect(result.error).toContain(playerStack.toString());
              } else if (betAmount >= gameState.minimumRaise) {
                // Bet is within stack and meets minimum - should be valid
                expect(result.valid).toBe(true);
              } else {
                // Bet is within stack but below minimum - should be rejected for different reason
                expect(result.valid).toBe(false);
                expect(result.error).toContain('must be at least');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - cannot raise more than stack', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 1000 }), // Player stack
            fc.integer({ min: 10, max: 500 }), // Current bet
            fc.integer({ min: 1, max: 2000 }), // Raise amount (can exceed stack)
            (playerStack, currentBet, raiseAmount) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0, // Player hasn't bet yet
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet, // There is a bet
                minimumRaise: currentBet, // Minimum raise is typically the size of the current bet
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const action: Action = {
                type: ActionType.RAISE,
                amount: raiseAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Property 26: Cannot raise more than stack
              // The raise amount is the total amount the player will have bet
              // So we need to check if (raiseAmount - player.currentBet) > player.stack
              const amountNeeded = raiseAmount - player.currentBet;
              
              if (amountNeeded > playerStack) {
                // Raise exceeds stack - should be rejected
                expect(result.valid).toBe(false);
                // Could be rejected with "Insufficient chips" or "Action not available" depending on whether RAISE is available
                expect(result.error).toBeDefined();
              } else if (raiseAmount <= currentBet) {
                // Raise doesn't exceed current bet - should be rejected
                expect(result.valid).toBe(false);
                // Could be "must be more than current bet" or "Action not available"
                expect(result.error).toBeDefined();
              } else if (raiseAmount < currentBet + gameState.minimumRaise) {
                // Raise doesn't meet minimum - should be rejected
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
              } else {
                // Raise is valid - within stack and meets requirements
                expect(result.valid).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - validation accounts for chips already bet in current round', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 200, max: 1000 }), // Player stack
            fc.integer({ min: 50, max: 200 }), // Current bet
            fc.integer({ min: 10, max: 100 }), // Player's current bet (already committed)
            fc.integer({ min: 1, max: 1500 }), // Raise amount
            (playerStack, currentBet, playerCurrentBet, raiseAmount) => {
              // Ensure player's current bet is less than the game's current bet
              const actualPlayerBet = Math.min(playerCurrentBet, currentBet - 10);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: actualPlayerBet, // Player has already bet some chips
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.TURN,
                currentBet: currentBet,
                minimumRaise: currentBet,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const action: Action = {
                type: ActionType.RAISE,
                amount: raiseAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Property 26: Validation must account for chips already bet
              // The additional chips needed is (raiseAmount - actualPlayerBet)
              const additionalChipsNeeded = raiseAmount - actualPlayerBet;
              
              if (additionalChipsNeeded > playerStack) {
                // Raise exceeds remaining stack - should be rejected
                expect(result.valid).toBe(false);
                expect(result.error).toContain('Insufficient chips');
                
                // Error message should reference the remaining stack, not total stack
                expect(result.error).toContain(playerStack.toString());
              } else if (raiseAmount <= currentBet) {
                // Raise doesn't exceed current bet - should be rejected
                expect(result.valid).toBe(false);
                expect(result.error).toContain('must be more than current bet');
              } else if (raiseAmount < currentBet + gameState.minimumRaise) {
                // Raise doesn't meet minimum - should be rejected
                expect(result.valid).toBe(false);
                expect(result.error).toContain('must be at least');
              } else {
                // Raise is valid - within remaining stack and meets requirements
                expect(result.valid).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - appropriate error messages when bet exceeds stack', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 10, max: 500 }), // Player stack
            fc.integer({ min: 501, max: 2000 }), // Bet amount (always exceeds stack)
            (playerStack, betAmount) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: 0,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: 0,
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const action: Action = {
                type: ActionType.BET,
                amount: betAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              
              // Error message should be clear and helpful
              expect(result.error).toBeDefined();
              expect(result.error).toContain('Insufficient chips');
              
              // Error message should include both the attempted bet and available stack
              expect(result.error).toContain(betAmount.toString());
              expect(result.error).toContain(playerStack.toString());
              
              // Error message should indicate what the player tried to do
              expect(result.error!.toLowerCase()).toContain('bet');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - appropriate error messages when raise exceeds stack', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 100, max: 500 }), // Player stack
            fc.integer({ min: 50, max: 200 }), // Current bet (less than stack)
            (playerStack, currentBet) => {
              // Ensure current bet is less than player stack so RAISE is available
              fc.pre(currentBet < playerStack);
              
              // Raise amount that definitely exceeds stack
              const raiseAmount = playerStack + currentBet + 100;
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.RIVER,
                currentBet: currentBet,
                minimumRaise: currentBet,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              const action: Action = {
                type: ActionType.RAISE,
                amount: raiseAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be rejected
              expect(result.valid).toBe(false);
              
              // Error message should be clear and helpful
              expect(result.error).toBeDefined();
              expect(result.error).toContain('Insufficient chips');
              
              // Error message should include the remaining stack
              expect(result.error).toContain(playerStack.toString());
              
              // Error message should indicate what the player tried to do
              expect(result.error!.toLowerCase()).toContain('raise');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - edge case: bet exactly equal to stack is valid', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 20, max: 1000 }), // Player stack (also bet amount)
            (playerStack) => {
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: 0,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.PREFLOP,
                currentBet: 0,
                minimumRaise: 10,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              
              // Bet exactly equal to stack should be valid
              const action: Action = {
                type: ActionType.BET,
                amount: playerStack
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be valid - betting entire stack is allowed
              expect(result.valid).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.4** - edge case: raise exactly equal to remaining stack is valid', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 300, max: 1000 }), // Player stack (large enough)
            fc.integer({ min: 50, max: 100 }), // Current bet (small enough that stack > currentBet * 2)
            (playerStack, currentBet) => {
              // Ensure player has enough to make a valid raise
              fc.pre(playerStack > currentBet * 2);
              
              const player: Player = {
                id: 'test_player',
                name: 'Test Player',
                stack: playerStack,
                holeCards: [],
                position: 0,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isAI: false
              };

              const gameState: GameState = {
                handNumber: 1,
                dealerPosition: 0,
                smallBlindPosition: 1,
                bigBlindPosition: 2,
                players: [player],
                communityCards: [],
                pots: [{
                  amount: currentBet,
                  eligiblePlayers: ['test_player'],
                  isMainPot: true
                }],
                currentBettingRound: BettingRound.FLOP,
                currentBet: currentBet,
                minimumRaise: currentBet,
                actionQueue: ['test_player'],
                currentActorIndex: 0
              };

              const validator = new ActionValidator();
              
              // Raise using entire stack: player.currentBet (0) + playerStack
              // This is the total amount the player will have bet after the raise
              const raiseAmount = player.currentBet + playerStack;
              const action: Action = {
                type: ActionType.RAISE,
                amount: raiseAmount
              };

              const result = validator.validateAction(action, 'test_player', gameState);

              // Should be valid - raising with entire stack is allowed
              expect(result.valid).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
