import { Card as ICard, GameState } from '../types/core';
import { ActionType } from '../types/enums';
import { HandResolver } from '../hand-resolver/HandResolver';

/**
 * Represents a GTO solution with action frequencies and recommendation.
 */
export interface GTOSolution {
  recommendedAction: ActionType;
  actionFrequencies: Map<ActionType, number>;
  reasoning: string[];
}

/**
 * Represents a comparison between player action and GTO solution.
 */
export interface ActionComparison {
  isOptimal: boolean;
  deviation: number;
  feedback: string;
}

/**
 * Represents a decision point in the game.
 */
export interface DecisionPoint {
  playerId: string;
  holeCards: ICard[];
  communityCards: ICard[];
  potSize: number;
  currentBet: number;
  playerStack: number;
  playerCurrentBet: number;
  position: number;
  numActivePlayers: number;
  gameState: GameState;
}

/**
 * GTOEngine calculates optimal poker strategies using simplified GTO heuristics.
 * 
 * Requirements: 4.1, 4.2
 */
export class GTOEngine {
  private handResolver: HandResolver;

  constructor() {
    this.handResolver = new HandResolver();
  }

  /**
   * Calculates the optimal strategy for a given decision point.
   * Returns action frequencies and a recommended action.
   * 
   * @param decisionPoint - The current decision point
   * @returns GTOSolution with frequencies and recommendation
   */
  calculateOptimalStrategy(decisionPoint: DecisionPoint): GTOSolution {
    const equity = this.estimateEquity(
      decisionPoint.holeCards,
      decisionPoint.communityCards
    );

    const amountToCall = decisionPoint.currentBet - decisionPoint.playerCurrentBet;
    const potOdds = this.calculatePotOdds(decisionPoint.potSize, amountToCall);
    const positionAdvantage = this.hasPositionAdvantage(decisionPoint);
    const stackDepth = decisionPoint.playerStack / decisionPoint.potSize;
    const canBluff = this.canBluff(decisionPoint, positionAdvantage);

    const reasoning: string[] = [];
    const frequencies = new Map<ActionType, number>();

    // Initialize all frequencies to 0
    frequencies.set(ActionType.FOLD, 0);
    frequencies.set(ActionType.CHECK, 0);
    frequencies.set(ActionType.CALL, 0);
    frequencies.set(ActionType.BET, 0);
    frequencies.set(ActionType.RAISE, 0);
    frequencies.set(ActionType.ALL_IN, 0);

    let solution: GTOSolution;

    // Determine strategy based on equity and pot odds
    if (amountToCall === 0) {
      // No bet to call - can check or bet
      solution = this.calculateCheckBetStrategy(
        equity,
        positionAdvantage,
        stackDepth,
        decisionPoint,
        reasoning
      );
    } else {
      // Facing a bet - can fold, call, or raise
      solution = this.calculateFoldCallRaiseStrategy(
        equity,
        potOdds,
        positionAdvantage,
        stackDepth,
        canBluff,
        decisionPoint,
        reasoning
      );
    }

    // Add mixed strategy explanation if applicable (Requirement 5.4)
    if (this.isMixedStrategy(solution.actionFrequencies)) {
      solution.reasoning.push('This is a mixed strategy spot - multiple actions are viable');
    }

    return solution;
  }

  /**
   * Determines if a strategy is mixed (multiple actions with significant frequency).
   * A strategy is considered mixed if more than one action has frequency > 0.2 (20%).
   */
  private isMixedStrategy(frequencies: Map<ActionType, number>): boolean {
    let actionsWithSignificantFrequency = 0;
    
    frequencies.forEach(freq => {
      if (freq > 0.2) {
        actionsWithSignificantFrequency++;
      }
    });

    return actionsWithSignificantFrequency > 1;
  }

  /**
   * Compares a player's action to the GTO solution.
   * Returns feedback indicating whether the action matches GTO and the deviation.
   * 
   * Requirements: 4.3, 4.4, 4.5
   * 
   * @param playerAction - The action the player took
   * @param gtoSolution - The GTO solution for that decision point
   * @returns ActionComparison with match status, deviation, and feedback
   */
  comparePlayerAction(playerAction: ActionType, gtoSolution: GTOSolution): ActionComparison {
    const playerActionFrequency = gtoSolution.actionFrequencies.get(playerAction) || 0;
    
    // Check if player action matches the recommended action
    const isRecommended = playerAction === gtoSolution.recommendedAction;
    
    // Calculate deviation (0 = perfect match, 1 = worst possible)
    // Deviation is based on how far the action is from optimal frequency
    const recommendedFrequency = gtoSolution.actionFrequencies.get(gtoSolution.recommendedAction) || 0;
    const deviation = Math.abs(recommendedFrequency - playerActionFrequency);
    
    // Determine if action is optimal (has significant frequency in GTO solution)
    const isOptimal = playerActionFrequency >= 0.15; // 15% threshold for "viable" action
    
    // Generate feedback message
    let feedback: string;
    
    if (isRecommended) {
      // Player chose the recommended action
      feedback = `Excellent! You chose the GTO recommended action (${playerAction}).`;
    } else if (isOptimal) {
      // Player chose a viable alternative
      feedback = `Good play! ${playerAction} is a viable option in this spot (${(playerActionFrequency * 100).toFixed(0)}% frequency). The GTO recommendation was ${gtoSolution.recommendedAction} (${(recommendedFrequency * 100).toFixed(0)}% frequency).`;
    } else if (playerActionFrequency > 0) {
      // Player chose a low-frequency action
      feedback = `Suboptimal. ${playerAction} has only ${(playerActionFrequency * 100).toFixed(0)}% frequency in the GTO solution. Consider ${gtoSolution.recommendedAction} (${(recommendedFrequency * 100).toFixed(0)}% frequency) instead.`;
    } else {
      // Player chose an action with 0% frequency
      feedback = `Mistake. ${playerAction} is not part of the GTO strategy here. The recommended action is ${gtoSolution.recommendedAction}.`;
    }
    
    return {
      isOptimal,
      deviation,
      feedback
    };
  }

  /**
   * Calculates strategy when no bet is facing (check/bet decision).
   */
  private calculateCheckBetStrategy(
    equity: number,
    positionAdvantage: boolean,
    stackDepth: number,
    decisionPoint: DecisionPoint,
    reasoning: string[]
  ): GTOSolution {
    const frequencies = new Map<ActionType, number>();
    frequencies.set(ActionType.FOLD, 0);
    frequencies.set(ActionType.CALL, 0);
    frequencies.set(ActionType.RAISE, 0);
    frequencies.set(ActionType.ALL_IN, 0);

    // Strong hands - bet for value
    if (equity > 0.7) {
      frequencies.set(ActionType.CHECK, 0.2);
      frequencies.set(ActionType.BET, 0.8);
      reasoning.push('Strong hand - betting for value');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.BET,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Medium-strong hands - mixed strategy
    if (equity > 0.55) {
      if (positionAdvantage) {
        frequencies.set(ActionType.CHECK, 0.4);
        frequencies.set(ActionType.BET, 0.6);
        reasoning.push('Medium-strong hand in position - betting frequently');
      } else {
        frequencies.set(ActionType.CHECK, 0.6);
        frequencies.set(ActionType.BET, 0.4);
        reasoning.push('Medium-strong hand out of position - checking more');
      }
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: equity > 0.6 ? ActionType.BET : ActionType.CHECK,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Medium hands - mostly check
    if (equity > 0.4) {
      frequencies.set(ActionType.CHECK, 0.8);
      frequencies.set(ActionType.BET, 0.2);
      reasoning.push('Medium hand - checking to control pot size');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.CHECK,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Weak hands - check or bluff
    if (positionAdvantage && decisionPoint.numActivePlayers <= 3) {
      frequencies.set(ActionType.CHECK, 0.7);
      frequencies.set(ActionType.BET, 0.3);
      reasoning.push('Weak hand - occasional bluff in position');
    } else {
      frequencies.set(ActionType.CHECK, 0.95);
      frequencies.set(ActionType.BET, 0.05);
      reasoning.push('Weak hand - checking');
    }
    reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);

    return {
      recommendedAction: ActionType.CHECK,
      actionFrequencies: frequencies,
      reasoning
    };
  }

  /**
   * Calculates strategy when facing a bet (fold/call/raise decision).
   */
  private calculateFoldCallRaiseStrategy(
    equity: number,
    potOdds: number,
    positionAdvantage: boolean,
    stackDepth: number,
    canBluff: boolean,
    decisionPoint: DecisionPoint,
    reasoning: string[]
  ): GTOSolution {
    const frequencies = new Map<ActionType, number>();
    frequencies.set(ActionType.CHECK, 0);
    frequencies.set(ActionType.BET, 0);
    frequencies.set(ActionType.ALL_IN, 0);

    // Very strong hands - raise for value
    if (equity > 0.75) {
      frequencies.set(ActionType.FOLD, 0);
      frequencies.set(ActionType.CALL, 0.3);
      frequencies.set(ActionType.RAISE, 0.7);
      reasoning.push('Very strong hand - raising for value');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.RAISE,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Strong hands - call or raise
    if (equity > 0.65) {
      if (positionAdvantage) {
        frequencies.set(ActionType.FOLD, 0);
        frequencies.set(ActionType.CALL, 0.5);
        frequencies.set(ActionType.RAISE, 0.5);
        reasoning.push('Strong hand in position - mixed strategy');
      } else {
        frequencies.set(ActionType.FOLD, 0);
        frequencies.set(ActionType.CALL, 0.7);
        frequencies.set(ActionType.RAISE, 0.3);
        reasoning.push('Strong hand out of position - calling more');
      }
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.CALL,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Very weak hands should fold regardless of pot odds
    // (e.g., 2-7 offsuit, 3-8 offsuit - hands with little playability)
    if (equity < 0.22) {
      if (canBluff && equity > 0.15) {
        frequencies.set(ActionType.FOLD, 0.85);
        frequencies.set(ActionType.CALL, 0);
        frequencies.set(ActionType.RAISE, 0.15);
        reasoning.push('Very weak hand - mostly fold, occasional bluff');
        reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
        return {
          recommendedAction: ActionType.FOLD,
          actionFrequencies: frequencies,
          reasoning
        };
      }
      
      frequencies.set(ActionType.FOLD, 1.0);
      frequencies.set(ActionType.CALL, 0);
      frequencies.set(ActionType.RAISE, 0);
      reasoning.push('Very weak hand - fold');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.FOLD,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Profitable to continue based on pot odds
    if (equity > potOdds) {
      if (positionAdvantage) {
        frequencies.set(ActionType.FOLD, 0.1);
        frequencies.set(ActionType.CALL, 0.7);
        frequencies.set(ActionType.RAISE, 0.2);
        reasoning.push('Profitable call based on pot odds');
        reasoning.push(`Equity: ${(equity * 100).toFixed(1)}% > Pot odds: ${(potOdds * 100).toFixed(1)}%`);
      } else {
        frequencies.set(ActionType.FOLD, 0.2);
        frequencies.set(ActionType.CALL, 0.8);
        frequencies.set(ActionType.RAISE, 0);
        reasoning.push('Profitable call, but out of position');
        reasoning.push(`Equity: ${(equity * 100).toFixed(1)}% > Pot odds: ${(potOdds * 100).toFixed(1)}%`);
      }
      return {
        recommendedAction: ActionType.CALL,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Marginal spot - close to pot odds but not quite there
    if (equity > potOdds * 0.85) {
      frequencies.set(ActionType.FOLD, 0.5);
      frequencies.set(ActionType.CALL, 0.4);
      frequencies.set(ActionType.RAISE, 0.1);
      reasoning.push('Marginal spot - mostly fold');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}% ≈ Pot odds: ${(potOdds * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.FOLD,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Not profitable - fold or bluff
    if (canBluff && equity > 0.2) {
      frequencies.set(ActionType.FOLD, 0.8);
      frequencies.set(ActionType.CALL, 0);
      frequencies.set(ActionType.RAISE, 0.2);
      reasoning.push('Unprofitable call - occasional bluff raise');
      reasoning.push(`Equity: ${(equity * 100).toFixed(1)}% < Pot odds: ${(potOdds * 100).toFixed(1)}%`);
      return {
        recommendedAction: ActionType.FOLD,
        actionFrequencies: frequencies,
        reasoning
      };
    }

    // Clear fold
    frequencies.set(ActionType.FOLD, 1.0);
    frequencies.set(ActionType.CALL, 0);
    frequencies.set(ActionType.RAISE, 0);
    reasoning.push('Unprofitable call - fold');
    reasoning.push(`Equity: ${(equity * 100).toFixed(1)}% < Pot odds: ${(potOdds * 100).toFixed(1)}%`);

    return {
      recommendedAction: ActionType.FOLD,
      actionFrequencies: frequencies,
      reasoning
    };
  }

  /**
   * Estimates equity (win probability) based on hand strength.
   */
  private estimateEquity(holeCards: ICard[], communityCards: ICard[]): number {
    if (holeCards.length !== 2) {
      return 0.3; // Default
    }

    // Preflop - estimate based on hole cards
    if (communityCards.length === 0) {
      return this.estimatePreflopEquity(holeCards);
    }

    // Postflop - evaluate current hand strength
    try {
      const handRank = this.handResolver.evaluateHand(holeCards, communityCards);
      const categoryStrength = this.getCategoryStrength(handRank.category);
      const valueAdjustment = handRank.value / 14 * 0.1;
      
      // Adjust for number of community cards (more cards = more certain)
      const certaintyFactor = communityCards.length / 5;
      const baseEquity = Math.min(1, categoryStrength + valueAdjustment);
      
      // Less certain early in hand, but don't discount too much
      // Flop (3 cards): 0.85, Turn (4 cards): 0.925, River (5 cards): 1.0
      return baseEquity * (0.7 + certaintyFactor * 0.3);
    } catch (error) {
      return 0.3;
    }
  }

  /**
   * Estimates preflop equity based on hole cards.
   */
  private estimatePreflopEquity(holeCards: ICard[]): number {
    const [card1, card2] = holeCards;
    const rank1 = this.getRankValue(card1.rank);
    const rank2 = this.getRankValue(card2.rank);
    const isPair = rank1 === rank2;
    const isSuited = card1.suit === card2.suit;
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    const gap = highCard - lowCard;

    // Premium pairs
    if (isPair && rank1 >= 10) return 0.85;
    if (isPair && rank1 >= 7) return 0.70;
    if (isPair) return 0.55;

    // High cards
    if (highCard === 14 && lowCard >= 10) return isSuited ? 0.75 : 0.65;
    if (highCard >= 13 && lowCard >= 10) return isSuited ? 0.70 : 0.60;
    if (highCard >= 11 && lowCard >= 9) return isSuited ? 0.60 : 0.50;

    // Suited connectors
    if (isSuited && gap <= 1) return 0.55;
    if (isSuited && gap <= 2) return 0.48;

    // Medium cards
    if (highCard >= 9) return isSuited ? 0.42 : 0.32;

    // Weak hands
    return isSuited ? 0.28 : 0.20;
  }

  /**
   * Calculates pot odds (percentage of pot needed to call).
   */
  private calculatePotOdds(potSize: number, amountToCall: number): number {
    if (potSize === 0 || amountToCall === 0) {
      return 0;
    }
    return amountToCall / (potSize + amountToCall);
  }

  /**
   * Determines if player has position advantage.
   */
  private hasPositionAdvantage(decisionPoint: DecisionPoint): boolean {
    const numPlayers = decisionPoint.gameState.players.length;
    const dealerPosition = decisionPoint.gameState.dealerPosition;
    const playerPosition = decisionPoint.position;

    // Calculate relative position (0 = early, 1 = late/dealer)
    const relativePosition = (playerPosition - dealerPosition + numPlayers) % numPlayers;
    const positionFactor = relativePosition / numPlayers;

    // Late position (last 30% of players) has advantage
    return positionFactor > 0.7;
  }

  /**
   * Determines if bluffing is viable in this spot.
   */
  private canBluff(decisionPoint: DecisionPoint, positionAdvantage: boolean): boolean {
    // Bluffing is more viable with:
    // - Position advantage
    // - Fewer opponents
    // - Deeper stacks
    const fewOpponents = decisionPoint.numActivePlayers <= 3;
    const deepStacks = decisionPoint.playerStack / decisionPoint.potSize > 5;

    return positionAdvantage && (fewOpponents || deepStacks);
  }

  /**
   * Converts hand category to strength value.
   */
  private getCategoryStrength(category: string): number {
    switch (category) {
      case 'ROYAL_FLUSH': return 1.0;
      case 'STRAIGHT_FLUSH': return 0.95;
      case 'FOUR_OF_A_KIND': return 0.90;
      case 'FULL_HOUSE': return 0.85;
      case 'FLUSH': return 0.75;
      case 'STRAIGHT': return 0.65;
      case 'THREE_OF_A_KIND': return 0.55;
      case 'TWO_PAIR': return 0.45;
      case 'PAIR': return 0.35;
      case 'HIGH_CARD': return 0.20;
      default: return 0.20;
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
}
