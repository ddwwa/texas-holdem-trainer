import { GameEngine } from '../game-engine/GameEngine';
import { GTOEngine, GTOSolution, DecisionPoint, ActionComparison } from '../gto-engine/GTOEngine';
import { AIPlayer, AIStrategy, AIPersonality } from '../ai-player/AIPlayer';
import { Action, GameState } from '../types/core';
import { ActionType } from '../types/enums';

/**
 * Fun AI player names based on their personality
 */
const AI_NAMES = {
  [AIPersonality.TIGHT_PASSIVE]: [
    'The Rock',
    'Foldy McFoldface',
    'Nit Wit',
    'Scared Money',
    'The Turtle'
  ],
  [AIPersonality.TIGHT_AGGRESSIVE]: [
    'The Shark',
    'Ice Cold',
    'The Grinder',
    'Mr. Premium',
    'Solid Steve'
  ],
  [AIPersonality.LOOSE_PASSIVE]: [
    'Calling Carl',
    'The ATM',
    'Fish Sticks',
    'Never Fold Nancy',
    'The Whale'
  ],
  [AIPersonality.LOOSE_AGGRESSIVE]: [
    'Wild Bill',
    'The Aggressor',
    'Raise-a-lot Rick',
    'Action Jackson',
    'Crazy Eddie'
  ],
  [AIPersonality.MANIAC]: [
    'The Maniac',
    'All-In Annie',
    'Chaos King',
    'Reckless Rex',
    'Gamble Gary'
  ],
  [AIPersonality.BALANCED]: [
    'The Pro',
    'Balanced Betty',
    'Steady Eddie',
    'The Strategist',
    'Cool Hand Luke'
  ]
};

/**
 * GameManager orchestrates the game flow and coordinates between subsystems.
 * Provides a high-level API for managing poker games with GTO analysis.
 * 
 * Requirements: 1.1, 1.2, 1.6, 1.7, 4.1, 10.1, 10.2
 */
export class GameManager {
  private gameEngine: GameEngine;
  private gtoEngine: GTOEngine;
  private aiPlayers: Map<string, AIPlayer>;
  private smallBlind: number;
  private bigBlind: number;

  constructor(smallBlind: number = 5, bigBlind: number = 10, numPlayers: number = 8, startingStack: number = 1000) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.gameEngine = new GameEngine(numPlayers, startingStack, smallBlind, bigBlind);
    this.gtoEngine = new GTOEngine();
    this.aiPlayers = new Map();

    // Initialize AI players with different personalities
    const personalities: AIPersonality[] = [
      AIPersonality.TIGHT_AGGRESSIVE,
      AIPersonality.LOOSE_AGGRESSIVE,
      AIPersonality.BALANCED,
      AIPersonality.LOOSE_PASSIVE,
      AIPersonality.TIGHT_PASSIVE,
      AIPersonality.MANIAC,
      AIPersonality.TIGHT_AGGRESSIVE
    ];

    const gameState = this.gameEngine.getGameState();
    const usedNames = new Set<string>();
    
    gameState.players.forEach((player, index) => {
      if (player.isAI) {
        const personality = personalities[index % personalities.length];
        const aiPlayer = new AIPlayer(AIStrategy.BALANCED, personality);
        this.aiPlayers.set(player.id, aiPlayer);
        
        // Assign a fun name based on personality
        const namePool = AI_NAMES[personality];
        let name = namePool[Math.floor(Math.random() * namePool.length)];
        
        // Ensure unique names
        let attempts = 0;
        while (usedNames.has(name) && attempts < 20) {
          name = namePool[Math.floor(Math.random() * namePool.length)];
          attempts++;
        }
        
        // If still not unique, add a number
        if (usedNames.has(name)) {
          name = `${name} ${index}`;
        }
        
        usedNames.add(name);
        this.gameEngine.setPlayerName(player.id, name);
      }
    });
  }

  /**
   * Starts a new hand by dealing cards and posting blinds.
   * 
   * Requirements: 1.2, 1.6, 1.7
   */
  startNewHand(): GameState {
    this.gameEngine.dealHand();
    return this.gameEngine.getGameState();
  }

  /**
   * Processes a player action, validates it, executes it, and returns GTO analysis.
   * 
   * Requirements: 2.1-2.6, 4.1
   * 
   * @param playerId - The player making the action
   * @param action - The action to execute
   * @returns Object with success status, game state, GTO solution, and comparison
   */
  processPlayerAction(playerId: string, action: Action): {
    success: boolean;
    error?: string;
    gameState: GameState;
    gtoSolution?: GTOSolution;
    comparison?: ActionComparison;
  } {
    // Get decision point before executing action (for GTO analysis)
    const decisionPoint = this.createDecisionPoint(playerId);

    // Execute the action
    const result = this.gameEngine.executeAction(playerId, action);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        gameState: result.gameState
      };
    }

    // Calculate GTO solution for the decision point
    const gtoSolution = this.gtoEngine.calculateOptimalStrategy(decisionPoint);

    // Compare player action to GTO recommendation
    const comparison = this.gtoEngine.comparePlayerAction(action.type, gtoSolution);

    return {
      success: true,
      gameState: result.gameState,
      gtoSolution,
      comparison
    };
  }

  /**
   * Processes an AI player's turn by getting their decision and executing it.
   * 
   * Requirements: 3.1, 3.2
   * 
   * @param playerId - The AI player's ID
   * @returns Object with success status and game state
   */
  processAITurn(playerId: string): {
    success: boolean;
    error?: string;
    gameState: GameState;
    action?: Action;
  } {
    const aiPlayer = this.aiPlayers.get(playerId);
    if (!aiPlayer) {
      return {
        success: false,
        error: 'Not an AI player',
        gameState: this.gameEngine.getGameState()
      };
    }

    // Get AI decision
    const gameState = this.gameEngine.getGameState();
    const action = aiPlayer.decideAction(playerId, gameState);

    // Execute the action
    const result = this.gameEngine.executeAction(playerId, action);

    return {
      success: result.success,
      error: result.error,
      gameState: result.gameState,
      action
    };
  }

  /**
   * Gets GTO analysis for a specific decision point.
   * 
   * Requirements: 4.1, 4.2
   * 
   * @param playerId - The player at the decision point
   * @returns GTO solution with action frequencies and recommendation
   */
  getGTOAnalysis(playerId: string): GTOSolution {
    const decisionPoint = this.createDecisionPoint(playerId);
    return this.gtoEngine.calculateOptimalStrategy(decisionPoint);
  }

  /**
   * Gets the current game state.
   */
  getCurrentGameState(): GameState {
    return this.gameEngine.getGameState();
  }

  /**
   * Gets the current actor (player whose turn it is).
   */
  getCurrentActor(): string | undefined {
    const gameState = this.gameEngine.getGameState();
    if (gameState.currentActorIndex < gameState.actionQueue.length) {
      return gameState.actionQueue[gameState.currentActorIndex];
    }
    return undefined;
  }

  /**
   * Checks if the current actor is an AI player.
   */
  isCurrentActorAI(): boolean {
    const currentActor = this.getCurrentActor();
    if (!currentActor) return false;
    return this.aiPlayers.has(currentActor);
  }

  /**
   * Creates a decision point for GTO analysis.
   */
  private createDecisionPoint(playerId: string): DecisionPoint {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players.find(p => p.id === playerId);

    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    const activePlayers = gameState.players.filter(p => !p.hasFolded);

    return {
      playerId,
      holeCards: player.holeCards,
      communityCards: gameState.communityCards,
      potSize: gameState.pots.reduce((sum, pot) => sum + pot.amount, 0),
      currentBet: gameState.currentBet,
      playerStack: player.stack,
      playerCurrentBet: player.currentBet,
      position: player.position,
      numActivePlayers: activePlayers.length,
      gameState
    };
  }
}
