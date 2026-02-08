import { Card } from '../card/Card';
import { Rank, Suit } from '../types/enums';

/**
 * Represents a standard 52-card deck with shuffle and deal functionality.
 * Implements Fisher-Yates shuffle algorithm for randomization.
 * 
 * Requirements: 1.2
 */
export class Deck {
  private cards: Card[];
  private dealtIndex: number;

  constructor() {
    this.cards = [];
    this.dealtIndex = 0;
    this.initialize();
  }

  /**
   * Initializes the deck with all 52 cards in a standard deck
   */
  private initialize(): void {
    this.cards = [];
    const ranks = Object.values(Rank);
    const suits = Object.values(Suit);

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(rank, suit));
      }
    }
    this.dealtIndex = 0;
  }

  /**
   * Shuffles the deck using the Fisher-Yates algorithm.
   * This ensures a uniform random distribution of all possible permutations.
   * Resets the dealt index to 0.
   */
  shuffle(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      // Generate random index from 0 to i (inclusive)
      const j = Math.floor(Math.random() * (i + 1));
      
      // Swap cards[i] and cards[j]
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    
    // Reset dealt index after shuffle
    this.dealtIndex = 0;
  }

  /**
   * Deals a single card from the deck.
   * @returns The next card in the deck
   * @throws Error if no cards remain in the deck
   */
  deal(): Card {
    if (this.dealtIndex >= this.cards.length) {
      throw new Error('No cards remaining in deck');
    }
    
    const card = this.cards[this.dealtIndex];
    this.dealtIndex++;
    return card;
  }

  /**
   * Deals multiple cards from the deck.
   * @param count The number of cards to deal
   * @returns An array of dealt cards
   * @throws Error if not enough cards remain in the deck
   */
  dealMultiple(count: number): Card[] {
    if (this.dealtIndex + count > this.cards.length) {
      throw new Error(`Not enough cards remaining. Requested: ${count}, Available: ${this.cards.length - this.dealtIndex}`);
    }
    
    const dealtCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      dealtCards.push(this.deal());
    }
    return dealtCards;
  }

  /**
   * Returns the number of cards remaining in the deck
   */
  getRemainingCount(): number {
    return this.cards.length - this.dealtIndex;
  }

  /**
   * Resets the deck to its initial state with all 52 cards
   */
  reset(): void {
    this.initialize();
  }

  /**
   * Returns all cards in the deck (for testing purposes)
   */
  getCards(): Card[] {
    return [...this.cards];
  }

  /**
   * Returns the current dealt index (for testing purposes)
   */
  getDealtIndex(): number {
    return this.dealtIndex;
  }
}
