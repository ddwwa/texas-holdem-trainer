import { PotManager } from './PotManager';
import { Player } from '../types/core';
import * as fc from 'fast-check';

describe('PotManager', () => {
  let potManager: PotManager;

  beforeEach(() => {
    potManager = new PotManager();
  });

  describe('initialization', () => {
    it('should initialize with a main pot of 0', () => {
      const pots = potManager.getPots();
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(0);
      expect(pots[0].isMainPot).toBe(true);
      expect(pots[0].eligiblePlayers).toEqual([]);
    });

    it('should return 0 for total pot amount initially', () => {
      expect(potManager.getTotalPotAmount()).toBe(0);
    });
  });

  describe('addToPot', () => {
    it('should add chips to the pot', () => {
      potManager.addToPot(100, 'player1');
      expect(potManager.getTotalPotAmount()).toBe(100);
    });

    it('should add player to eligible players', () => {
      potManager.addToPot(100, 'player1');
      const pots = potManager.getPots();
      expect(pots[0].eligiblePlayers).toContain('player1');
    });

    it('should not duplicate player in eligible players', () => {
      potManager.addToPot(50, 'player1');
      potManager.addToPot(50, 'player1');
      const pots = potManager.getPots();
      expect(pots[0].eligiblePlayers).toEqual(['player1']);
    });

    it('should handle multiple players contributing', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(100, 'player3');
      
      expect(potManager.getTotalPotAmount()).toBe(300);
      const pots = potManager.getPots();
      expect(pots[0].eligiblePlayers).toEqual(['player1', 'player2', 'player3']);
    });

    it('should throw error for negative amounts', () => {
      expect(() => potManager.addToPot(-50, 'player1')).toThrow('Cannot add negative amount to pot');
    });

    it('should allow adding 0 to pot', () => {
      potManager.addToPot(0, 'player1');
      expect(potManager.getTotalPotAmount()).toBe(0);
    });
  });

  describe('createSidePot', () => {
    it('should create a side pot when player goes all-in for less than current bet', () => {
      // Setup: Player 1 bets 100, Player 2 goes all-in for 50
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 900,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      // Add initial bets to pot
      potManager.addToPot(100, 'player1');
      potManager.addToPot(50, 'player2');

      // Create side pot
      const allInPlayer = players[1];
      potManager.createSidePot(players, allInPlayer, 50);

      const pots = potManager.getPots();
      expect(pots).toHaveLength(2);

      // Side pot should be first (awarded first)
      const sidePot = pots[0];
      expect(sidePot.isMainPot).toBe(false);
      expect(sidePot.amount).toBe(100); // 50 from each player
      expect(sidePot.eligiblePlayers).toContain('player1');
      expect(sidePot.eligiblePlayers).toContain('player2');

      // Main pot should have the remainder
      const mainPot = pots[1];
      expect(mainPot.isMainPot).toBe(true);
      expect(mainPot.amount).toBe(50); // 50 extra from player1
      expect(mainPot.eligiblePlayers).toEqual(['player1']);
    });

    it('should handle multiple all-ins with different amounts', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 700,
          holeCards: [],
          position: 0,
          currentBet: 300,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 0,
          holeCards: [],
          position: 2,
          currentBet: 200,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      // Add bets to pot
      potManager.addToPot(300, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(200, 'player3');

      // Create first side pot for player2 (all-in for 100)
      potManager.createSidePot(players, players[1], 100);

      const potsAfterFirst = potManager.getPots();
      expect(potsAfterFirst).toHaveLength(2);
      expect(potsAfterFirst[0].amount).toBe(300); // 100 from each of 3 players
      expect(potsAfterFirst[0].eligiblePlayers).toHaveLength(3);
    });

    it('should exclude folded players from side pots', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 900,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 950,
          holeCards: [],
          position: 2,
          currentBet: 50,
          hasFolded: true, // Folded
          isAllIn: false,
          isAI: false
        }
      ];

      potManager.addToPot(100, 'player1');
      potManager.addToPot(50, 'player2');
      potManager.addToPot(50, 'player3');

      potManager.createSidePot(players, players[1], 50);

      const pots = potManager.getPots();
      const sidePot = pots[0];
      
      // Player 3 folded, so should not be in eligible players
      expect(sidePot.eligiblePlayers).not.toContain('player3');
      expect(sidePot.eligiblePlayers).toContain('player1');
      expect(sidePot.eligiblePlayers).toContain('player2');
    });
  });

  describe('distributePots', () => {
    it('should award entire pot to single winner', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');

      const winners = [{ playerId: 'player1' }];
      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(1);
      expect(distributions[0].playerId).toBe('player1');
      expect(distributions[0].amount).toBe(200);
      expect(distributions[0].potIndex).toBe(0);
    });

    it('should split pot equally between tied winners', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');

      // Both players have the same hand rank (tied)
      const tiedHandRank = { category: 1, value: 100, kickers: [14, 13, 12] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank }
      ];
      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(2);
      expect(distributions[0].playerId).toBe('player1');
      expect(distributions[0].amount).toBe(100);
      expect(distributions[1].playerId).toBe('player2');
      expect(distributions[1].amount).toBe(100);
    });

    it('should handle odd chip in pot split', () => {
      potManager.addToPot(50, 'player1');
      potManager.addToPot(50, 'player2');
      potManager.addToPot(51, 'player3'); // Odd total: 151

      // Both players have the same hand rank (tied)
      const tiedHandRank = { category: 1, value: 100, kickers: [14, 13, 12] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank }
      ];
      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(2);
      // First winner gets the extra chip
      expect(distributions[0].amount).toBe(76); // 75 + 1
      expect(distributions[1].amount).toBe(75);
      
      // Total should equal pot
      const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
      expect(totalDistributed).toBe(151);
    });

    it('should distribute side pots correctly', () => {
      // Setup scenario with side pot
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 800,
          holeCards: [],
          position: 0,
          currentBet: 200,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 800,
          holeCards: [],
          position: 2,
          currentBet: 200,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        }
      ];

      potManager.addToPot(200, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(200, 'player3');

      potManager.createSidePot(players, players[1], 100);

      // Player 1 wins (best hand)
      const winners = [
        { playerId: 'player1' },
        { playerId: 'player3' },
        { playerId: 'player2' }
      ];

      const distributions = potManager.distributePots(winners);

      // Player 1 should win both pots
      const player1Total = distributions
        .filter(d => d.playerId === 'player1')
        .reduce((sum, d) => sum + d.amount, 0);
      
      expect(player1Total).toBe(500); // Total pot
    });

    it('should only award side pot to eligible players', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 800,
          holeCards: [],
          position: 0,
          currentBet: 200,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      potManager.addToPot(200, 'player1');
      potManager.addToPot(100, 'player2');

      potManager.createSidePot(players, players[1], 100);

      // Player 2 wins (better hand than player 1)
      const winners = [
        { playerId: 'player2' },
        { playerId: 'player1' }
      ];

      const distributions = potManager.distributePots(winners);

      // Player 2 should only get the side pot (200), not the main pot (100)
      const player2Distributions = distributions.filter(d => d.playerId === 'player2');
      expect(player2Distributions).toHaveLength(1);
      expect(player2Distributions[0].amount).toBe(200); // Side pot only

      // Player 1 should get the main pot
      const player1Distributions = distributions.filter(d => d.playerId === 'player1');
      expect(player1Distributions).toHaveLength(1);
      expect(player1Distributions[0].amount).toBe(100); // Main pot only
    });

    it('should handle empty pot gracefully', () => {
      const winners = [{ playerId: 'player1' }];
      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(0);
    });

    it('should handle three-way split', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(100, 'player3');

      // All three players have the same hand rank (tied)
      const tiedHandRank = { category: 1, value: 100, kickers: [14, 13, 12] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank },
        { playerId: 'player3', handRank: tiedHandRank }
      ];

      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(3);
      expect(distributions[0].amount).toBe(100);
      expect(distributions[1].amount).toBe(100);
      expect(distributions[2].amount).toBe(100);
    });
  });

  describe('reset', () => {
    it('should reset pots to initial state', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');

      potManager.reset();

      const pots = potManager.getPots();
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(0);
      expect(pots[0].isMainPot).toBe(true);
      expect(pots[0].eligiblePlayers).toEqual([]);
    });
  });

  describe('getMainPot and getSidePots', () => {
    it('should return main pot', () => {
      const mainPot = potManager.getMainPot();
      expect(mainPot.isMainPot).toBe(true);
    });

    it('should return empty array for side pots initially', () => {
      const sidePots = potManager.getSidePots();
      expect(sidePots).toHaveLength(0);
    });

    it('should return side pots after creation', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 900,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      potManager.addToPot(100, 'player1');
      potManager.addToPot(50, 'player2');
      potManager.createSidePot(players, players[1], 50);

      const sidePots = potManager.getSidePots();
      expect(sidePots).toHaveLength(1);
      expect(sidePots[0].isMainPot).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle all players all-in with same amount', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');

      // No side pot needed since both all-in for same amount
      const pots = potManager.getPots();
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(200);
    });

    it('should handle player all-in for less than big blind', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 990,
          holeCards: [],
          position: 0,
          currentBet: 10,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 5,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      potManager.addToPot(10, 'player1');
      potManager.addToPot(5, 'player2');

      potManager.createSidePot(players, players[1], 5);

      const pots = potManager.getPots();
      expect(pots).toHaveLength(2);
      
      // Side pot: 5 from each player
      expect(pots[0].amount).toBe(10);
      expect(pots[0].eligiblePlayers).toContain('player1');
      expect(pots[0].eligiblePlayers).toContain('player2');

      // Main pot: remaining 5 from player1
      expect(pots[1].amount).toBe(5);
      expect(pots[1].eligiblePlayers).toEqual(['player1']);
    });
  });

  describe('pot distribution edge cases', () => {
    /**
     * Test multiple all-ins with different amounts
     * This tests the scenario where multiple players go all-in for different amounts,
     * creating multiple side pots that need to be distributed correctly.
     */
    it('should distribute pots correctly with multiple all-ins at different amounts', () => {
      // Scenario: 4 players
      // Player 1: all-in for 50
      // Player 2: all-in for 150
      // Player 3: all-in for 250
      // Player 4: calls 250
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 150,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 0,
          holeCards: [],
          position: 2,
          currentBet: 250,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player4',
          name: 'Player 4',
          stack: 750,
          holeCards: [],
          position: 3,
          currentBet: 250,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        }
      ];

      // Add all bets to pot
      potManager.addToPot(50, 'player1');
      potManager.addToPot(150, 'player2');
      potManager.addToPot(250, 'player3');
      potManager.addToPot(250, 'player4');

      // Create side pots for each all-in
      // First side pot for player1 (50)
      potManager.createSidePot(players, players[0], 50);
      
      // After first side pot:
      // Side pot 1: 50 * 4 = 200 (all 4 players eligible)
      // Main pot: 100 + 200 + 200 = 500 (players 2, 3, 4 eligible)
      
      const potsAfterFirst = potManager.getPots();
      expect(potsAfterFirst).toHaveLength(2);
      expect(potsAfterFirst[0].amount).toBe(200); // Side pot 1
      expect(potsAfterFirst[0].eligiblePlayers).toHaveLength(4);
      expect(potsAfterFirst[1].amount).toBe(500); // Main pot
      expect(potsAfterFirst[1].eligiblePlayers).toHaveLength(3);

      // Now test distribution - Player 4 has the best hand
      const winners = [
        { playerId: 'player4' },
        { playerId: 'player3' },
        { playerId: 'player2' },
        { playerId: 'player1' }
      ];

      const distributions = potManager.distributePots(winners);
      
      // Player 4 should win all pots
      const player4Total = distributions
        .filter(d => d.playerId === 'player4')
        .reduce((sum, d) => sum + d.amount, 0);
      
      expect(player4Total).toBe(700); // Total pot
    });

    it('should distribute pots correctly when middle all-in player wins', () => {
      // Scenario: 3 players with different all-in amounts
      // Player 1: all-in for 100
      // Player 2: all-in for 200 (wins)
      // Player 3: all-in for 300
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 200,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 0,
          holeCards: [],
          position: 2,
          currentBet: 300,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        }
      ];

      potManager.addToPot(100, 'player1');
      potManager.addToPot(200, 'player2');
      potManager.addToPot(300, 'player3');

      // Create side pot for player1
      potManager.createSidePot(players, players[0], 100);

      // Player 2 wins (best hand)
      const winners = [
        { playerId: 'player2' },
        { playerId: 'player3' },
        { playerId: 'player1' }
      ];

      const distributions = potManager.distributePots(winners);

      // Player 2 should win both pots
      const player2Total = distributions
        .filter(d => d.playerId === 'player2')
        .reduce((sum, d) => sum + d.amount, 0);
      
      expect(player2Total).toBe(600); // Total pot
    });

    /**
     * Test pot splitting with odd chip amounts
     * When a pot cannot be split evenly, the extra chip(s) should go to the first winner
     */
    it('should handle odd chip amounts in three-way split', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(100, 'player3');
      potManager.addToPot(1, 'player4'); // Total: 301 (not divisible by 3)

      // Three players tie
      const tiedHandRank = { category: 1, value: 100, kickers: [14, 13, 12] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank },
        { playerId: 'player3', handRank: tiedHandRank }
      ];

      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(3);
      
      // First winner gets the extra chip
      expect(distributions[0].amount).toBe(101); // 100 + 1
      expect(distributions[1].amount).toBe(100);
      expect(distributions[2].amount).toBe(100);

      // Verify total
      const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
      expect(totalDistributed).toBe(301);
    });

    it('should handle odd chip amounts in four-way split', () => {
      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(100, 'player3');
      potManager.addToPot(103, 'player4'); // Total: 403 (403 / 4 = 100.75)

      // Four players tie
      const tiedHandRank = { category: 2, value: 200, kickers: [14, 13, 12] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank },
        { playerId: 'player3', handRank: tiedHandRank },
        { playerId: 'player4', handRank: tiedHandRank }
      ];

      const distributions = potManager.distributePots(winners);

      expect(distributions).toHaveLength(4);
      
      // First winner gets the extra chips (3 extra chips)
      expect(distributions[0].amount).toBe(103); // 100 + 3
      expect(distributions[1].amount).toBe(100);
      expect(distributions[2].amount).toBe(100);
      expect(distributions[3].amount).toBe(100);

      // Verify total
      const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
      expect(totalDistributed).toBe(403);
    });

    /**
     * Test side pot eligibility
     * Only players who contributed to a side pot should be eligible to win it
     */
    it('should only award side pots to eligible players - complex scenario', () => {
      // Scenario: 5 players
      // Player 1: all-in for 50
      // Player 2: folds
      // Player 3: all-in for 150
      // Player 4: all-in for 200
      // Player 5: calls 200
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 950,
          holeCards: [],
          position: 1,
          currentBet: 0,
          hasFolded: true,
          isAllIn: false,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 0,
          holeCards: [],
          position: 2,
          currentBet: 150,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player4',
          name: 'Player 4',
          stack: 0,
          holeCards: [],
          position: 3,
          currentBet: 200,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player5',
          name: 'Player 5',
          stack: 800,
          holeCards: [],
          position: 4,
          currentBet: 200,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        }
      ];

      potManager.addToPot(50, 'player1');
      potManager.addToPot(150, 'player3');
      potManager.addToPot(200, 'player4');
      potManager.addToPot(200, 'player5');

      // Create side pot for player1 (50)
      potManager.createSidePot(players, players[0], 50);

      const pots = potManager.getPots();
      
      // Side pot 1: 50 * 4 = 200 (players 1, 3, 4, 5 eligible - player 2 folded)
      expect(pots[0].amount).toBe(200);
      expect(pots[0].eligiblePlayers).toHaveLength(4);
      expect(pots[0].eligiblePlayers).not.toContain('player2');

      // Main pot: 100 + 50 + 50 = 200 (players 3, 4, 5 eligible)
      expect(pots[1].amount).toBe(400);
      expect(pots[1].eligiblePlayers).toHaveLength(3);
      expect(pots[1].eligiblePlayers).not.toContain('player1');
      expect(pots[1].eligiblePlayers).not.toContain('player2');

      // Player 1 wins with best hand
      const winners = [
        { playerId: 'player1' },
        { playerId: 'player5' },
        { playerId: 'player4' },
        { playerId: 'player3' }
      ];

      const distributions = potManager.distributePots(winners);

      // Player 1 should only win the side pot (200), not the main pot
      const player1Distributions = distributions.filter(d => d.playerId === 'player1');
      expect(player1Distributions).toHaveLength(1);
      expect(player1Distributions[0].amount).toBe(200);

      // Player 5 should win the main pot (400)
      const player5Distributions = distributions.filter(d => d.playerId === 'player5');
      expect(player5Distributions).toHaveLength(1);
      expect(player5Distributions[0].amount).toBe(400);
    });

    it('should handle side pot eligibility when shortest stack wins', () => {
      // Player with smallest all-in wins
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 50,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 200,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 700,
          holeCards: [],
          position: 2,
          currentBet: 300,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        }
      ];

      potManager.addToPot(50, 'player1');
      potManager.addToPot(200, 'player2');
      potManager.addToPot(300, 'player3');

      // Create side pot for player1
      potManager.createSidePot(players, players[0], 50);

      // Player 1 wins (best hand)
      const winners = [
        { playerId: 'player1' },
        { playerId: 'player3' },
        { playerId: 'player2' }
      ];

      const distributions = potManager.distributePots(winners);

      // Player 1 should only win the side pot they're eligible for
      const player1Distributions = distributions.filter(d => d.playerId === 'player1');
      expect(player1Distributions).toHaveLength(1);
      expect(player1Distributions[0].amount).toBe(150); // 50 * 3 players

      // Player 3 should win the main pot
      const player3Distributions = distributions.filter(d => d.playerId === 'player3');
      expect(player3Distributions).toHaveLength(1);
      expect(player3Distributions[0].amount).toBe(400); // Remaining pot
    });

    it('should handle complex multi-way all-in with ties in different pots', () => {
      // Complex scenario: multiple all-ins with ties at different levels
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          holeCards: [],
          position: 0,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          holeCards: [],
          position: 1,
          currentBet: 100,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 0,
          holeCards: [],
          position: 2,
          currentBet: 200,
          hasFolded: false,
          isAllIn: true,
          isAI: false
        },
        {
          id: 'player4',
          name: 'Player 4',
          stack: 800,
          holeCards: [],
          position: 3,
          currentBet: 200,
          hasFolded: false,
          isAllIn: false,
          isAI: false
        }
      ];

      potManager.addToPot(100, 'player1');
      potManager.addToPot(100, 'player2');
      potManager.addToPot(200, 'player3');
      potManager.addToPot(200, 'player4');

      // Create side pot for players 1 and 2 (both all-in for 100)
      potManager.createSidePot(players, players[0], 100);

      // Players 1 and 2 tie for best hand
      const tiedHandRank = { category: 8, value: 800, kickers: [14] };
      const winners = [
        { playerId: 'player1', handRank: tiedHandRank },
        { playerId: 'player2', handRank: tiedHandRank },
        { playerId: 'player3', handRank: { category: 1, value: 100, kickers: [14, 13, 12] } },
        { playerId: 'player4', handRank: { category: 0, value: 50, kickers: [14, 13, 12, 11, 10] } }
      ];

      const distributions = potManager.distributePots(winners);

      // Players 1 and 2 should split the side pot
      const player1Distributions = distributions.filter(d => d.playerId === 'player1');
      const player2Distributions = distributions.filter(d => d.playerId === 'player2');
      
      expect(player1Distributions).toHaveLength(1);
      expect(player2Distributions).toHaveLength(1);
      
      // Side pot is 400 (100 * 4 players), split between 2 winners = 200 each
      expect(player1Distributions[0].amount).toBe(200);
      expect(player2Distributions[0].amount).toBe(200);

      // Main pot should go to player 3 (next best hand among eligible players)
      const player3Distributions = distributions.filter(d => d.playerId === 'player3');
      expect(player3Distributions).toHaveLength(1);
      expect(player3Distributions[0].amount).toBe(200); // Main pot
    });
  });

  describe('property-based tests', () => {
    /**
     * Property 16: Pot increases with bets
     * **Validates: Requirements 6.2**
     * 
     * For any bet or raise action, the pot amount after the action should equal 
     * the pot amount before plus the wagered amount.
     */
    it('property: pot increases with bets', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of bet amounts (positive numbers)
          fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 10000 }),
              playerId: fc.constantFrom('player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7', 'player8')
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (bets) => {
            const pm = new PotManager();
            let expectedTotal = 0;

            // Apply each bet and verify the pot increases correctly
            for (const bet of bets) {
              const potBefore = pm.getTotalPotAmount();
              pm.addToPot(bet.amount, bet.playerId);
              const potAfter = pm.getTotalPotAmount();

              // Property: pot after = pot before + bet amount
              expect(potAfter).toBe(potBefore + bet.amount);
              
              expectedTotal += bet.amount;
            }

            // Final verification: total pot should equal sum of all bets
            expect(pm.getTotalPotAmount()).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17: Pot amount is non-negative
     * **Validates: Requirements 6.1**
     * 
     * For any game state, the total pot amount should be greater than or equal to 0.
     */
    it('property: pot amount is non-negative', () => {
      fc.assert(
        fc.property(
          // Generate various game scenarios
          fc.record({
            // Sequence of bets to add to pot
            bets: fc.array(
              fc.record({
                amount: fc.integer({ min: 0, max: 10000 }),
                playerId: fc.constantFrom('player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7', 'player8')
              }),
              { minLength: 0, maxLength: 30 }
            ),
            // Whether to create side pots
            createSidePots: fc.boolean(),
            // All-in scenarios for side pot creation
            allInScenarios: fc.array(
              fc.record({
                allInAmount: fc.integer({ min: 1, max: 500 }),
                playerBets: fc.array(
                  fc.record({
                    playerId: fc.constantFrom('player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7', 'player8'),
                    currentBet: fc.integer({ min: 0, max: 1000 }),
                    hasFolded: fc.boolean()
                  }),
                  { minLength: 2, maxLength: 8 }
                )
              }),
              { minLength: 0, maxLength: 3 }
            ),
            // Whether to reset the pot
            shouldReset: fc.boolean()
          }),
          (scenario) => {
            const pm = new PotManager();

            // Initial state: pot should be non-negative (0)
            expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);

            // Add bets to pot
            for (const bet of scenario.bets) {
              pm.addToPot(bet.amount, bet.playerId);
              
              // Property: pot amount is always non-negative after adding bets
              expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);
              
              // Also verify each individual pot is non-negative
              const pots = pm.getPots();
              for (const pot of pots) {
                expect(pot.amount).toBeGreaterThanOrEqual(0);
              }
            }

            // Create side pots if requested
            if (scenario.createSidePots && scenario.allInScenarios.length > 0) {
              for (const allInScenario of scenario.allInScenarios) {
                // Create player objects for side pot creation
                const players: Player[] = allInScenario.playerBets.map((pb, index) => ({
                  id: pb.playerId,
                  name: `Player ${index + 1}`,
                  stack: 1000 - pb.currentBet,
                  holeCards: [],
                  position: index,
                  currentBet: pb.currentBet,
                  hasFolded: pb.hasFolded,
                  isAllIn: pb.currentBet === allInScenario.allInAmount,
                  isAI: false
                }));

                // Find the all-in player
                const allInPlayer = players.find(p => p.isAllIn);
                
                if (allInPlayer && allInPlayer.currentBet > 0) {
                  try {
                    pm.createSidePot(players, allInPlayer, allInScenario.allInAmount);
                    
                    // Property: pot amount is always non-negative after creating side pots
                    expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);
                    
                    // Also verify each individual pot is non-negative
                    const pots = pm.getPots();
                    for (const pot of pots) {
                      expect(pot.amount).toBeGreaterThanOrEqual(0);
                    }
                  } catch (error) {
                    // Side pot creation might fail in some edge cases, but pot should still be non-negative
                    expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);
                  }
                }
              }
            }

            // Reset if requested
            if (scenario.shouldReset) {
              pm.reset();
              
              // Property: pot amount is non-negative after reset (should be 0)
              expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);
              expect(pm.getTotalPotAmount()).toBe(0);
            }

            // Final verification: total pot is always non-negative
            expect(pm.getTotalPotAmount()).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 18: Side pot creation on short all-in
     * **Validates: Requirements 6.3**
     * 
     * For any all-in action where the all-in amount is less than the current bet,
     * a new side pot should be created with the appropriate eligible players.
     */
    it('property: side pot creation on short all-in', () => {
      fc.assert(
        fc.property(
          // Generate a scenario with multiple players and an all-in player
          fc.record({
            // Number of active players (2-8)
            numPlayers: fc.integer({ min: 2, max: 8 }),
            // Index of the all-in player
            allInPlayerIndex: fc.integer({ min: 0, max: 7 }),
            // All-in amount (must be less than other bets)
            allInAmount: fc.integer({ min: 10, max: 500 }),
            // Other players' bet amounts (must be > all-in amount)
            otherBetMultiplier: fc.integer({ min: 2, max: 5 }),
            // Number of folded players
            numFoldedPlayers: fc.integer({ min: 0, max: 3 })
          }),
          ({ numPlayers, allInPlayerIndex, allInAmount, otherBetMultiplier, numFoldedPlayers }) => {
            // Ensure all-in player index is within bounds
            const validAllInIndex = allInPlayerIndex % numPlayers;
            const validNumFolded = Math.min(numFoldedPlayers, numPlayers - 2); // At least 2 active players
            
            // Create players with bets
            const players: Player[] = [];
            const pm = new PotManager();
            
            for (let i = 0; i < numPlayers; i++) {
              const isAllInPlayer = i === validAllInIndex;
              const isFolded = !isAllInPlayer && i < validNumFolded;
              const currentBet = isAllInPlayer ? allInAmount : allInAmount * otherBetMultiplier;
              
              const player: Player = {
                id: `player${i}`,
                name: `Player ${i}`,
                stack: isAllInPlayer ? 0 : 1000,
                holeCards: [],
                position: i,
                currentBet: currentBet,
                hasFolded: isFolded,
                isAllIn: isAllInPlayer,
                isAI: false
              };
              
              players.push(player);
              pm.addToPot(currentBet, player.id);
            }
            
            const allInPlayer = players[validAllInIndex];
            const totalPotBefore = pm.getTotalPotAmount();
            const activePlayers = players.filter(p => !p.hasFolded);
            
            // Only create side pot if all-in amount is less than other bets
            if (allInAmount < allInAmount * otherBetMultiplier) {
              pm.createSidePot(players, allInPlayer, allInAmount);
              
              const pots = pm.getPots();
              
              // Property 1: Should have at least 2 pots (side pot + main pot)
              expect(pots.length).toBeGreaterThanOrEqual(2);
              
              // Property 2: First pot should be the side pot (not main pot)
              expect(pots[0].isMainPot).toBe(false);
              
              // Property 3: Last pot should be the main pot
              expect(pots[pots.length - 1].isMainPot).toBe(true);
              
              // Property 4: All-in player should be eligible for side pot
              expect(pots[0].eligiblePlayers).toContain(allInPlayer.id);
              
              // Property 5: All non-folded players who bet at least the all-in amount should be eligible for side pot
              for (const player of activePlayers) {
                if (player.currentBet >= allInAmount) {
                  expect(pots[0].eligiblePlayers).toContain(player.id);
                }
              }
              
              // Property 6: All-in player should NOT be eligible for main pot
              // (since they can't contest the extra chips)
              const mainPot = pots[pots.length - 1];
              expect(mainPot.eligiblePlayers).not.toContain(allInPlayer.id);
              
              // Property 7: Total pot amount should remain the same
              const totalPotAfter = pm.getTotalPotAmount();
              expect(totalPotAfter).toBe(totalPotBefore);
              
              // Property 8: Side pot amount should be all-in amount * number of active players
              const expectedSidePotAmount = allInAmount * activePlayers.length;
              expect(pots[0].amount).toBe(expectedSidePotAmount);
              
              // Property 9: Main pot should contain the excess from other players
              const expectedMainPotAmount = totalPotBefore - expectedSidePotAmount;
              expect(mainPot.amount).toBe(expectedMainPotAmount);
              
              // Property 10: Only players who bet more than all-in amount should be eligible for main pot
              for (const player of activePlayers) {
                if (player.currentBet > allInAmount) {
                  expect(mainPot.eligiblePlayers).toContain(player.id);
                } else {
                  expect(mainPot.eligiblePlayers).not.toContain(player.id);
                }
              }
              
              // Property 11: Folded players should not be eligible for any pot
              const foldedPlayers = players.filter(p => p.hasFolded);
              for (const foldedPlayer of foldedPlayers) {
                for (const pot of pots) {
                  expect(pot.eligiblePlayers).not.toContain(foldedPlayer.id);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
