import { Rank, Suit, ActionType, BettingRound, HandCategory } from './enums';

/**
 * Represents a playing card with rank and suit
 */
export interface Card {
  rank: Rank;
  suit: Suit;
}

/**
 * Represents a player action (fold, check, call, bet, raise, all-in)
 */
export interface Action {
  type: ActionType;
  amount?: number; // For bets and raises
}

/**
 * Represents a pot (main pot or side pot)
 */
export interface Pot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs
  isMainPot: boolean;
}

/**
 * Represents a player at the table
 */
export interface Player {
  id: string;
  name: string;
  stack: number;
  holeCards: Card[];
  position: number;
  currentBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isAI: boolean;
}

/**
 * Represents the complete game state at any point in time
 */
export interface GameState {
  handNumber: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentBettingRound: BettingRound;
  currentBet: number;
  minimumRaise: number;
  actionQueue: string[]; // Player IDs in action order
  currentActorIndex: number;
}

/**
 * Represents a historical record of an action taken
 */
export interface ActionRecord {
  handNumber: number;
  bettingRound: BettingRound;
  playerId: string;
  action: Action;
  timestamp: number;
  potSizeAfter: number;
  stackAfter: number;
}

/**
 * Represents the result of an action execution
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  gameState: GameState;
}

/**
 * Represents the result of action validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Represents a poker hand rank for comparison
 */
export interface HandRank {
  category: HandCategory;
  value: number; // Numeric value for comparison
  kickers: number[]; // Kicker values for tiebreaking
  cardsUsed?: Card[]; // The 5 cards that make up this hand
}

/**
 * Represents a winner of a pot
 */
export interface WinnerResult {
  playerId: string;
  handRank: HandRank;
  potShare: number;
}

/**
 * Represents the result of a hand resolution
 */
export interface HandResult {
  winners: WinnerResult[];
  distributions: Distribution[];
}

/**
 * Represents a pot distribution to a player
 */
export interface Distribution {
  playerId: string;
  amount: number;
  potIndex: number; // Which pot this distribution is from
}

/**
 * Represents a decision point for GTO analysis
 */
export interface DecisionPoint {
  gameState: GameState;
  playerId: string;
  availableActions: ActionType[];
  potSize: number;
  effectiveStack: number;
  position: number;
  bettingHistory: ActionRecord[];
}

/**
 * Represents strategic factors considered in GTO analysis
 */
export interface StrategyFactors {
  potOdds: number;
  equity: number;
  positionAdvantage: boolean;
  rangeAdvantage: string;
  boardTexture: string;
  stackDepth: number;
}

/**
 * Represents a GTO solution for a decision point
 */
export interface GTOSolution {
  actionFrequencies: Map<ActionType, number>; // e.g., {FOLD: 0.3, CALL: 0.5, RAISE: 0.2}
  recommendedAction: ActionType;
  expectedValue: number;
  strategicReasoning: StrategyFactors;
}

/**
 * Represents a comparison between player action and GTO solution
 */
export interface Comparison {
  isOptimal: boolean;
  deviation: number; // How far from GTO (0-1 scale)
  feedback: string;
}

/**
 * Represents player statistics across a session
 */
export interface PlayerStats {
  handsWon: number;
  totalProfit: number;
  vpip: number; // Voluntarily put money in pot percentage
  pfr: number; // Preflop raise percentage
  aggression: number;
}

/**
 * Represents session data tracking player progress
 */
export interface SessionData {
  sessionId: string;
  startTime: number;
  handsPlayed: number;
  playerStats: PlayerStats;
  gtoAccuracy: number; // Percentage of decisions matching GTO
}

/**
 * Enum for AI playing strategies
 */
export enum AIStrategy {
  TIGHT_AGGRESSIVE = 'TIGHT_AGGRESSIVE',
  LOOSE_AGGRESSIVE = 'LOOSE_AGGRESSIVE',
  TIGHT_PASSIVE = 'TIGHT_PASSIVE',
  LOOSE_PASSIVE = 'LOOSE_PASSIVE',
  BALANCED = 'BALANCED'
}
