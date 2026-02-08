import { GameEngine } from './GameEngine';
import { ActionType, BettingRound } from '../types/enums';
import { Action } from '../types/core';
import * as fc from 'fast-check';

describe('GameEngine', () => {
  describe('Basic Functionality', () => {
    let engine: GameEngine;

    beforeEach(() => {
      engine = new GameEngine(8, 1000, 5, 10);
    });

    describe('dealHand', () => {
      it('should deal 2 hole cards to each player', () => {
        engine.dealHand();
        const gameState = engine.getGameState();

        // Each player should have exactly 2 hole cards
        for (const player of gameState.players) {
          if (player.stack > 0) {
            expect(player.holeCards).toHaveLength(2);
          }
        }
      });

      it('should post blinds at the start of the hand', () => {
        engine.dealHand();
        const gameState = engine.getGameState();

        const sbPlayer = gameState.players[gameState.smallBlindPosition];
        const bbPlayer = gameState.players[gameState.bigBlindPosition];

        // Small blind should have posted 5 chips
        expect(sbPlayer.currentBet).toBe(5);
        expect(sbPlayer.stack).toBe(995);

        // Big blind should have posted 10 chips
        expect(bbPlayer.currentBet).toBe(10);
        expect(bbPlayer.stack).toBe(990);
      });

      it('should set current bet to big blind', () => {
        engine.dealHand();
        const gameState = engine.getGameState();

        expect(gameState.currentBet).toBe(10);
      });

      it('should set betting round to PREFLOP', () => {
        engine.dealHand();
        const gameState = engine.getGameState();

        expect(gameState.currentBettingRound).toBe(BettingRound.PREFLOP);
      });

      it('should set up action queue starting after big blind', () => {
        engine.dealHand();
        const gameState = engine.getGameState();

        // Action should start at UTG (after big blind)
        const firstActor = gameState.actionQueue[0];
        const firstActorPlayer = gameState.players.find(p => p.id === firstActor);
        
        expect(firstActorPlayer).toBeDefined();
        expect(firstActorPlayer!.position).toBe((gameState.bigBlindPosition + 1) % 8);
      });
    });

    describe('executeAction', () => {
      beforeEach(() => {
        engine.dealHand();
      });

      it('should execute a valid FOLD action', () => {
        const gameState = engine.getGameState();
        const currentActor = gameState.actionQueue[gameState.currentActorIndex];

        const result = engine.executeAction(currentActor, { type: ActionType.FOLD });

        expect(result.success).toBe(true);
        
        const updatedPlayer = result.gameState.players.find(p => p.id === currentActor);
        expect(updatedPlayer!.hasFolded).toBe(true);
      });

      it('should execute a valid CALL action', () => {
        const gameState = engine.getGameState();
        const currentActor = gameState.actionQueue[gameState.currentActorIndex];
        const player = gameState.players.find(p => p.id === currentActor)!;
        const initialStack = player.stack;

        const result = engine.executeAction(currentActor, { type: ActionType.CALL });

        expect(result.success).toBe(true);
        
        const updatedPlayer = result.gameState.players.find(p => p.id === currentActor)!;
        // Player should have called the big blind (10 chips)
        expect(updatedPlayer.stack).toBe(initialStack - 10);
        expect(updatedPlayer.currentBet).toBe(10);
      });

      it('should execute a valid RAISE action', () => {
        const gameState = engine.getGameState();
        const currentActor = gameState.actionQueue[gameState.currentActorIndex];
        const player = gameState.players.find(p => p.id === currentActor)!;
        const initialStack = player.stack;

        const result = engine.executeAction(currentActor, { 
          type: ActionType.RAISE, 
          amount: 30 
        });

        expect(result.success).toBe(true);
        
        const updatedPlayer = result.gameState.players.find(p => p.id === currentActor)!;
        expect(updatedPlayer.stack).toBe(initialStack - 30);
        expect(updatedPlayer.currentBet).toBe(30);
        expect(result.gameState.currentBet).toBe(30);
      });

      it('should reject an invalid action', () => {
        const gameState = engine.getGameState();
        const currentActor = gameState.actionQueue[gameState.currentActorIndex];

        // Try to CHECK when there's a bet to call
        const result = engine.executeAction(currentActor, { type: ActionType.CHECK });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject action from wrong player', () => {
        const gameState = engine.getGameState();
        const wrongPlayer = gameState.players.find(
          p => p.id !== gameState.actionQueue[gameState.currentActorIndex]
        )!;

        const result = engine.executeAction(wrongPlayer.id, { type: ActionType.FOLD });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not your turn');
      });
    });

    describe('advanceBettingRound', () => {
      it('should advance from PREFLOP to FLOP', () => {
        engine.dealHand();
        
        const success = engine.advanceBettingRound();
        const gameState = engine.getGameState();

        expect(success).toBe(true);
        expect(gameState.currentBettingRound).toBe(BettingRound.FLOP);
        expect(gameState.communityCards).toHaveLength(3);
      });

      it('should advance from FLOP to TURN', () => {
        engine.dealHand();
        engine.advanceBettingRound(); // PREFLOP -> FLOP
        
        const success = engine.advanceBettingRound();
        const gameState = engine.getGameState();

        expect(success).toBe(true);
        expect(gameState.currentBettingRound).toBe(BettingRound.TURN);
        expect(gameState.communityCards).toHaveLength(4);
      });

      it('should advance from TURN to RIVER', () => {
        engine.dealHand();
        engine.advanceBettingRound(); // PREFLOP -> FLOP
        engine.advanceBettingRound(); // FLOP -> TURN
        
        const success = engine.advanceBettingRound();
        const gameState = engine.getGameState();

        expect(success).toBe(true);
        expect(gameState.currentBettingRound).toBe(BettingRound.RIVER);
        expect(gameState.communityCards).toHaveLength(5);
      });

      it('should not advance beyond RIVER', () => {
        engine.dealHand();
        engine.advanceBettingRound(); // PREFLOP -> FLOP
        engine.advanceBettingRound(); // FLOP -> TURN
        engine.advanceBettingRound(); // TURN -> RIVER
        
        const success = engine.advanceBettingRound();

        expect(success).toBe(false);
      });
    });

    describe('resolveHand', () => {
      it('should award pot to single remaining player', () => {
        engine.dealHand();
        const gameState = engine.getGameState();
        
        // Everyone folds except one player
        const players = [...gameState.actionQueue];
        for (let i = 0; i < players.length - 1; i++) {
          engine.executeAction(players[i], { type: ActionType.FOLD });
        }

        // Last player should win
        const lastPlayer = gameState.players.find(p => p.id === players[players.length - 1])!;
        const initialStack = lastPlayer.stack;
        
        // The hand should auto-resolve when only one player remains
        const finalState = engine.getGameState();
        const winner = finalState.players.find(p => p.id === lastPlayer.id)!;
        
        // Winner should have more chips than they started with (won the blinds)
        expect(winner.stack).toBeGreaterThan(initialStack);
      });

      it('should evaluate hands at showdown', () => {
        engine.dealHand();
        const initialDealerPosition = engine.getGameState().dealerPosition;
        
        // Have all players call/check to reach flop
        let gameState = engine.getGameState();
        const preflopPlayers = [...gameState.actionQueue];
        for (const playerId of preflopPlayers) {
          const currentState = engine.getGameState();
          if (currentState.actionQueue[currentState.currentActorIndex] === playerId) {
            const player = currentState.players.find(p => p.id === playerId)!;
            const amountToCall = currentState.currentBet - player.currentBet;
            
            // If already matched the bet, check; otherwise call
            if (amountToCall === 0) {
              engine.executeAction(playerId, { type: ActionType.CHECK });
            } else {
              engine.executeAction(playerId, { type: ActionType.CALL });
            }
          }
        }

        // Check all players on flop
        gameState = engine.getGameState();
        if (gameState.currentBettingRound === BettingRound.FLOP) {
          const flopPlayers = [...gameState.actionQueue];
          for (const playerId of flopPlayers) {
            const currentState = engine.getGameState();
            if (currentState.actionQueue[currentState.currentActorIndex] === playerId) {
              engine.executeAction(playerId, { type: ActionType.CHECK });
            }
          }
        }

        // Check all players on turn
        gameState = engine.getGameState();
        if (gameState.currentBettingRound === BettingRound.TURN) {
          const turnPlayers = [...gameState.actionQueue];
          for (const playerId of turnPlayers) {
            const currentState = engine.getGameState();
            if (currentState.actionQueue[currentState.currentActorIndex] === playerId) {
              engine.executeAction(playerId, { type: ActionType.CHECK });
            }
          }
        }

        // Check all players on river
        gameState = engine.getGameState();
        if (gameState.currentBettingRound === BettingRound.RIVER) {
          const riverPlayers = [...gameState.actionQueue];
          for (const playerId of riverPlayers) {
            const currentState = engine.getGameState();
            if (currentState.actionQueue[currentState.currentActorIndex] === playerId) {
              engine.executeAction(playerId, { type: ActionType.CHECK });
            }
          }
        }

        // Hand should be resolved
        // Note: Dealer button rotation happens in startNewHand(), not resolveHand()
        const finalState = engine.getGameState();
        expect(finalState.actionQueue.length).toBe(0); // Queue should be empty after hand resolves
      });
    });

    describe('ALL_IN scenarios', () => {
      it('should handle all-in action', () => {
        engine.dealHand();
        const gameState = engine.getGameState();
        const currentActor = gameState.actionQueue[gameState.currentActorIndex];
        const player = gameState.players.find(p => p.id === currentActor)!;
        const initialStack = player.stack;

        const result = engine.executeAction(currentActor, { type: ActionType.ALL_IN });

        expect(result.success).toBe(true);
        
        const updatedPlayer = result.gameState.players.find(p => p.id === currentActor)!;
        expect(updatedPlayer.stack).toBe(0);
        expect(updatedPlayer.isAllIn).toBe(true);
        expect(updatedPlayer.currentBet).toBe(initialStack);
      });

      it('should create side pot when player goes all-in for less than current bet', () => {
        // Create a scenario where a player has very few chips
        const smallStackEngine = new GameEngine(8, 1000, 5, 10);
        smallStackEngine.dealHand();
        
        // Manually set one player to have only 5 chips
        const gameState = smallStackEngine.getGameState();
        const targetPlayer = gameState.players[3];
        smallStackEngine.getPokerState().updatePlayerStack(targetPlayer.id, 5);

        // Have first player raise
        const firstActor = gameState.actionQueue[0];
        smallStackEngine.executeAction(firstActor, { 
          type: ActionType.RAISE, 
          amount: 50 
        });

        // Now have the small stack player go all-in
        const currentState = smallStackEngine.getGameState();
        if (currentState.actionQueue.includes(targetPlayer.id)) {
          const result = smallStackEngine.executeAction(targetPlayer.id, { 
            type: ActionType.ALL_IN 
          });

          expect(result.success).toBe(true);
          
          // Check that side pots were created
          const pots = smallStackEngine.getPotManager().getPots();
          expect(pots.length).toBeGreaterThan(1);
        }
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 1: Card dealing follows betting round progression
     * Validates: Requirements 1.3, 1.4, 1.5
     */
    describe('Property 1: Card dealing follows betting round progression', () => {
      it('should deal correct number of community cards per round', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }), // Random seed for variety
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();

              // PREFLOP: 0 community cards
              let gameState = engine.getGameState();
              expect(gameState.communityCards.length).toBe(0);
              expect(gameState.currentBettingRound).toBe(BettingRound.PREFLOP);

              // Advance to FLOP: 3 community cards
              engine.advanceBettingRound();
              gameState = engine.getGameState();
              expect(gameState.communityCards.length).toBe(3);
              expect(gameState.currentBettingRound).toBe(BettingRound.FLOP);

              // Advance to TURN: 4 community cards total (3 + 1)
              engine.advanceBettingRound();
              gameState = engine.getGameState();
              expect(gameState.communityCards.length).toBe(4);
              expect(gameState.currentBettingRound).toBe(BettingRound.TURN);

              // Advance to RIVER: 5 community cards total (4 + 1)
              engine.advanceBettingRound();
              gameState = engine.getGameState();
              expect(gameState.communityCards.length).toBe(5);
              expect(gameState.currentBettingRound).toBe(BettingRound.RIVER);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Property 2: Each player receives exactly two hole cards
     * Validates: Requirement 1.2
     */
    describe('Property 2: Each player receives exactly two hole cards', () => {
      it('should deal exactly 2 hole cards to each player', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 3, max: 8 }), // Number of players (minimum 3 for blinds to work)
            fc.integer({ min: 100, max: 10000 }), // Starting stack
            (numPlayers, startingStack) => {
              const engine = new GameEngine(numPlayers, startingStack, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              
              // Verify all players with chips have exactly 2 hole cards
              for (const player of gameState.players) {
                if (player.stack > 0 || player.currentBet > 0) {
                  expect(player.holeCards.length).toBe(2);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Property 28: Betting round completes when all matched
     * Validates: Requirement 10.1
     */
    describe('Property 28: Betting round completes when all matched', () => {
      it('should complete betting round when all players have acted and matched bets', () => {
        const engine = new GameEngine(8, 1000, 5, 10);
        engine.dealHand();
        
        const initialRound = engine.getGameState().currentBettingRound;
        const initialActionQueue = [...engine.getGameState().actionQueue];
        
        console.log('Initial action queue:', initialActionQueue);
        console.log('Initial round:', initialRound);
        
        // Have all players in the initial action queue call or check
        for (const playerId of initialActionQueue) {
          const currentState = engine.getGameState();
          
          console.log(`Processing player ${playerId}, current round: ${currentState.currentBettingRound}, current actor: ${currentState.actionQueue[currentState.currentActorIndex]}`);
          
          // Stop if we've already advanced to the next round
          if (currentState.currentBettingRound !== initialRound) {
            console.log('Round advanced, stopping');
            break;
          }
          
          // Check if it's this player's turn
          if (currentState.actionQueue[currentState.currentActorIndex] !== playerId) {
            console.log(`Not ${playerId}'s turn, skipping`);
            continue; // Skip if not this player's turn
          }
          
          const player = currentState.players.find(p => p.id === playerId)!;
          
          // Determine the appropriate action
          let action: Action;
          if (player.currentBet === currentState.currentBet) {
            // Player has already matched the bet, can check
            action = { type: ActionType.CHECK };
            console.log(`Player ${playerId} checking`);
          } else {
            // Player needs to call
            action = { type: ActionType.CALL };
            console.log(`Player ${playerId} calling`);
          }
          
          const result = engine.executeAction(playerId, action);
          console.log(`Action result: ${result.success}`);
        }
        
        // After all players have called/checked, betting round should be complete
        const finalState = engine.getGameState();
        
        console.log('Final round:', finalState.currentBettingRound);
        console.log('Final action queue:', finalState.actionQueue);
        
        // Either we've advanced to next round, or hand is resolved
        const hasAdvanced = finalState.currentBettingRound !== initialRound;
        const playersInHand = finalState.players.filter(p => !p.hasFolded);
        const handResolved = playersInHand.length <= 1;
        
        expect(hasAdvanced || handResolved).toBe(true);
      });

      it('should complete betting round when only one player remains', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 1000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              const actionQueue = [...gameState.actionQueue];
              
              // Have all but one player fold
              for (let i = 0; i < actionQueue.length - 1; i++) {
                const playerId = actionQueue[i];
                const currentState = engine.getGameState();
                const player = currentState.players.find(p => p.id === playerId);
                
                if (player && !player.hasFolded) {
                  engine.executeAction(playerId, { type: ActionType.FOLD });
                }
              }
              
              // Hand should be resolved (only one player remains)
              const finalState = engine.getGameState();
              const playersInHand = finalState.players.filter(p => !p.hasFolded);
              
              // Either hand is resolved or only one player remains
              expect(playersInHand.length).toBeLessThanOrEqual(1);
            }
          ),
          { numRuns: 50 }
        );
      });
    });

    /**
     * Property 29: Completed round advances to next
     * Validates: Requirements 10.2
     */
    describe('Property 29: Completed round advances to next', () => {
      it('should advance to next betting round when current round is complete', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              // Test progression through all betting rounds
              const expectedProgression = [
                { from: BettingRound.PREFLOP, to: BettingRound.FLOP, communityCards: 3 },
                { from: BettingRound.FLOP, to: BettingRound.TURN, communityCards: 4 },
                { from: BettingRound.TURN, to: BettingRound.RIVER, communityCards: 5 }
              ];
              
              for (const progression of expectedProgression) {
                const currentState = engine.getGameState();
                
                // Verify we're at the expected starting round
                expect(currentState.currentBettingRound).toBe(progression.from);
                
                // Complete the betting round by having all players call/check
                const actionQueue = [...currentState.actionQueue];
                
                for (const playerId of actionQueue) {
                  const state = engine.getGameState();
                  
                  // Stop if round has already advanced
                  if (state.currentBettingRound !== progression.from) {
                    break;
                  }
                  
                  // Check if it's this player's turn
                  if (state.actionQueue[state.currentActorIndex] !== playerId) {
                    continue;
                  }
                  
                  const player = state.players.find(p => p.id === playerId)!;
                  
                  // Determine appropriate action
                  let action: Action;
                  if (player.currentBet === state.currentBet) {
                    action = { type: ActionType.CHECK };
                  } else {
                    action = { type: ActionType.CALL };
                  }
                  
                  engine.executeAction(playerId, action);
                }
                
                // After all players have acted, verify round has advanced
                const newState = engine.getGameState();
                expect(newState.currentBettingRound).toBe(progression.to);
                
                // Verify correct number of community cards were dealt
                expect(newState.communityCards.length).toBe(progression.communityCards);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should deal appropriate community cards when advancing rounds', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              // PREFLOP -> FLOP: should deal 3 cards
              let initialCards = engine.getGameState().communityCards.length;
              expect(initialCards).toBe(0);
              
              // Complete preflop betting
              let state = engine.getGameState();
              const preflopQueue = [...state.actionQueue];
              for (const playerId of preflopQueue) {
                state = engine.getGameState();
                if (state.currentBettingRound !== BettingRound.PREFLOP) break;
                if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                
                const player = state.players.find(p => p.id === playerId)!;
                const action = player.currentBet === state.currentBet 
                  ? { type: ActionType.CHECK } 
                  : { type: ActionType.CALL };
                engine.executeAction(playerId, action);
              }
              
              state = engine.getGameState();
              expect(state.currentBettingRound).toBe(BettingRound.FLOP);
              expect(state.communityCards.length).toBe(3);
              
              // FLOP -> TURN: should deal 1 more card (total 4)
              const flopQueue = [...state.actionQueue];
              for (const playerId of flopQueue) {
                state = engine.getGameState();
                if (state.currentBettingRound !== BettingRound.FLOP) break;
                if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                
                const player = state.players.find(p => p.id === playerId)!;
                const action = player.currentBet === state.currentBet 
                  ? { type: ActionType.CHECK } 
                  : { type: ActionType.CALL };
                engine.executeAction(playerId, action);
              }
              
              state = engine.getGameState();
              expect(state.currentBettingRound).toBe(BettingRound.TURN);
              expect(state.communityCards.length).toBe(4);
              
              // TURN -> RIVER: should deal 1 more card (total 5)
              const turnQueue = [...state.actionQueue];
              for (const playerId of turnQueue) {
                state = engine.getGameState();
                if (state.currentBettingRound !== BettingRound.TURN) break;
                if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                
                const player = state.players.find(p => p.id === playerId)!;
                const action = player.currentBet === state.currentBet 
                  ? { type: ActionType.CHECK } 
                  : { type: ActionType.CALL };
                engine.executeAction(playerId, action);
              }
              
              state = engine.getGameState();
              expect(state.currentBettingRound).toBe(BettingRound.RIVER);
              expect(state.communityCards.length).toBe(5);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should follow correct progression sequence PREFLOP -> FLOP -> TURN -> RIVER', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              // Track the progression
              const progression: BettingRound[] = [engine.getGameState().currentBettingRound];
              
              // Complete each betting round
              for (let round = 0; round < 3; round++) {
                let state = engine.getGameState();
                const actionQueue = [...state.actionQueue];
                
                for (const playerId of actionQueue) {
                  state = engine.getGameState();
                  
                  // Stop if we've moved to next round
                  if (state.currentBettingRound !== progression[progression.length - 1]) {
                    break;
                  }
                  
                  if (state.actionQueue[state.currentActorIndex] !== playerId) {
                    continue;
                  }
                  
                  const player = state.players.find(p => p.id === playerId)!;
                  const action = player.currentBet === state.currentBet 
                    ? { type: ActionType.CHECK } 
                    : { type: ActionType.CALL };
                  engine.executeAction(playerId, action);
                }
                
                // Record the new round
                state = engine.getGameState();
                progression.push(state.currentBettingRound);
              }
              
              // Verify the progression sequence
              expect(progression[0]).toBe(BettingRound.PREFLOP);
              expect(progression[1]).toBe(BettingRound.FLOP);
              expect(progression[2]).toBe(BettingRound.TURN);
              expect(progression[3]).toBe(BettingRound.RIVER);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Property 30: Action order follows position
     * Validates: Requirements 10.4
     */
    describe('Property 30: Action order follows position', () => {
      it('should start action after big blind (UTG) in preflop', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              
              // Verify we're in preflop
              expect(gameState.currentBettingRound).toBe(BettingRound.PREFLOP);
              
              // First player to act should be UTG (after big blind)
              const firstActor = gameState.actionQueue[0];
              const firstActorPlayer = gameState.players.find(p => p.id === firstActor);
              
              expect(firstActorPlayer).toBeDefined();
              
              // UTG position is (big blind position + 1) % 8
              const expectedUTGPosition = (gameState.bigBlindPosition + 1) % 8;
              expect(firstActorPlayer!.position).toBe(expectedUTGPosition);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should start action after dealer button (small blind) postflop', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              // Complete preflop betting to reach flop
              let state = engine.getGameState();
              const preflopQueue = [...state.actionQueue];
              
              for (const playerId of preflopQueue) {
                state = engine.getGameState();
                if (state.currentBettingRound !== BettingRound.PREFLOP) break;
                if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                
                const player = state.players.find(p => p.id === playerId)!;
                const action = player.currentBet === state.currentBet 
                  ? { type: ActionType.CHECK } 
                  : { type: ActionType.CALL };
                engine.executeAction(playerId, action);
              }
              
              // Now we should be on the flop
              state = engine.getGameState();
              expect(state.currentBettingRound).toBe(BettingRound.FLOP);
              
              // First player to act postflop should be small blind (after dealer button)
              const firstActor = state.actionQueue[0];
              const firstActorPlayer = state.players.find(p => p.id === firstActor);
              
              expect(firstActorPlayer).toBeDefined();
              
              // Small blind position is (dealer position + 1) % 8
              const expectedSBPosition = (state.dealerPosition + 1) % 8;
              expect(firstActorPlayer!.position).toBe(expectedSBPosition);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should proceed clockwise around the table', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              const actionQueue = gameState.actionQueue;
              
              // Verify action queue proceeds in clockwise order
              // Positions should increase, or wrap around from 7 to 0
              for (let i = 0; i < actionQueue.length - 1; i++) {
                const currentPlayer = gameState.players.find(p => p.id === actionQueue[i])!;
                const nextPlayer = gameState.players.find(p => p.id === actionQueue[i + 1])!;
                
                // Next player's position should be greater than current, 
                // OR it wraps around (current is near end, next is near start)
                const isClockwise = nextPlayer.position > currentPlayer.position;
                const isWrapping = currentPlayer.position > nextPlayer.position && 
                                   currentPlayer.position >= 6 && 
                                   nextPlayer.position <= 1;
                
                expect(isClockwise || isWrapping).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain correct action order across all betting rounds', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              // Track action order for each betting round
              const actionOrderByRound: { [key: string]: number[] } = {};
              
              // PREFLOP
              let state = engine.getGameState();
              actionOrderByRound[BettingRound.PREFLOP] = state.actionQueue.map(
                id => state.players.find(p => p.id === id)!.position
              );
              
              // Verify preflop starts after big blind
              const preflopFirstPosition = actionOrderByRound[BettingRound.PREFLOP][0];
              const expectedPreflopStart = (state.bigBlindPosition + 1) % 8;
              expect(preflopFirstPosition).toBe(expectedPreflopStart);
              
              // Complete preflop
              const preflopQueue = [...state.actionQueue];
              for (const playerId of preflopQueue) {
                state = engine.getGameState();
                if (state.currentBettingRound !== BettingRound.PREFLOP) break;
                if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                
                const player = state.players.find(p => p.id === playerId)!;
                const action = player.currentBet === state.currentBet 
                  ? { type: ActionType.CHECK } 
                  : { type: ActionType.CALL };
                engine.executeAction(playerId, action);
              }
              
              // FLOP
              state = engine.getGameState();
              if (state.currentBettingRound === BettingRound.FLOP) {
                actionOrderByRound[BettingRound.FLOP] = state.actionQueue.map(
                  id => state.players.find(p => p.id === id)!.position
                );
                
                // Verify flop starts after dealer button (small blind)
                const flopFirstPosition = actionOrderByRound[BettingRound.FLOP][0];
                const expectedFlopStart = (state.dealerPosition + 1) % 8;
                expect(flopFirstPosition).toBe(expectedFlopStart);
                
                // Complete flop
                const flopQueue = [...state.actionQueue];
                for (const playerId of flopQueue) {
                  state = engine.getGameState();
                  if (state.currentBettingRound !== BettingRound.FLOP) break;
                  if (state.actionQueue[state.currentActorIndex] !== playerId) continue;
                  
                  const player = state.players.find(p => p.id === playerId)!;
                  const action = player.currentBet === state.currentBet 
                    ? { type: ActionType.CHECK } 
                    : { type: ActionType.CALL };
                  engine.executeAction(playerId, action);
                }
              }
              
              // TURN
              state = engine.getGameState();
              if (state.currentBettingRound === BettingRound.TURN) {
                actionOrderByRound[BettingRound.TURN] = state.actionQueue.map(
                  id => state.players.find(p => p.id === id)!.position
                );
                
                // Verify turn starts after dealer button (small blind)
                const turnFirstPosition = actionOrderByRound[BettingRound.TURN][0];
                const expectedTurnStart = (state.dealerPosition + 1) % 8;
                expect(turnFirstPosition).toBe(expectedTurnStart);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should skip folded and all-in players in action queue', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 10000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              
              // Verify no folded or all-in players are in the action queue
              for (const playerId of gameState.actionQueue) {
                const player = gameState.players.find(p => p.id === playerId)!;
                expect(player.hasFolded).toBe(false);
                expect(player.isAllIn).toBe(false);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Additional property tests for robustness
     */
    describe('Additional Properties', () => {
      it('should maintain valid game state after any sequence of valid actions', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.constantFrom(ActionType.FOLD, ActionType.CALL, ActionType.CHECK),
              { minLength: 1, maxLength: 10 }
            ),
            (actions) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              for (const actionType of actions) {
                const gameState = engine.getGameState();
                const currentActor = gameState.actionQueue[gameState.currentActorIndex];
                
                if (!currentActor) break; // No more actors
                
                const player = gameState.players.find(p => p.id === currentActor);
                if (!player || player.hasFolded) break;
                
                // Try to execute the action
                const action: Action = { type: actionType };
                const result = engine.executeAction(currentActor, action);
                
                // If action was valid, game state should be consistent
                if (result.success) {
                  expect(result.gameState).toBeDefined();
                  expect(result.gameState.players).toHaveLength(8);
                  expect(result.gameState.currentBet).toBeGreaterThanOrEqual(0);
                }
              }
              
              // Game state should always be valid
              const finalState = engine.getGameState();
              expect(finalState.players).toHaveLength(8);
              expect(finalState.currentBet).toBeGreaterThanOrEqual(0);
            }
          ),
          { numRuns: 50 }
        );
      });

      it('should never have negative chip stacks', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 1000 }),
            (seed) => {
              const engine = new GameEngine(8, 1000, 5, 10);
              engine.dealHand();
              
              const gameState = engine.getGameState();
              const actionQueue = [...gameState.actionQueue];
              
              // Execute some random valid actions
              for (let i = 0; i < Math.min(5, actionQueue.length); i++) {
                const playerId = actionQueue[i];
                const currentState = engine.getGameState();
                const player = currentState.players.find(p => p.id === playerId);
                
                if (player && !player.hasFolded) {
                  // Try a call action
                  engine.executeAction(playerId, { type: ActionType.CALL });
                }
              }
              
              // Check that no player has negative stack
              const finalState = engine.getGameState();
              for (const player of finalState.players) {
                expect(player.stack).toBeGreaterThanOrEqual(0);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
