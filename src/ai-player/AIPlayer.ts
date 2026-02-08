import { Action, GameState, Card as ICard } from '../types/core';
import { ActionType, BettingRound } from '../types/enums';
import { HandResolver } from '../hand-resolver/HandResolver';

/**
 * AI personality types - each has distinct playing style
 */
export enum AIPersonality {
  TIGHT_PASSIVE = 'tight-passive',      // Nit - folds a lot, rarely raises
  TIGHT_AGGRESSIVE = 'tight-aggressive', // TAG - plays premium hands aggressively
  LOOSE_PASSIVE = 'loose-passive',       // Calling station - plays many hands, calls too much
  LOOSE_AGGRESSIVE = 'loose-aggressive', // LAG - plays many hands aggressively
  MANIAC = 'maniac',                     // Unpredictable, bluffs frequently
  BALANCED = 'balanced'                  // Well-rounded, adapts to situations
}

/**
 * AI strategy types (legacy - kept for compatibility)
 */
export enum AIStrategy {
  TIGHT_AGGRESSIVE = 'tight-aggressive',
  LOOSE_AGGRESSIVE = 'loose-aggressive',
  BALANCED = 'balanced',
  RANDOM = 'random'
}

/**
 * Personality configuration
 */
interface PersonalityConfig {
  vpip: number;              // Voluntarily Put money In Pot (0-1)
  pfr: number;               // Pre-Flop Raise (0-1)
  aggression: number;        // How often to bet/raise vs call (0-1)
  bluffFrequency: number;    // How often to bluff (0-1)
  cBetFrequency: number;     // Continuation bet frequency (0-1)
  foldToCBet: number;        // How often to fold to c-bet (0-1)
  minBetSize: number;        // Minimum bet as % of pot
  maxBetSize: number;        // Maximum bet as % of pot
  tightness: number;         // Hand selection tightness (0-1)
}

/**
 * AIPlayer makes decisions for computer-controlled players.
 * Enhanced with personalities, variable bet sizing, and human-like behaviors.
 * 
 * Requirements: 3.1, 3.2, 3.4
 */
export class AIPlayer {
  private strategy: AIStrategy;
  private personality: AIPersonality;
  private personalityConfig: PersonalityConfig;
  private handResolver: HandResolver;
  private raisedLastRound: boolean = false; // Track if we raised preflop for c-betting
  private lastBettingRound: BettingRound | null = null;

  constructor(strategy: AIStrategy = AIStrategy.BALANCED, personality?: AIPersonality) {
    this.strategy = strategy;
    this.personality = personality || this.strategyToPersonality(strategy);
    this.personalityConfig = this.getPersonalityConfig(this.personality);
    this.handResolver = new HandResolver();
  }

  /**
   * Convert legacy strategy to personality
   */
  private strategyToPersonality(strategy: AIStrategy): AIPersonality {
    switch (strategy) {
      case AIStrategy.TIGHT_AGGRESSIVE:
        return AIPersonality.TIGHT_AGGRESSIVE;
      case AIStrategy.LOOSE_AGGRESSIVE:
        return AIPersonality.LOOSE_AGGRESSIVE;
      case AIStrategy.BALANCED:
        return AIPersonality.BALANCED;
      case AIStrategy.RANDOM:
        return AIPersonality.MANIAC;
      default:
        return AIPersonality.BALANCED;
    }
  }

  /**
   * Get personality configuration
   */
  private getPersonalityConfig(personality: AIPersonality): PersonalityConfig {
    switch (personality) {
      case AIPersonality.TIGHT_PASSIVE:
        return {
          vpip: 0.18,           // Plays 18% of hands
          pfr: 0.08,            // Raises 8% preflop
          aggression: 0.3,      // Passive - calls more than raises
          bluffFrequency: 0.05, // Rarely bluffs
          cBetFrequency: 0.4,   // Low c-bet frequency
          foldToCBet: 0.7,      // Folds to c-bets often
          minBetSize: 0.4,
          maxBetSize: 0.7,
          tightness: 0.75
        };
      
      case AIPersonality.TIGHT_AGGRESSIVE:
        return {
          vpip: 0.22,           // Plays 22% of hands
          pfr: 0.18,            // Raises 18% preflop
          aggression: 0.75,     // Very aggressive
          bluffFrequency: 0.20, // Moderate bluffing
          cBetFrequency: 0.75,  // High c-bet frequency
          foldToCBet: 0.45,     // Doesn't fold easily
          minBetSize: 0.5,
          maxBetSize: 1.0,
          tightness: 0.70
        };
      
      case AIPersonality.LOOSE_PASSIVE:
        return {
          vpip: 0.45,           // Plays 45% of hands
          pfr: 0.10,            // Rarely raises preflop
          aggression: 0.25,     // Very passive - calling station
          bluffFrequency: 0.08, // Rarely bluffs
          cBetFrequency: 0.35,  // Low c-bet frequency
          foldToCBet: 0.35,     // Calls c-bets too much
          minBetSize: 0.35,
          maxBetSize: 0.65,
          tightness: 0.30
        };
      
      case AIPersonality.LOOSE_AGGRESSIVE:
        return {
          vpip: 0.40,           // Plays 40% of hands
          pfr: 0.30,            // Raises 30% preflop
          aggression: 0.80,     // Very aggressive
          bluffFrequency: 0.30, // Bluffs frequently
          cBetFrequency: 0.80,  // Very high c-bet frequency
          foldToCBet: 0.40,     // Doesn't fold easily
          minBetSize: 0.6,
          maxBetSize: 1.2,
          tightness: 0.35
        };
      
      case AIPersonality.MANIAC:
        return {
          vpip: 0.65,           // Plays 65% of hands
          pfr: 0.45,            // Raises 45% preflop
          aggression: 0.90,     // Extremely aggressive
          bluffFrequency: 0.45, // Bluffs very frequently
          cBetFrequency: 0.90,  // Almost always c-bets
          foldToCBet: 0.30,     // Rarely folds
          minBetSize: 0.7,
          maxBetSize: 1.5,
          tightness: 0.15
        };
      
      case AIPersonality.BALANCED:
      default:
        return {
          vpip: 0.28,           // Plays 28% of hands
          pfr: 0.20,            // Raises 20% preflop
          aggression: 0.60,     // Balanced aggression
          bluffFrequency: 0.18, // Moderate bluffing
          cBetFrequency: 0.65,  // Good c-bet frequency
          foldToCBet: 0.50,     // Balanced defense
          minBetSize: 0.5,
          maxBetSize: 1.0,
          tightness: 0.55
        };
    }
  }

  /**
   * Decides what action the AI should take based on personality and game state.
   * 
   * @param playerId - The AI player's ID
   * @param gameState - Current game state
   * @returns The action to take
   */
  decideAction(playerId: string, gameState: GameState): Action {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Track betting round changes (for c-bet logic)
    if (this.lastBettingRound !== gameState.currentBettingRound) {
      if (gameState.currentBettingRound !== BettingRound.PREFLOP) {
        this.raisedLastRound = false; // Reset for new round
      }
      this.lastBettingRound = gameState.currentBettingRound;
    }

    const amountToCall = gameState.currentBet - player.currentBet;
    const potSize = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
    const canBet = gameState.currentBet === 0;
    const canCheck = amountToCall === 0;
    
    // Calculate hand strength (0-1 scale)
    const handStrength = this.evaluateHandStrength(
      player.holeCards,
      gameState.communityCards
    );

    // Get position factor (early position = 0, late position = 1)
    const positionFactor = this.getPositionFactor(playerId, gameState);
    
    // Stack size awareness (#8)
    const bigBlind = 10; // TODO: Get from game state
    const stackInBB = player.stack / bigBlind;

    // Use personality-based decision making
    return this.personalityBasedDecision(
      player,
      amountToCall,
      potSize,
      handStrength,
      positionFactor,
      gameState,
      canBet,
      canCheck,
      stackInBB
    );
  }

  /**
   * Make decision based on personality configuration
   */
  private personalityBasedDecision(
    player: any,
    amountToCall: number,
    potSize: number,
    handStrength: number,
    positionFactor: number,
    gameState: GameState,
    canBet: boolean,
    canCheck: boolean,
    stackInBB: number
  ): Action {
    const config = this.personalityConfig;
    
    // Short stack strategy (#8)
    if (stackInBB < 20) {
      return this.shortStackStrategy(player, handStrength, amountToCall, canCheck);
    }

    // Determine if we should play this hand based on personality VPIP
    const playThreshold = config.tightness - (positionFactor * 0.15); // Looser in late position
    
    if (handStrength < playThreshold) {
      // Weak hand - consider bluffing (#7)
      if (this.shouldBluff(positionFactor, canBet, potSize, player.stack)) {
        return this.makeBluff(player, potSize, canBet, canCheck, gameState, amountToCall);
      }
      
      // No bluff - fold or check
      if (canCheck) {
        return { type: ActionType.CHECK };
      }
      return { type: ActionType.FOLD };
    }

    // Check for continuation bet opportunity (#6)
    if (this.raisedLastRound && gameState.currentBettingRound === BettingRound.FLOP && canBet) {
      if (Math.random() < config.cBetFrequency) {
        const betAmount = this.calculateBetSize(potSize, config, handStrength, positionFactor);
        if (betAmount > 0 && betAmount <= player.stack) {
          return { type: ActionType.BET, amount: betAmount };
        }
      }
    }

    // Decide action based on aggression and hand strength
    const shouldBeAggressive = Math.random() < config.aggression;
    
    if (shouldBeAggressive && handStrength > 0.6) {
      // Strong hand - bet or raise (#2 variable bet sizing)
      if (canBet) {
        const betAmount = this.calculateBetSize(potSize, config, handStrength, positionFactor);
        if (betAmount > 0 && betAmount <= player.stack) {
          // Track if we raised preflop for c-betting
          if (gameState.currentBettingRound === BettingRound.PREFLOP) {
            this.raisedLastRound = true;
          }
          return { type: ActionType.BET, amount: betAmount };
        }
        return { type: ActionType.CHECK };
      } else if (canCheck) {
        // Can raise
        const raiseAmount = this.calculateRaiseSize(player, potSize, config, handStrength, positionFactor, gameState);
        if (raiseAmount >= gameState.currentBet + gameState.minimumRaise && raiseAmount - player.currentBet <= player.stack) {
          if (gameState.currentBettingRound === BettingRound.PREFLOP) {
            this.raisedLastRound = true;
          }
          return { type: ActionType.RAISE, amount: raiseAmount };
        }
        return { type: ActionType.CHECK };
      } else {
        // There's a bet - raise or call
        const raiseAmount = this.calculateRaiseSize(player, potSize, config, handStrength, positionFactor, gameState);
        if (raiseAmount >= gameState.currentBet + gameState.minimumRaise && raiseAmount - player.currentBet <= player.stack) {
          if (gameState.currentBettingRound === BettingRound.PREFLOP) {
            this.raisedLastRound = true;
          }
          return { type: ActionType.RAISE, amount: raiseAmount };
        }
        if (player.stack >= amountToCall) {
          return { type: ActionType.CALL };
        }
        return { type: ActionType.FOLD };
      }
    }

    // Passive play - check or call
    if (canCheck) {
      return { type: ActionType.CHECK };
    } else if (player.stack >= amountToCall) {
      // Decide whether to call based on pot odds and personality
      const potOdds = potSize > 0 ? amountToCall / (potSize + amountToCall) : 0;
      if (handStrength > potOdds || handStrength > 0.45) {
        return { type: ActionType.CALL };
      }
      return { type: ActionType.FOLD };
    } else {
      return { type: ActionType.FOLD };
    }
  }

  /**
   * Short stack strategy - push/fold (#8)
   */
  private shortStackStrategy(player: any, handStrength: number, amountToCall: number, canCheck: boolean): Action {
    if (handStrength > 0.65) {
      // Strong hand - go all-in
      return { type: ActionType.ALL_IN };
    } else if (handStrength > 0.5 && canCheck) {
      // Medium hand - check or call small amounts
      if (amountToCall === 0) {
        return { type: ActionType.CHECK };
      } else if (amountToCall < player.stack * 0.3) {
        return { type: ActionType.CALL };
      }
    }
    
    // Weak hand - fold or check
    if (canCheck) {
      return { type: ActionType.CHECK };
    }
    return { type: ActionType.FOLD };
  }

  /**
   * Determine if AI should bluff (#7)
   */
  private shouldBluff(positionFactor: number, canBet: boolean, potSize: number, stack: number): boolean {
    const config = this.personalityConfig;
    
    // Base bluff frequency from personality
    let bluffChance = config.bluffFrequency;
    
    // Increase bluff chance in late position (#4)
    bluffChance += positionFactor * 0.1;
    
    // Only bluff if we can bet (not facing a bet)
    if (!canBet) {
      bluffChance *= 0.3; // Much less likely to bluff-raise
    }
    
    // Don't bluff if pot is too big relative to stack
    if (potSize > stack * 0.5) {
      bluffChance *= 0.5;
    }
    
    return Math.random() < bluffChance;
  }

  /**
   * Execute a bluff (#7)
   */
  private makeBluff(player: any, potSize: number, canBet: boolean, canCheck: boolean, gameState: GameState, amountToCall: number): Action {
    const config = this.personalityConfig;
    
    if (canBet) {
      // Bluff bet
      const betAmount = this.calculateBetSize(potSize, config, 0.5, 0.7); // Pretend medium-strong hand
      if (betAmount > 0 && betAmount <= player.stack) {
        return { type: ActionType.BET, amount: betAmount };
      }
      return { type: ActionType.CHECK };
    } else if (!canCheck && Math.random() < 0.3) {
      // Bluff raise (less common)
      const raiseAmount = this.calculateRaiseSize(player, potSize, config, 0.5, 0.7, gameState);
      if (raiseAmount >= gameState.currentBet + gameState.minimumRaise && raiseAmount - player.currentBet <= player.stack) {
        return { type: ActionType.RAISE, amount: raiseAmount };
      }
    }
    
    // Bluff failed - fold or check
    if (canCheck) {
      return { type: ActionType.CHECK };
    }
    return { type: ActionType.FOLD };
  }

  /**
   * Calculate bet size with variation (#2)
   */
  private calculateBetSize(potSize: number, config: PersonalityConfig, handStrength: number, positionFactor: number): number {
    // Base bet size from personality config
    const betSizeMultiplier = config.minBetSize + Math.random() * (config.maxBetSize - config.minBetSize);
    
    // Adjust for hand strength (stronger hands = bigger bets)
    const strengthAdjustment = handStrength > 0.8 ? 1.1 : 1.0;
    
    // Base bet
    const baseBet = potSize * betSizeMultiplier * strengthAdjustment;
    
    // Add ±10% variation for unpredictability (#2)
    const variation = 0.9 + Math.random() * 0.2;
    
    return Math.floor(baseBet * variation);
  }

  /**
   * Calculate raise size with variation (#2)
   */
  private calculateRaiseSize(player: any, potSize: number, config: PersonalityConfig, handStrength: number, positionFactor: number, gameState: GameState): number {
    const betSize = this.calculateBetSize(potSize, config, handStrength, positionFactor);
    return player.currentBet + betSize;
  }

  /**
   * Evaluates hand strength on a 0-1 scale.
   * Uses hand ranking and community cards to estimate strength.
   */
  private evaluateHandStrength(
    holeCards: ICard[],
    communityCards: ICard[]
  ): number {
    if (holeCards.length !== 2) {
      return 0.3; // Default for unknown hands
    }

    // If no community cards yet, evaluate based on hole cards only
    if (communityCards.length === 0) {
      return this.evaluatePreflopStrength(holeCards);
    }

    // Evaluate current hand
    try {
      const handRank = this.handResolver.evaluateHand(holeCards, communityCards);
      
      // Convert hand category to strength (0-1)
      const categoryStrength = this.getCategoryStrength(handRank.category);
      
      // Adjust based on hand value within category
      const valueAdjustment = handRank.value / 14 * 0.1; // Max 0.1 adjustment
      
      return Math.min(1, categoryStrength + valueAdjustment);
    } catch (error) {
      return 0.3; // Default if evaluation fails
    }
  }

  /**
   * Evaluates preflop hand strength based on hole cards.
   */
  private evaluatePreflopStrength(holeCards: ICard[]): number {
    const [card1, card2] = holeCards;
    const rank1 = this.getRankValue(card1.rank);
    const rank2 = this.getRankValue(card2.rank);
    const isPair = rank1 === rank2;
    const isSuited = card1.suit === card2.suit;
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    const gap = highCard - lowCard;

    // Premium pairs
    if (isPair && rank1 >= 10) return 0.9;
    if (isPair && rank1 >= 7) return 0.75;
    if (isPair) return 0.6;

    // High cards
    if (highCard === 14 && lowCard >= 10) return isSuited ? 0.8 : 0.7;
    if (highCard >= 13 && lowCard >= 10) return isSuited ? 0.75 : 0.65;
    if (highCard >= 11 && lowCard >= 9) return isSuited ? 0.65 : 0.55;

    // Suited connectors
    if (isSuited && gap <= 1) return 0.6;
    if (isSuited && gap <= 2) return 0.5;

    // Medium cards
    if (highCard >= 9) return isSuited ? 0.45 : 0.35;

    // Weak hands
    return isSuited ? 0.3 : 0.2;
  }

  /**
   * Gets position factor (0 = early, 1 = late).
   */
  private getPositionFactor(playerId: string, gameState: GameState): number {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealerPosition;
    const numPlayers = gameState.players.length;

    // Calculate position relative to dealer
    let relativePosition = (playerIndex - dealerIndex + numPlayers) % numPlayers;
    
    // Normalize to 0-1 (0 = early, 1 = late/dealer)
    return relativePosition / numPlayers;
  }

  /**
   * Converts hand category to strength value.
   */
  private getCategoryStrength(category: string): number {
    switch (category) {
      case 'royal-flush': return 1.0;
      case 'straight-flush': return 0.95;
      case 'four-of-a-kind': return 0.9;
      case 'full-house': return 0.85;
      case 'flush': return 0.75;
      case 'straight': return 0.65;
      case 'three-of-a-kind': return 0.55;
      case 'two-pair': return 0.45;
      case 'pair': return 0.35;
      case 'high-card': return 0.2;
      default: return 0.2;
    }
  }

  /**
   * Gets numeric value for a rank.
   */
  private getRankValue(rank: string): number {
    switch (rank) {
      case 'A': return 14;
      case 'K': return 13;
      case 'Q': return 12;
      case 'J': return 11;
      case 'T': return 10;
      default: return parseInt(rank);
    }
  }

  /**
   * Gets the AI's strategy.
   */
  getStrategy(): AIStrategy {
    return this.strategy;
  }

  /**
   * Sets the AI's strategy.
   */
  setStrategy(strategy: AIStrategy): void {
    this.strategy = strategy;
  }
}
