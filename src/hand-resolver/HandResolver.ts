import { Card as ICard, HandRank } from '../types/core';
import { HandCategory, Rank } from '../types/enums';
import { Card } from '../card/Card';

/**
 * HandResolver evaluates poker hands and determines winners.
 * Supports all hand categories from high card through royal flush.
 * 
 * Requirements: 7.3
 */
export class HandResolver {
  /**
   * Evaluates a poker hand from hole cards and community cards.
   * Returns the best possible 5-card hand rank with the cards used.
   * 
   * @param holeCards - The player's two hole cards
   * @param communityCards - The community cards (0-5 cards)
   * @returns HandRank with category, value, kickers, and the 5 cards used
   */
  evaluateHand(holeCards: ICard[], communityCards: ICard[]): HandRank {
    // Convert to Card instances for easier manipulation
    const allCards = [...holeCards, ...communityCards].map(c => 
      c instanceof Card ? c : new Card(c.rank, c.suit)
    );

    if (allCards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate a hand');
    }

    // Generate all possible 5-card combinations
    const combinations = this.getCombinations(allCards, 5);
    
    // Evaluate each combination and return the best
    let bestHand: HandRank | null = null;
    let bestCards: Card[] = [];
    
    for (const combo of combinations) {
      const handRank = this.evaluateFiveCards(combo);
      if (!bestHand || this.compareHands(handRank, bestHand) > 0) {
        bestHand = handRank;
        bestCards = combo;
      }
    }

    // Add the cards used to the hand rank
    return {
      ...bestHand!,
      cardsUsed: bestCards.map(c => ({ rank: c.rank, suit: c.suit }))
    };
  }

  /**
   * Compares two poker hands.
   * 
   * @param hand1 - First hand to compare
   * @param hand2 - Second hand to compare
   * @returns Positive if hand1 is better, negative if hand2 is better, 0 if tied
   */
  compareHands(hand1: HandRank, hand2: HandRank): number {
    // First compare by category
    const categoryDiff = this.getCategoryValue(hand1.category) - this.getCategoryValue(hand2.category);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    // If same category, compare by value
    if (hand1.value !== hand2.value) {
      return hand1.value - hand2.value;
    }

    // If same value, compare kickers
    for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
      const kicker1 = hand1.kickers[i] || 0;
      const kicker2 = hand2.kickers[i] || 0;
      if (kicker1 !== kicker2) {
        return kicker1 - kicker2;
      }
    }

    return 0; // Hands are exactly equal
  }

  /**
   * Determines the winner(s) from a list of players and community cards.
   * Handles showdown with multiple players, single winner, and tied hands.
   * 
   * Requirements: 7.1, 7.2, 7.4, 7.6
   * 
   * @param players - Array of players with their hole cards and IDs
   * @param communityCards - The community cards
   * @returns Array of winner player IDs (multiple if tied)
   */
  determineWinners(
    players: Array<{ id: string; holeCards: ICard[]; hasFolded: boolean }>,
    communityCards: ICard[]
  ): string[] {
    // Filter out folded players
    const activePlayers = players.filter(p => !p.hasFolded && p.holeCards.length === 2);

    // If only one player remains, they win (no showdown needed)
    if (activePlayers.length === 1) {
      return [activePlayers[0].id];
    }

    // If no active players (shouldn't happen), return empty array
    if (activePlayers.length === 0) {
      return [];
    }

    // Evaluate each player's hand
    const playerHands = activePlayers.map(player => ({
      playerId: player.id,
      handRank: this.evaluateHand(player.holeCards, communityCards)
    }));

    // Find the best hand
    let bestHand = playerHands[0].handRank;
    for (let i = 1; i < playerHands.length; i++) {
      if (this.compareHands(playerHands[i].handRank, bestHand) > 0) {
        bestHand = playerHands[i].handRank;
      }
    }

    // Find all players with the best hand (handles ties)
    const winners = playerHands
      .filter(ph => this.compareHands(ph.handRank, bestHand) === 0)
      .map(ph => ph.playerId);

    return winners;
  }

  /**
   * Evaluates exactly 5 cards and returns the hand rank.
   */
  private evaluateFiveCards(cards: Card[]): HandRank {
    if (cards.length !== 5) {
      throw new Error('Must evaluate exactly 5 cards');
    }

    // Sort cards by rank value (descending)
    const sorted = [...cards].sort((a, b) => b.getRankValue() - a.getRankValue());
    
    const isFlush = this.isFlush(sorted);
    const straightValue = this.isStraight(sorted);
    const isStraight = straightValue !== null;
    const rankCounts = this.getRankCounts(sorted);

    // Check for royal flush
    if (isFlush && isStraight && straightValue === 14) {
      return {
        category: HandCategory.ROYAL_FLUSH,
        value: 14, // Ace high
        kickers: []
      };
    }

    // Check for straight flush
    if (isFlush && isStraight) {
      return {
        category: HandCategory.STRAIGHT_FLUSH,
        value: straightValue!,
        kickers: []
      };
    }

    // Check for four of a kind
    const fourOfAKind = this.findNOfAKind(rankCounts, 4);
    if (fourOfAKind !== null) {
      const kicker = sorted.find(c => c.getRankValue() !== fourOfAKind)!.getRankValue();
      return {
        category: HandCategory.FOUR_OF_A_KIND,
        value: fourOfAKind,
        kickers: [kicker]
      };
    }

    // Check for full house
    // When we have two three-of-a-kinds, use the higher one as the trips
    // and the lower one as the pair
    const allThreeOfAKinds = this.findAllNOfAKind(rankCounts, 3);
    if (allThreeOfAKinds.length >= 2) {
      const [highTrips, lowTrips] = allThreeOfAKinds.slice(0, 2).sort((a, b) => b - a);
      return {
        category: HandCategory.FULL_HOUSE,
        value: highTrips,
        kickers: [lowTrips]
      };
    }
    
    const threeOfAKind = this.findNOfAKind(rankCounts, 3);
    const pair = this.findNOfAKind(rankCounts, 2);
    if (threeOfAKind !== null && pair !== null) {
      return {
        category: HandCategory.FULL_HOUSE,
        value: threeOfAKind,
        kickers: [pair]
      };
    }

    // Check for flush
    if (isFlush) {
      return {
        category: HandCategory.FLUSH,
        value: sorted[0].getRankValue(),
        kickers: sorted.slice(1).map(c => c.getRankValue())
      };
    }

    // Check for straight
    if (isStraight) {
      return {
        category: HandCategory.STRAIGHT,
        value: straightValue!,
        kickers: []
      };
    }

    // Check for three of a kind
    if (threeOfAKind !== null) {
      const kickers = sorted
        .filter(c => c.getRankValue() !== threeOfAKind)
        .map(c => c.getRankValue());
      return {
        category: HandCategory.THREE_OF_A_KIND,
        value: threeOfAKind,
        kickers
      };
    }

    // Check for two pair
    const pairs = this.findAllPairs(rankCounts);
    if (pairs.length >= 2) {
      const [highPair, lowPair] = pairs.slice(0, 2).sort((a, b) => b - a);
      const kicker = sorted.find(c => 
        c.getRankValue() !== highPair && c.getRankValue() !== lowPair
      )!.getRankValue();
      return {
        category: HandCategory.TWO_PAIR,
        value: highPair,
        kickers: [lowPair, kicker]
      };
    }

    // Check for one pair
    if (pair !== null) {
      const kickers = sorted
        .filter(c => c.getRankValue() !== pair)
        .map(c => c.getRankValue());
      return {
        category: HandCategory.PAIR,
        value: pair,
        kickers
      };
    }

    // High card
    return {
      category: HandCategory.HIGH_CARD,
      value: sorted[0].getRankValue(),
      kickers: sorted.slice(1).map(c => c.getRankValue())
    };
  }

  /**
   * Checks if all cards are the same suit.
   */
  private isFlush(cards: Card[]): boolean {
    const firstSuit = cards[0].suit;
    return cards.every(c => c.suit === firstSuit);
  }

  /**
   * Checks if cards form a straight (5 consecutive ranks).
   * Handles the special case of A-2-3-4-5 (wheel).
   * Returns the high card value of the straight, or null if not a straight.
   */
  private isStraight(cards: Card[]): number | null {
    const values = cards.map(c => c.getRankValue()).sort((a, b) => b - a);
    
    // Check for regular straight
    let isRegularStraight = true;
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] - values[i + 1] !== 1) {
        isRegularStraight = false;
        break;
      }
    }
    
    if (isRegularStraight) {
      return values[0]; // Return high card
    }

    // Check for wheel (A-2-3-4-5)
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && 
        values[3] === 3 && values[4] === 2) {
      return 5; // Wheel is 5-high straight
    }

    return null;
  }

  /**
   * Gets a map of rank values to their counts.
   */
  private getRankCounts(cards: Card[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const card of cards) {
      const value = card.getRankValue();
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  /**
   * Finds a rank that appears exactly n times, or null if none exists.
   * Returns the highest such rank if multiple exist.
   */
  private findNOfAKind(rankCounts: Map<number, number>, n: number): number | null {
    const matches: number[] = [];
    for (const [rank, count] of rankCounts.entries()) {
      if (count === n) {
        matches.push(rank);
      }
    }
    return matches.length > 0 ? Math.max(...matches) : null;
  }

  /**
   * Finds all ranks that appear exactly twice.
   * Returns them sorted in descending order.
   */
  private findAllPairs(rankCounts: Map<number, number>): number[] {
    const pairs: number[] = [];
    for (const [rank, count] of rankCounts.entries()) {
      if (count === 2) {
        pairs.push(rank);
      }
    }
    return pairs.sort((a, b) => b - a);
  }

  /**
   * Finds all ranks that appear exactly n times.
   * Returns them sorted in descending order.
   */
  private findAllNOfAKind(rankCounts: Map<number, number>, n: number): number[] {
    const matches: number[] = [];
    for (const [rank, count] of rankCounts.entries()) {
      if (count === n) {
        matches.push(rank);
      }
    }
    return matches.sort((a, b) => b - a);
  }

  /**
   * Gets the numeric value for a hand category (for comparison).
   */
  private getCategoryValue(category: HandCategory): number {
    switch (category) {
      case HandCategory.HIGH_CARD: return 1;
      case HandCategory.PAIR: return 2;
      case HandCategory.TWO_PAIR: return 3;
      case HandCategory.THREE_OF_A_KIND: return 4;
      case HandCategory.STRAIGHT: return 5;
      case HandCategory.FLUSH: return 6;
      case HandCategory.FULL_HOUSE: return 7;
      case HandCategory.FOUR_OF_A_KIND: return 8;
      case HandCategory.STRAIGHT_FLUSH: return 9;
      case HandCategory.ROYAL_FLUSH: return 10;
    }
  }

  /**
   * Generates all combinations of k elements from an array.
   */
  private getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (array.length === 0) return [];
    
    const [first, ...rest] = array;
    const withFirst = this.getCombinations(rest, k - 1).map(combo => [first, ...combo]);
    const withoutFirst = this.getCombinations(rest, k);
    
    return [...withFirst, ...withoutFirst];
  }
}
