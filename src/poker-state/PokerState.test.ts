import { PokerState } from './PokerState';
import { BettingRound, Rank, Suit } from '../types/enums';
import { Card } from '../types/core';
import * as fc from 'fast-check';

describe('PokerState', () => {
  let pokerState: PokerState;

  beforeEach(() => {
    pokerState = new PokerState(8, 1000, 5, 10);
  });

  describe('Initialization', () => {
    it('should initialize with 8 players', () => {
      const state = pokerState.getGameState();
      expect(state.players).toHaveLength(8);
    });

    it('should initialize players with correct starting stacks', () => {
      const state = pokerState.getGameState();
      state.players.forEach(player => {
        expect(player.stack).toBe(1000);
      });
    });

    it('should set first player as human and rest as AI', () => {
      const state = pokerState.getGameState();
      expect(state.players[0].isAI).toBe(false);
      expect(state.players[0].name).toBe('You');
      
      for (let i = 1; i < 8; i++) {
        expect(state.players[i].isAI).toBe(true);
        expect(state.players[i].name).toBe(`AI ${i}`);
      }
    });

    it('should initialize with dealer at position 0', () => {
      const state = pokerState.getGameState();
      expect(state.dealerPosition).toBe(0);
      expect(state.smallBlindPosition).toBe(1);
      expect(state.bigBlindPosition).toBe(2);
    });

    it('should initialize with preflop betting round', () => {
      const state = pokerState.getGameState();
      expect(state.currentBettingRound).toBe(BettingRound.PREFLOP);
    });

    it('should initialize with main pot', () => {
      const state = pokerState.getGameState();
      expect(state.pots).toHaveLength(1);
      expect(state.pots[0].isMainPot).toBe(true);
      expect(state.pots[0].amount).toBe(0);
    });

    it('should initialize with hand number 0', () => {
      expect(pokerState.getHandNumber()).toBe(0);
    });
  });

  describe('Player Management', () => {
    it('should add a new player', () => {
      const playerId = pokerState.addPlayer('New Player', 500, true);
      const player = pokerState.getPlayer(playerId);
      
      expect(player).toBeDefined();
      expect(player?.name).toBe('New Player');
      expect(player?.stack).toBe(500);
      expect(player?.isAI).toBe(true);
      expect(player?.position).toBe(8);
    });

    it('should remove a player', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[3].id;
      
      const removed = pokerState.removePlayer(playerId);
      expect(removed).toBe(true);
      
      const player = pokerState.getPlayer(playerId);
      expect(player).toBeUndefined();
      
      const newState = pokerState.getGameState();
      expect(newState.players).toHaveLength(7);
    });

    it('should update positions after removing a player', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[3].id;
      
      pokerState.removePlayer(playerId);
      
      const newState = pokerState.getGameState();
      newState.players.forEach((player, index) => {
        expect(player.position).toBe(index);
      });
    });

    it('should return false when removing non-existent player', () => {
      const removed = pokerState.removePlayer('non_existent');
      expect(removed).toBe(false);
    });

    it('should get player by ID', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[2].id;
      
      const player = pokerState.getPlayer(playerId);
      expect(player).toBeDefined();
      expect(player?.id).toBe(playerId);
    });

    it('should get player by position', () => {
      const player = pokerState.getPlayerByPosition(3);
      expect(player).toBeDefined();
      expect(player?.position).toBe(3);
    });

    it('should return undefined for invalid position', () => {
      const player = pokerState.getPlayerByPosition(99);
      expect(player).toBeUndefined();
    });
  });

  describe('Stack Management', () => {
    it('should update player stack', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      const updated = pokerState.updatePlayerStack(playerId, 1500);
      expect(updated).toBe(true);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.stack).toBe(1500);
    });

    it('should not allow negative stacks', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      pokerState.updatePlayerStack(playerId, -100);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.stack).toBe(0);
    });

    it('should add to player stack', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      pokerState.addToPlayerStack(playerId, 500);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.stack).toBe(1500);
    });

    it('should subtract from player stack', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      const success = pokerState.subtractFromPlayerStack(playerId, 300);
      expect(success).toBe(true);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.stack).toBe(700);
    });

    it('should not subtract more than available stack', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      const success = pokerState.subtractFromPlayerStack(playerId, 1500);
      expect(success).toBe(false);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.stack).toBe(1000); // Unchanged
    });
  });

  describe('Player State Management', () => {
    it('should set player bet', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      pokerState.setPlayerBet(playerId, 50);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.currentBet).toBe(50);
    });

    it('should mark player as folded', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      pokerState.setPlayerFolded(playerId, true);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.hasFolded).toBe(true);
    });

    it('should mark player as all-in', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      pokerState.setPlayerAllIn(playerId, true);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.isAllIn).toBe(true);
    });

    it('should deal hole cards to player', () => {
      const state = pokerState.getGameState();
      const playerId = state.players[0].id;
      
      const cards: Card[] = [
        { rank: Rank.ACE, suit: Suit.SPADES },
        { rank: Rank.KING, suit: Suit.HEARTS }
      ];
      
      pokerState.dealHoleCards(playerId, cards);
      
      const player = pokerState.getPlayer(playerId);
      expect(player?.holeCards).toHaveLength(2);
      expect(player?.holeCards[0]).toEqual(cards[0]);
      expect(player?.holeCards[1]).toEqual(cards[1]);
    });

    it('should clear all hole cards', () => {
      const state = pokerState.getGameState();
      
      // Deal cards to all players
      state.players.forEach(player => {
        const cards: Card[] = [
          { rank: Rank.ACE, suit: Suit.SPADES },
          { rank: Rank.KING, suit: Suit.HEARTS }
        ];
        pokerState.dealHoleCards(player.id, cards);
      });
      
      pokerState.clearAllHoleCards();
      
      const newState = pokerState.getGameState();
      newState.players.forEach(player => {
        expect(player.holeCards).toHaveLength(0);
      });
    });
  });

  describe('Active Players', () => {
    it('should get active players (not folded, have chips)', () => {
      const state = pokerState.getGameState();
      
      // Fold one player
      pokerState.setPlayerFolded(state.players[0].id, true);
      
      // Set another player to 0 chips
      pokerState.updatePlayerStack(state.players[1].id, 0);
      
      const activePlayers = pokerState.getActivePlayers();
      expect(activePlayers).toHaveLength(6);
    });

    it('should get players in hand (not folded)', () => {
      const state = pokerState.getGameState();
      
      // Fold two players
      pokerState.setPlayerFolded(state.players[0].id, true);
      pokerState.setPlayerFolded(state.players[1].id, true);
      
      const playersInHand = pokerState.getPlayersInHand();
      expect(playersInHand).toHaveLength(6);
    });
  });

  describe('Position Tracking - Dealer Button', () => {
    it('should rotate dealer button clockwise', () => {
      expect(pokerState.getDealerPosition()).toBe(0);
      expect(pokerState.getSmallBlindPosition()).toBe(1);
      expect(pokerState.getBigBlindPosition()).toBe(2);
      
      pokerState.rotateDealer();
      
      expect(pokerState.getDealerPosition()).toBe(1);
      expect(pokerState.getSmallBlindPosition()).toBe(2);
      expect(pokerState.getBigBlindPosition()).toBe(3);
    });

    it('should wrap dealer button around table', () => {
      pokerState.setDealerPosition(7);
      
      pokerState.rotateDealer();
      
      expect(pokerState.getDealerPosition()).toBe(0);
      expect(pokerState.getSmallBlindPosition()).toBe(1);
      expect(pokerState.getBigBlindPosition()).toBe(2);
    });

    it('should set dealer position manually', () => {
      pokerState.setDealerPosition(5);
      
      expect(pokerState.getDealerPosition()).toBe(5);
      expect(pokerState.getSmallBlindPosition()).toBe(6);
      expect(pokerState.getBigBlindPosition()).toBe(7);
    });

    it('should handle dealer position wrapping when set manually', () => {
      pokerState.setDealerPosition(6);
      
      expect(pokerState.getDealerPosition()).toBe(6);
      expect(pokerState.getSmallBlindPosition()).toBe(7);
      expect(pokerState.getBigBlindPosition()).toBe(0);
    });
  });

  describe('Community Cards', () => {
    it('should add community cards', () => {
      const cards: Card[] = [
        { rank: Rank.ACE, suit: Suit.SPADES },
        { rank: Rank.KING, suit: Suit.HEARTS },
        { rank: Rank.QUEEN, suit: Suit.DIAMONDS }
      ];
      
      pokerState.addCommunityCards(cards);
      
      const communityCards = pokerState.getCommunityCards();
      expect(communityCards).toHaveLength(3);
      expect(communityCards).toEqual(cards);
    });

    it('should add cards incrementally', () => {
      const flop: Card[] = [
        { rank: Rank.ACE, suit: Suit.SPADES },
        { rank: Rank.KING, suit: Suit.HEARTS },
        { rank: Rank.QUEEN, suit: Suit.DIAMONDS }
      ];
      
      pokerState.addCommunityCards(flop);
      expect(pokerState.getCommunityCards()).toHaveLength(3);
      
      const turn: Card[] = [{ rank: Rank.JACK, suit: Suit.CLUBS }];
      pokerState.addCommunityCards(turn);
      expect(pokerState.getCommunityCards()).toHaveLength(4);
      
      const river: Card[] = [{ rank: Rank.TEN, suit: Suit.SPADES }];
      pokerState.addCommunityCards(river);
      expect(pokerState.getCommunityCards()).toHaveLength(5);
    });

    it('should clear community cards', () => {
      const cards: Card[] = [
        { rank: Rank.ACE, suit: Suit.SPADES },
        { rank: Rank.KING, suit: Suit.HEARTS }
      ];
      
      pokerState.addCommunityCards(cards);
      expect(pokerState.getCommunityCards()).toHaveLength(2);
      
      pokerState.clearCommunityCards();
      expect(pokerState.getCommunityCards()).toHaveLength(0);
    });
  });

  describe('Betting Round Management', () => {
    it('should set betting round', () => {
      pokerState.setBettingRound(BettingRound.FLOP);
      expect(pokerState.getBettingRound()).toBe(BettingRound.FLOP);
    });

    it('should advance betting round', () => {
      expect(pokerState.getBettingRound()).toBe(BettingRound.PREFLOP);
      
      pokerState.advanceBettingRound();
      expect(pokerState.getBettingRound()).toBe(BettingRound.FLOP);
      
      pokerState.advanceBettingRound();
      expect(pokerState.getBettingRound()).toBe(BettingRound.TURN);
      
      pokerState.advanceBettingRound();
      expect(pokerState.getBettingRound()).toBe(BettingRound.RIVER);
    });

    it('should not advance past river', () => {
      pokerState.setBettingRound(BettingRound.RIVER);
      
      const advanced = pokerState.advanceBettingRound();
      expect(advanced).toBe(false);
      expect(pokerState.getBettingRound()).toBe(BettingRound.RIVER);
    });
  });

  describe('Betting State', () => {
    it('should set and get current bet', () => {
      pokerState.setCurrentBet(50);
      expect(pokerState.getCurrentBet()).toBe(50);
    });

    it('should not allow negative current bet', () => {
      pokerState.setCurrentBet(-10);
      expect(pokerState.getCurrentBet()).toBe(0);
    });

    it('should set and get minimum raise', () => {
      pokerState.setMinimumRaise(20);
      expect(pokerState.getMinimumRaise()).toBe(20);
    });

    it('should not allow negative minimum raise', () => {
      pokerState.setMinimumRaise(-5);
      expect(pokerState.getMinimumRaise()).toBe(0);
    });

    it('should reset player bets', () => {
      const state = pokerState.getGameState();
      
      // Set bets for all players
      state.players.forEach(player => {
        pokerState.setPlayerBet(player.id, 50);
      });
      
      pokerState.resetPlayerBets();
      
      const newState = pokerState.getGameState();
      newState.players.forEach(player => {
        expect(player.currentBet).toBe(0);
      });
    });
  });

  describe('Pot Management', () => {
    it('should get all pots', () => {
      const pots = pokerState.getPots();
      expect(pots).toHaveLength(1);
      expect(pots[0].isMainPot).toBe(true);
    });

    it('should get main pot', () => {
      const mainPot = pokerState.getMainPot();
      expect(mainPot).toBeDefined();
      expect(mainPot?.isMainPot).toBe(true);
    });

    it('should add to main pot', () => {
      pokerState.addToMainPot(100);
      
      const mainPot = pokerState.getMainPot();
      expect(mainPot?.amount).toBe(100);
    });

    it('should get total pot amount', () => {
      pokerState.addToMainPot(100);
      expect(pokerState.getTotalPot()).toBe(100);
    });

    it('should create side pot', () => {
      const state = pokerState.getGameState();
      const eligiblePlayers = [state.players[0].id, state.players[1].id];
      
      pokerState.createSidePot(50, eligiblePlayers);
      
      const pots = pokerState.getPots();
      expect(pots).toHaveLength(2);
      expect(pots[1].isMainPot).toBe(false);
      expect(pots[1].amount).toBe(50);
      expect(pots[1].eligiblePlayers).toEqual(eligiblePlayers);
    });

    it('should calculate total pot with side pots', () => {
      const state = pokerState.getGameState();
      
      pokerState.addToMainPot(100);
      pokerState.createSidePot(50, [state.players[0].id, state.players[1].id]);
      pokerState.createSidePot(30, [state.players[0].id]);
      
      expect(pokerState.getTotalPot()).toBe(180);
    });

    it('should clear pots', () => {
      const state = pokerState.getGameState();
      
      pokerState.addToMainPot(100);
      pokerState.createSidePot(50, [state.players[0].id]);
      
      pokerState.clearPots();
      
      const pots = pokerState.getPots();
      expect(pots).toHaveLength(1);
      expect(pots[0].isMainPot).toBe(true);
      expect(pots[0].amount).toBe(0);
    });
  });

  describe('Action Queue', () => {
    it('should set action queue', () => {
      const state = pokerState.getGameState();
      const playerIds = state.players.map(p => p.id);
      
      pokerState.setActionQueue(playerIds);
      pokerState.resetActorIndex();
      
      const currentActor = pokerState.getCurrentActor();
      expect(currentActor).toBe(playerIds[0]);
    });

    it('should advance actor', () => {
      const state = pokerState.getGameState();
      const playerIds = state.players.map(p => p.id);
      
      pokerState.setActionQueue(playerIds);
      pokerState.resetActorIndex();
      
      expect(pokerState.getCurrentActor()).toBe(playerIds[0]);
      
      pokerState.advanceActor();
      expect(pokerState.getCurrentActor()).toBe(playerIds[1]);
      
      pokerState.advanceActor();
      expect(pokerState.getCurrentActor()).toBe(playerIds[2]);
    });

    it('should return false when no more actors', () => {
      const state = pokerState.getGameState();
      const playerIds = [state.players[0].id, state.players[1].id];
      
      pokerState.setActionQueue(playerIds);
      pokerState.resetActorIndex();
      
      pokerState.advanceActor(); // Move to second player
      const canAdvance = pokerState.advanceActor(); // Try to move past last player
      
      expect(canAdvance).toBe(false);
    });

    it('should return undefined when actor index is out of bounds', () => {
      pokerState.setActionQueue([]);
      pokerState.resetActorIndex();
      
      const currentActor = pokerState.getCurrentActor();
      expect(currentActor).toBeUndefined();
    });
  });

  describe('Action History', () => {
    it('should record actions', () => {
      const state = pokerState.getGameState();
      const record = {
        handNumber: 1,
        bettingRound: BettingRound.PREFLOP,
        playerId: state.players[0].id,
        action: { type: 'CALL' as any, amount: 10 },
        timestamp: Date.now(),
        potSizeAfter: 20,
        stackAfter: 990
      };
      
      pokerState.recordAction(record);
      
      const history = pokerState.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(record);
    });

    it('should maintain action history across multiple actions', () => {
      const state = pokerState.getGameState();
      
      for (let i = 0; i < 3; i++) {
        const record = {
          handNumber: 1,
          bettingRound: BettingRound.PREFLOP,
          playerId: state.players[i].id,
          action: { type: 'CALL' as any, amount: 10 },
          timestamp: Date.now(),
          potSizeAfter: (i + 1) * 10,
          stackAfter: 990
        };
        pokerState.recordAction(record);
      }
      
      const history = pokerState.getActionHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe('New Hand', () => {
    it('should start a new hand', () => {
      const state = pokerState.getGameState();
      
      // Set up some state
      pokerState.addCommunityCards([{ rank: Rank.ACE, suit: Suit.SPADES }]);
      pokerState.setPlayerBet(state.players[0].id, 50);
      pokerState.setPlayerFolded(state.players[1].id, true);
      pokerState.setBettingRound(BettingRound.FLOP);
      pokerState.addToMainPot(100);
      
      pokerState.startNewHand();
      
      const newState = pokerState.getGameState();
      
      // Verify hand number incremented
      expect(newState.handNumber).toBe(1);
      
      // Verify cards cleared
      expect(newState.communityCards).toHaveLength(0);
      newState.players.forEach(player => {
        expect(player.holeCards).toHaveLength(0);
      });
      
      // Verify betting state reset
      expect(newState.currentBettingRound).toBe(BettingRound.PREFLOP);
      expect(newState.currentBet).toBe(0);
      expect(newState.minimumRaise).toBe(0);
      
      // Verify player states reset
      newState.players.forEach(player => {
        expect(player.currentBet).toBe(0);
        expect(player.hasFolded).toBe(false);
        expect(player.isAllIn).toBe(false);
      });
      
      // Verify pots reset
      expect(newState.pots).toHaveLength(1);
      expect(newState.pots[0].amount).toBe(0);
      
      // Verify action queue cleared
      expect(newState.actionQueue).toHaveLength(0);
    });

    it('should preserve player stacks across hands', () => {
      const state = pokerState.getGameState();
      
      // Modify stacks
      pokerState.updatePlayerStack(state.players[0].id, 1500);
      pokerState.updatePlayerStack(state.players[1].id, 800);
      
      pokerState.startNewHand();
      
      const newState = pokerState.getGameState();
      expect(newState.players[0].stack).toBe(1500);
      expect(newState.players[1].stack).toBe(800);
    });
  });

  describe('Game State Immutability', () => {
    it('should return a copy of game state', () => {
      const state1 = pokerState.getGameState();
      const state2 = pokerState.getGameState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same content
    });

    it('should not allow external modification of game state', () => {
      const state = pokerState.getGameState();
      state.currentBet = 999;
      
      const newState = pokerState.getGameState();
      expect(newState.currentBet).not.toBe(999);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 3: Dealer button rotates clockwise', () => {
      it('**Validates: Requirements 1.6** - dealer position should increment by 1 modulo numPlayers after each rotation', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 10 }), // Number of players (2-10)
            fc.integer({ min: 0, max: 9 }), // Initial dealer position
            fc.integer({ min: 1, max: 100 }), // Number of rotations
            (numPlayers, initialPosition, numRotations) => {
              // Create a poker state with the specified number of players
              const state = new PokerState(numPlayers, 1000, 5, 10);
              
              // Set initial dealer position (modulo numPlayers to ensure valid)
              const validInitialPosition = initialPosition % numPlayers;
              state.setDealerPosition(validInitialPosition);
              
              // Perform rotations and verify each one
              for (let i = 0; i < numRotations; i++) {
                const positionBefore = state.getDealerPosition();
                state.rotateDealer();
                const positionAfter = state.getDealerPosition();
                
                // Verify dealer position incremented by 1 modulo numPlayers
                const expectedPosition = (positionBefore + 1) % numPlayers;
                expect(positionAfter).toBe(expectedPosition);
                
                // Verify small blind is dealer + 1
                expect(state.getSmallBlindPosition()).toBe((positionAfter + 1) % numPlayers);
                
                // Verify big blind is dealer + 2
                expect(state.getBigBlindPosition()).toBe((positionAfter + 2) % numPlayers);
              }
              
              // Verify final position after all rotations
              const finalPosition = state.getDealerPosition();
              const expectedFinalPosition = (validInitialPosition + numRotations) % numPlayers;
              expect(finalPosition).toBe(expectedFinalPosition);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 1.6** - dealer button should wrap around the table correctly', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 10 }), // Number of players
            (numPlayers) => {
              const state = new PokerState(numPlayers, 1000, 5, 10);
              
              // Set dealer to last position
              state.setDealerPosition(numPlayers - 1);
              
              // Rotate - should wrap to position 0
              state.rotateDealer();
              
              expect(state.getDealerPosition()).toBe(0);
              expect(state.getSmallBlindPosition()).toBe(1);
              expect(state.getBigBlindPosition()).toBe(2 % numPlayers);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 1.6** - multiple complete rotations should return to starting position', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 10 }), // Number of players
            fc.integer({ min: 0, max: 9 }), // Initial dealer position
            fc.integer({ min: 1, max: 10 }), // Number of complete cycles
            (numPlayers, initialPosition, numCycles) => {
              const state = new PokerState(numPlayers, 1000, 5, 10);
              
              const validInitialPosition = initialPosition % numPlayers;
              state.setDealerPosition(validInitialPosition);
              
              // Rotate exactly numPlayers * numCycles times (complete cycles)
              const totalRotations = numPlayers * numCycles;
              for (let i = 0; i < totalRotations; i++) {
                state.rotateDealer();
              }
              
              // Should be back at the starting position
              expect(state.getDealerPosition()).toBe(validInitialPosition);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 4: Blinds are posted at hand start', () => {
      it('**Validates: Requirements 1.7** - small blind and big blind positions should have correct amounts posted before any other actions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 3, max: 10 }), // Number of players (at least 3 for dealer, SB, BB to be different)
            fc.integer({ min: 1, max: 100 }), // Small blind amount
            fc.integer({ min: 1000, max: 10000 }), // Starting stack
            (numPlayers, smallBlindAmount, startingStack) => {
              const bigBlindAmount = smallBlindAmount * 2;
              
              // Ensure players have enough chips for blinds
              if (startingStack < bigBlindAmount) {
                return; // Skip this test case
              }
              
              const state = new PokerState(numPlayers, startingStack, smallBlindAmount, bigBlindAmount);
              
              // Get initial state
              const gameState = state.getGameState();
              const sbPosition = gameState.smallBlindPosition;
              const bbPosition = gameState.bigBlindPosition;
              
              // Get players at blind positions
              const sbPlayer = state.getPlayerByPosition(sbPosition);
              const bbPlayer = state.getPlayerByPosition(bbPosition);
              
              expect(sbPlayer).toBeDefined();
              expect(bbPlayer).toBeDefined();
              
              if (!sbPlayer || !bbPlayer) return;
              
              // Verify they are different players
              expect(sbPlayer.id).not.toBe(bbPlayer.id);
              
              // Record initial stacks
              const sbInitialStack = sbPlayer.stack;
              const bbInitialStack = bbPlayer.stack;
              
              // Post blinds by deducting from stacks and adding to pot
              state.subtractFromPlayerStack(sbPlayer.id, smallBlindAmount);
              state.setPlayerBet(sbPlayer.id, smallBlindAmount);
              state.subtractFromPlayerStack(bbPlayer.id, bigBlindAmount);
              state.setPlayerBet(bbPlayer.id, bigBlindAmount);
              state.addToMainPot(smallBlindAmount + bigBlindAmount);
              
              // Verify blinds were posted correctly
              const sbPlayerAfter = state.getPlayer(sbPlayer.id);
              const bbPlayerAfter = state.getPlayer(bbPlayer.id);
              
              expect(sbPlayerAfter?.stack).toBe(sbInitialStack - smallBlindAmount);
              expect(sbPlayerAfter?.currentBet).toBe(smallBlindAmount);
              expect(bbPlayerAfter?.stack).toBe(bbInitialStack - bigBlindAmount);
              expect(bbPlayerAfter?.currentBet).toBe(bigBlindAmount);
              
              // Verify pot has the blind amounts
              const mainPot = state.getMainPot();
              expect(mainPot?.amount).toBe(smallBlindAmount + bigBlindAmount);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 1.7** - blinds should be posted at the correct positions relative to dealer', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 3, max: 10 }), // Number of players (at least 3 for dealer, SB, BB)
            fc.integer({ min: 0, max: 9 }), // Dealer position
            (numPlayers, dealerPos) => {
              const smallBlindAmount = 5;
              const bigBlindAmount = 10;
              const startingStack = 1000;
              
              const state = new PokerState(numPlayers, startingStack, smallBlindAmount, bigBlindAmount);
              
              // Set dealer position
              const validDealerPos = dealerPos % numPlayers;
              state.setDealerPosition(validDealerPos);
              
              // Verify blind positions are correct relative to dealer
              const sbPosition = state.getSmallBlindPosition();
              const bbPosition = state.getBigBlindPosition();
              
              expect(sbPosition).toBe((validDealerPos + 1) % numPlayers);
              expect(bbPosition).toBe((validDealerPos + 2) % numPlayers);
              
              // Post blinds
              const sbPlayer = state.getPlayerByPosition(sbPosition);
              const bbPlayer = state.getPlayerByPosition(bbPosition);
              
              if (!sbPlayer || !bbPlayer) return;
              
              state.subtractFromPlayerStack(sbPlayer.id, smallBlindAmount);
              state.setPlayerBet(sbPlayer.id, smallBlindAmount);
              state.subtractFromPlayerStack(bbPlayer.id, bigBlindAmount);
              state.setPlayerBet(bbPlayer.id, bigBlindAmount);
              state.addToMainPot(smallBlindAmount + bigBlindAmount);
              
              // Verify only the blind positions have bets
              const gameState = state.getGameState();
              gameState.players.forEach(player => {
                if (player.position === sbPosition) {
                  expect(player.currentBet).toBe(smallBlindAmount);
                } else if (player.position === bbPosition) {
                  expect(player.currentBet).toBe(bigBlindAmount);
                } else {
                  expect(player.currentBet).toBe(0);
                }
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 1.7** - blinds should be posted before each new hand', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 20 }), // Number of hands to play
            (numHands) => {
              const numPlayers = 8;
              const smallBlindAmount = 5;
              const bigBlindAmount = 10;
              const startingStack = 10000; // Large stack to avoid running out
              
              const state = new PokerState(numPlayers, startingStack, smallBlindAmount, bigBlindAmount);
              
              for (let hand = 0; hand < numHands; hand++) {
                // Start new hand
                state.startNewHand();
                state.rotateDealer();
                
                const sbPosition = state.getSmallBlindPosition();
                const bbPosition = state.getBigBlindPosition();
                
                const sbPlayer = state.getPlayerByPosition(sbPosition);
                const bbPlayer = state.getPlayerByPosition(bbPosition);
                
                if (!sbPlayer || !bbPlayer) continue;
                
                // Record stacks before posting blinds
                const sbStackBefore = sbPlayer.stack;
                const bbStackBefore = bbPlayer.stack;
                
                // Post blinds
                state.subtractFromPlayerStack(sbPlayer.id, smallBlindAmount);
                state.setPlayerBet(sbPlayer.id, smallBlindAmount);
                state.subtractFromPlayerStack(bbPlayer.id, bigBlindAmount);
                state.setPlayerBet(bbPlayer.id, bigBlindAmount);
                state.addToMainPot(smallBlindAmount + bigBlindAmount);
                
                // Verify blinds were posted
                const sbPlayerAfter = state.getPlayer(sbPlayer.id);
                const bbPlayerAfter = state.getPlayer(bbPlayer.id);
                
                expect(sbPlayerAfter?.stack).toBe(sbStackBefore - smallBlindAmount);
                expect(bbPlayerAfter?.stack).toBe(bbStackBefore - bigBlindAmount);
                
                const mainPot = state.getMainPot();
                expect(mainPot?.amount).toBe(smallBlindAmount + bigBlindAmount);
              }
            }
          ),
          { numRuns: 50 }
        );
      });
    });

    describe('Property 27: Stacks persist across hands', () => {
      it('**Validates: Requirements 9.5** - player stacks should persist from one hand to the next', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 10 }), // Number of players
            fc.array(fc.integer({ min: -500, max: 500 }), { minLength: 1, maxLength: 10 }), // Stack changes per hand
            (numPlayers, stackChanges) => {
              const startingStack = 1000;
              const state = new PokerState(numPlayers, startingStack, 5, 10);
              
              // Track expected stacks
              const expectedStacks = new Map<string, number>();
              const gameState = state.getGameState();
              gameState.players.forEach(player => {
                expectedStacks.set(player.id, player.stack);
              });
              
              // Simulate multiple hands with stack changes
              for (const change of stackChanges) {
                // Modify a random player's stack
                const playerIndex = Math.abs(change) % numPlayers;
                const player = state.getPlayerByPosition(playerIndex);
                
                if (!player) continue;
                
                const currentStack = expectedStacks.get(player.id) || startingStack;
                const newStack = Math.max(0, currentStack + change); // Stack can't go negative
                
                state.updatePlayerStack(player.id, newStack);
                expectedStacks.set(player.id, newStack);
                
                // Start a new hand
                state.startNewHand();
                
                // Verify stack persisted
                const playerAfterNewHand = state.getPlayer(player.id);
                expect(playerAfterNewHand?.stack).toBe(newStack);
              }
              
              // Final verification: all stacks should match expected values
              const finalState = state.getGameState();
              finalState.players.forEach(player => {
                const expectedStack = expectedStacks.get(player.id);
                expect(player.stack).toBe(expectedStack);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.5** - stacks should persist even when other game state is reset', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 10 }), // Number of players
            fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 2, maxLength: 10 }), // New stack values
            (numPlayers, newStacks) => {
              const state = new PokerState(numPlayers, 1000, 5, 10);
              
              // Set custom stacks for each player
              const gameState = state.getGameState();
              const stackMap = new Map<string, number>();
              
              gameState.players.forEach((player, index) => {
                const newStack = newStacks[index % newStacks.length];
                state.updatePlayerStack(player.id, newStack);
                stackMap.set(player.id, newStack);
              });
              
              // Add some game state that should be reset
              state.addCommunityCards([
                { rank: Rank.ACE, suit: Suit.SPADES },
                { rank: Rank.KING, suit: Suit.HEARTS }
              ]);
              state.setPlayerFolded(gameState.players[0].id, true);
              state.setPlayerBet(gameState.players[1].id, 50);
              state.addToMainPot(100);
              
              // Start new hand (should reset game state but preserve stacks)
              state.startNewHand();
              
              const newHandState = state.getGameState();
              
              // Verify game state was reset
              expect(newHandState.communityCards).toHaveLength(0);
              expect(newHandState.players[0].hasFolded).toBe(false);
              expect(newHandState.players[1].currentBet).toBe(0);
              expect(newHandState.pots[0].amount).toBe(0);
              
              // Verify stacks persisted
              newHandState.players.forEach(player => {
                const expectedStack = stackMap.get(player.id);
                expect(player.stack).toBe(expectedStack);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it('**Validates: Requirements 9.5** - stacks should accumulate changes across multiple hands', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 8 }), // Number of players
            fc.integer({ min: 2, max: 10 }), // Number of hands
            (numPlayers, numHands) => {
              const startingStack = 1000;
              const state = new PokerState(numPlayers, startingStack, 5, 10);
              
              // Track cumulative changes for each player
              const cumulativeChanges = new Map<string, number>();
              const gameState = state.getGameState();
              gameState.players.forEach(player => {
                cumulativeChanges.set(player.id, 0);
              });
              
              for (let hand = 0; hand < numHands; hand++) {
                // Simulate some stack changes during the hand
                gameState.players.forEach((player, index) => {
                  // Alternate between winning and losing
                  const change = (hand + index) % 2 === 0 ? 50 : -30;
                  const currentChange = cumulativeChanges.get(player.id) || 0;
                  const newCumulativeChange = currentChange + change;
                  
                  // Don't let stack go negative
                  if (startingStack + newCumulativeChange >= 0) {
                    state.updatePlayerStack(player.id, startingStack + newCumulativeChange);
                    cumulativeChanges.set(player.id, newCumulativeChange);
                  }
                });
                
                // Start new hand
                if (hand < numHands - 1) {
                  state.startNewHand();
                }
              }
              
              // Verify final stacks match cumulative changes
              const finalState = state.getGameState();
              finalState.players.forEach(player => {
                const cumulativeChange = cumulativeChanges.get(player.id) || 0;
                const expectedStack = startingStack + cumulativeChange;
                expect(player.stack).toBe(expectedStack);
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
