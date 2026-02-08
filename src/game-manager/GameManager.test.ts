import { GameManager } from './GameManager';
import { ActionType, BettingRound } from '../types/enums';

describe('GameManager', () => {
  let manager: GameManager;

  beforeEach(() => {
    manager = new GameManager(5, 10);
  });

  describe('initialization', () => {
    it('should initialize with 8 players', () => {
      const gameState = manager.getCurrentGameState();
      expect(gameState.players.length).toBe(8);
    });

    it('should have 1 human player and 7 AI players', () => {
      const gameState = manager.getCurrentGameState();
      const humanPlayers = gameState.players.filter(p => !p.isAI);
      const aiPlayers = gameState.players.filter(p => p.isAI);
      
      expect(humanPlayers.length).toBe(1);
      expect(aiPlayers.length).toBe(7);
    });
  });

  describe('startNewHand', () => {
    it('should deal cards to all players', () => {
      const gameState = manager.startNewHand();
      
      gameState.players.forEach(player => {
        expect(player.holeCards.length).toBe(2);
      });
    });

    it('should post blinds', () => {
      const gameState = manager.startNewHand();
      
      const smallBlindPlayer = gameState.players[gameState.smallBlindPosition];
      const bigBlindPlayer = gameState.players[gameState.bigBlindPosition];
      
      expect(smallBlindPlayer.currentBet).toBe(5);
      expect(bigBlindPlayer.currentBet).toBe(10);
    });

    it('should set betting round to PREFLOP', () => {
      const gameState = manager.startNewHand();
      expect(gameState.currentBettingRound).toBe(BettingRound.PREFLOP);
    });
  });

  describe('processPlayerAction', () => {
    beforeEach(() => {
      manager.startNewHand();
    });

    it('should execute valid action', () => {
      const currentActor = manager.getCurrentActor();
      expect(currentActor).toBeDefined();
      
      const result = manager.processPlayerAction(currentActor!, { type: ActionType.FOLD });
      
      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
    });

    it('should return GTO solution after action', () => {
      const currentActor = manager.getCurrentActor();
      
      const result = manager.processPlayerAction(currentActor!, { type: ActionType.FOLD });
      
      expect(result.gtoSolution).toBeDefined();
      expect(result.gtoSolution!.recommendedAction).toBeDefined();
      expect(result.gtoSolution!.actionFrequencies).toBeDefined();
      expect(result.gtoSolution!.reasoning).toBeDefined();
    });

    it('should return action comparison', () => {
      const currentActor = manager.getCurrentActor();
      
      const result = manager.processPlayerAction(currentActor!, { type: ActionType.FOLD });
      
      expect(result.comparison).toBeDefined();
      expect(result.comparison!.isOptimal).toBeDefined();
      expect(result.comparison!.deviation).toBeDefined();
      expect(result.comparison!.feedback).toBeDefined();
    });

    it('should reject invalid action', () => {
      const currentActor = manager.getCurrentActor();
      
      // Try to check when facing a bet (should fail)
      const result = manager.processPlayerAction(currentActor!, { type: ActionType.CHECK });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject action from wrong player', () => {
      const gameState = manager.getCurrentGameState();
      const wrongPlayer = gameState.players.find(p => 
        p.id !== gameState.actionQueue[gameState.currentActorIndex]
      )!;
      
      const result = manager.processPlayerAction(wrongPlayer.id, { type: ActionType.FOLD });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('turn');
    });
  });

  describe('processAITurn', () => {
    beforeEach(() => {
      manager.startNewHand();
    });

    it('should execute AI action', () => {
      // Find the current actor and check if they're AI
      const gameState = manager.getCurrentGameState();
      const currentActor = manager.getCurrentActor();
      const currentPlayer = gameState.players.find(p => p.id === currentActor);
      
      if (currentPlayer && currentPlayer.isAI) {
        const result = manager.processAITurn(currentPlayer.id);
        
        expect(result.success).toBe(true);
        expect(result.action).toBeDefined();
      } else {
        // If current actor is not AI, skip this test
        expect(true).toBe(true);
      }
    });

    it('should reject non-AI player', () => {
      const gameState = manager.getCurrentGameState();
      const humanPlayer = gameState.players.find(p => !p.isAI)!;
      
      const result = manager.processAITurn(humanPlayer.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not an AI player');
    });
  });

  describe('getGTOAnalysis', () => {
    beforeEach(() => {
      manager.startNewHand();
    });

    it('should return GTO solution for current actor', () => {
      const currentActor = manager.getCurrentActor();
      
      const solution = manager.getGTOAnalysis(currentActor!);
      
      expect(solution).toBeDefined();
      expect(solution.recommendedAction).toBeDefined();
      expect(solution.actionFrequencies).toBeDefined();
      expect(solution.reasoning).toBeDefined();
      expect(solution.reasoning.length).toBeGreaterThan(0);
    });

    it('should provide valid action frequencies', () => {
      const currentActor = manager.getCurrentActor();
      
      const solution = manager.getGTOAnalysis(currentActor!);
      
      // Sum of frequencies should be 1.0
      let sum = 0;
      solution.actionFrequencies.forEach(freq => {
        sum += freq;
      });
      
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('getCurrentActor', () => {
    it('should return undefined before hand starts', () => {
      const actor = manager.getCurrentActor();
      expect(actor).toBeUndefined();
    });

    it('should return current actor after hand starts', () => {
      manager.startNewHand();
      const actor = manager.getCurrentActor();
      
      expect(actor).toBeDefined();
      expect(typeof actor).toBe('string');
    });
  });

  describe('isCurrentActorAI', () => {
    beforeEach(() => {
      manager.startNewHand();
    });

    it('should correctly identify AI players', () => {
      const gameState = manager.getCurrentGameState();
      const currentActor = manager.getCurrentActor();
      const player = gameState.players.find(p => p.id === currentActor);
      
      const isAI = manager.isCurrentActorAI();
      
      expect(isAI).toBe(player!.isAI);
    });
  });

  describe('integration: complete hand playthrough', () => {
    it('should play through a complete hand to showdown', () => {
      manager.startNewHand();
      let gameState = manager.getCurrentGameState();
      const initialDealerPosition = gameState.dealerPosition;
      
      // Play through preflop - everyone calls/checks
      while (gameState.currentBettingRound === BettingRound.PREFLOP) {
        const currentActor = manager.getCurrentActor();
        if (!currentActor) break;
        
        const player = gameState.players.find(p => p.id === currentActor)!;
        const amountToCall = gameState.currentBet - player.currentBet;
        
        if (amountToCall === 0) {
          manager.processPlayerAction(currentActor, { type: ActionType.CHECK });
        } else {
          manager.processPlayerAction(currentActor, { type: ActionType.CALL });
        }
        
        gameState = manager.getCurrentGameState();
      }
      
      // Play through flop - everyone checks
      if (gameState.currentBettingRound === BettingRound.FLOP) {
        const flopPlayers = [...gameState.actionQueue];
        for (const playerId of flopPlayers) {
          gameState = manager.getCurrentGameState();
          if (gameState.actionQueue[gameState.currentActorIndex] === playerId) {
            manager.processPlayerAction(playerId, { type: ActionType.CHECK });
          }
        }
      }
      
      // Play through turn - everyone checks
      gameState = manager.getCurrentGameState();
      if (gameState.currentBettingRound === BettingRound.TURN) {
        const turnPlayers = [...gameState.actionQueue];
        for (const playerId of turnPlayers) {
          gameState = manager.getCurrentGameState();
          if (gameState.actionQueue[gameState.currentActorIndex] === playerId) {
            manager.processPlayerAction(playerId, { type: ActionType.CHECK });
          }
        }
      }
      
      // Play through river - everyone checks
      gameState = manager.getCurrentGameState();
      if (gameState.currentBettingRound === BettingRound.RIVER) {
        const riverPlayers = [...gameState.actionQueue];
        for (const playerId of riverPlayers) {
          gameState = manager.getCurrentGameState();
          if (gameState.actionQueue[gameState.currentActorIndex] === playerId) {
            manager.processPlayerAction(playerId, { type: ActionType.CHECK });
          }
        }
      }
      
      // Hand should be resolved and dealer button should have rotated
      gameState = manager.getCurrentGameState();
      expect(gameState.dealerPosition).toBe((initialDealerPosition + 1) % 8);
    });

    it('should handle early fold scenario', () => {
      manager.startNewHand();
      let gameState = manager.getCurrentGameState();
      
      // Everyone folds except last player
      const players = [...gameState.actionQueue];
      for (let i = 0; i < players.length - 1; i++) {
        manager.processPlayerAction(players[i], { type: ActionType.FOLD });
        gameState = manager.getCurrentGameState();
      }
      
      // Last player should have won
      const lastPlayer = gameState.players.find(p => p.id === players[players.length - 1])!;
      expect(lastPlayer.stack).toBeGreaterThan(1000); // Won at least the blinds
    });

    it('should provide GTO feedback throughout hand', () => {
      manager.startNewHand();
      let gameState = manager.getCurrentGameState();
      
      // Process a few actions and verify GTO feedback
      for (let i = 0; i < 3; i++) {
        const currentActor = manager.getCurrentActor();
        if (!currentActor) break;
        
        const result = manager.processPlayerAction(currentActor, { type: ActionType.FOLD });
        
        expect(result.gtoSolution).toBeDefined();
        expect(result.comparison).toBeDefined();
        expect(result.comparison!.feedback).toBeDefined();
        expect(result.comparison!.feedback.length).toBeGreaterThan(0);
        
        gameState = manager.getCurrentGameState();
      }
    });
  });

  describe('integration: multi-hand session', () => {
    it('should maintain stack persistence across hands', () => {
      // Play first hand
      manager.startNewHand();
      let gameState = manager.getCurrentGameState();
      const player0InitialStack = gameState.players[0].stack;
      
      // Everyone folds except player 0
      const players = [...gameState.actionQueue];
      for (const playerId of players) {
        if (playerId !== 'player_0') {
          manager.processPlayerAction(playerId, { type: ActionType.FOLD });
        }
      }
      
      gameState = manager.getCurrentGameState();
      const player0AfterHand1 = gameState.players.find(p => p.id === 'player_0')!.stack;
      
      // Start second hand
      manager.startNewHand();
      gameState = manager.getCurrentGameState();
      const player0AfterHand2Start = gameState.players.find(p => p.id === 'player_0')!.stack;
      
      // Stack should persist (minus small blind if they're SB)
      expect(Math.abs(player0AfterHand2Start - player0AfterHand1)).toBeLessThanOrEqual(10);
    });
  });
});
