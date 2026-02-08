import { Rank, Suit } from '../types/enums';
import { Card as ICard } from '../types/core';

/**
 * Represents a playing card with rank and suit.
 * Implements card creation and comparison logic.
 * 
 * Requirements: 1.2
 */
export class Card implements ICard {
  readonly rank: Rank;
  readonly suit: Suit;

  constructor(rank: Rank, suit: Suit) {
    this.rank = rank;
    this.suit = suit;
  }

  /**
   * Returns a string representation of the card (e.g., "Ah" for Ace of Hearts)
   */
  toString(): string {
    return `${this.rank}${this.suit}`;
  }

  /**
   * Checks if this card is equal to another card
   */
  equals(other: Card): boolean {
    return this.rank === other.rank && this.suit === other.suit;
  }

  /**
   * Gets the numeric value of the card's rank for comparison purposes.
   * Ace is high (14), King is 13, Queen is 12, Jack is 11, and number cards are their face value.
   */
  getRankValue(): number {
    switch (this.rank) {
      case Rank.TWO: return 2;
      case Rank.THREE: return 3;
      case Rank.FOUR: return 4;
      case Rank.FIVE: return 5;
      case Rank.SIX: return 6;
      case Rank.SEVEN: return 7;
      case Rank.EIGHT: return 8;
      case Rank.NINE: return 9;
      case Rank.TEN: return 10;
      case Rank.JACK: return 11;
      case Rank.QUEEN: return 12;
      case Rank.KING: return 13;
      case Rank.ACE: return 14;
    }
  }

  /**
   * Compares this card's rank to another card's rank.
   * Returns:
   *  - positive number if this card is higher
   *  - negative number if this card is lower
   *  - 0 if ranks are equal
   */
  compareRank(other: Card): number {
    return this.getRankValue() - other.getRankValue();
  }

  /**
   * Creates a card from a string representation (e.g., "Ah" for Ace of Hearts)
   * @throws Error if the string format is invalid
   */
  static fromString(cardString: string): Card {
    if (cardString.length !== 2) {
      throw new Error(`Invalid card string: ${cardString}. Expected format: rank+suit (e.g., "Ah")`);
    }

    const rankChar = cardString[0];
    const suitChar = cardString[1];

    // Find matching rank
    const rank = Object.values(Rank).find(r => r === rankChar);
    if (!rank) {
      throw new Error(`Invalid rank: ${rankChar}. Valid ranks: 2-9, T, J, Q, K, A`);
    }

    // Find matching suit
    const suit = Object.values(Suit).find(s => s === suitChar);
    if (!suit) {
      throw new Error(`Invalid suit: ${suitChar}. Valid suits: h, d, c, s`);
    }

    return new Card(rank, suit);
  }

  /**
   * Creates an array of cards from string representations
   * @example Card.fromStrings(['Ah', 'Kd', 'Qc'])
   */
  static fromStrings(cardStrings: string[]): Card[] {
    return cardStrings.map(str => Card.fromString(str));
  }
}
