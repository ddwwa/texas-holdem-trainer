import { Deck } from './Deck';
import { Card } from '../card/Card';
import { Rank, Suit } from '../types/enums';

describe('Deck', () => {
  describe('initialization', () => {
    it('should create a deck with 52 cards', () => {
      const deck = new Deck();
      expect(deck.getRemainingCount()).toBe(52);
    });

    it('should contain all unique cards (no duplicates)', () => {
      const deck = new Deck();
      const cards = deck.getCards();
      
      // Check for duplicates by comparing each card with every other card
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          expect(cards[i].equals(cards[j])).toBe(false);
        }
      }
    });

    it('should contain exactly 13 cards of each suit', () => {
      const deck = new Deck();
      const cards = deck.getCards();
      
      const suitCounts = {
        [Suit.HEARTS]: 0,
        [Suit.DIAMONDS]: 0,
        [Suit.CLUBS]: 0,
        [Suit.SPADES]: 0
      };
      
      for (const card of cards) {
        suitCounts[card.suit]++;
      }
      
      expect(suitCounts[Suit.HEARTS]).toBe(13);
      expect(suitCounts[Suit.DIAMONDS]).toBe(13);
      expect(suitCounts[Suit.CLUBS]).toBe(13);
      expect(suitCounts[Suit.SPADES]).toBe(13);
    });

    it('should contain exactly 4 cards of each rank', () => {
      const deck = new Deck();
      const cards = deck.getCards();
      
      const rankCounts: Record<string, number> = {};
      Object.values(Rank).forEach(rank => {
        rankCounts[rank] = 0;
      });
      
      for (const card of cards) {
        rankCounts[card.rank]++;
      }
      
      Object.values(Rank).forEach(rank => {
        expect(rankCounts[rank]).toBe(4);
      });
    });
  });

  describe('shuffle', () => {
    it('should maintain 52 cards after shuffle', () => {
      const deck = new Deck();
      deck.shuffle();
      expect(deck.getRemainingCount()).toBe(52);
    });

    it('should reset dealt index to 0 after shuffle', () => {
      const deck = new Deck();
      deck.deal();
      deck.deal();
      expect(deck.getDealtIndex()).toBe(2);
      
      deck.shuffle();
      expect(deck.getDealtIndex()).toBe(0);
      expect(deck.getRemainingCount()).toBe(52);
    });

    it('should produce different card orders (randomness test)', () => {
      const deck1 = new Deck();
      const deck2 = new Deck();
      
      deck1.shuffle();
      deck2.shuffle();
      
      const cards1 = deck1.getCards();
      const cards2 = deck2.getCards();
      
      // Check if at least some cards are in different positions
      // With 52! possible permutations, getting the same shuffle twice is astronomically unlikely
      let differentPositions = 0;
      for (let i = 0; i < cards1.length; i++) {
        if (!cards1[i].equals(cards2[i])) {
          differentPositions++;
        }
      }
      
      // Expect at least 40 cards to be in different positions (very conservative)
      expect(differentPositions).toBeGreaterThan(40);
    });

    it('should still contain all unique cards after shuffle', () => {
      const deck = new Deck();
      deck.shuffle();
      const cards = deck.getCards();
      
      // Check for duplicates
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          expect(cards[i].equals(cards[j])).toBe(false);
        }
      }
    });
  });

  describe('deal', () => {
    it('should deal a single card', () => {
      const deck = new Deck();
      const card = deck.deal();
      
      expect(card).toBeInstanceOf(Card);
      expect(deck.getRemainingCount()).toBe(51);
    });

    it('should deal cards in sequence', () => {
      const deck = new Deck();
      const firstCard = deck.deal();
      const secondCard = deck.deal();
      
      expect(deck.getRemainingCount()).toBe(50);
      expect(firstCard.equals(secondCard)).toBe(false);
    });

    it('should throw error when dealing from empty deck', () => {
      const deck = new Deck();
      
      // Deal all 52 cards
      for (let i = 0; i < 52; i++) {
        deck.deal();
      }
      
      expect(deck.getRemainingCount()).toBe(0);
      expect(() => deck.deal()).toThrow('No cards remaining in deck');
    });

    it('should increment dealt index with each deal', () => {
      const deck = new Deck();
      
      expect(deck.getDealtIndex()).toBe(0);
      deck.deal();
      expect(deck.getDealtIndex()).toBe(1);
      deck.deal();
      expect(deck.getDealtIndex()).toBe(2);
    });
  });

  describe('dealMultiple', () => {
    it('should deal multiple cards at once', () => {
      const deck = new Deck();
      const cards = deck.dealMultiple(5);
      
      expect(cards).toHaveLength(5);
      expect(deck.getRemainingCount()).toBe(47);
    });

    it('should deal all unique cards', () => {
      const deck = new Deck();
      const cards = deck.dealMultiple(10);
      
      // Check for duplicates in dealt cards
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          expect(cards[i].equals(cards[j])).toBe(false);
        }
      }
    });

    it('should throw error when requesting more cards than available', () => {
      const deck = new Deck();
      deck.dealMultiple(50);
      
      expect(deck.getRemainingCount()).toBe(2);
      expect(() => deck.dealMultiple(3)).toThrow('Not enough cards remaining');
    });

    it('should handle dealing 0 cards', () => {
      const deck = new Deck();
      const cards = deck.dealMultiple(0);
      
      expect(cards).toHaveLength(0);
      expect(deck.getRemainingCount()).toBe(52);
    });

    it('should be able to deal all 52 cards', () => {
      const deck = new Deck();
      const cards = deck.dealMultiple(52);
      
      expect(cards).toHaveLength(52);
      expect(deck.getRemainingCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should restore deck to initial state', () => {
      const deck = new Deck();
      const initialCards = deck.getCards();
      
      deck.shuffle();
      deck.dealMultiple(20);
      
      deck.reset();
      
      expect(deck.getRemainingCount()).toBe(52);
      expect(deck.getDealtIndex()).toBe(0);
      
      const resetCards = deck.getCards();
      expect(resetCards).toHaveLength(52);
      
      // Cards should be in the same order as initial
      for (let i = 0; i < initialCards.length; i++) {
        expect(resetCards[i].equals(initialCards[i])).toBe(true);
      }
    });

    it('should allow dealing after reset', () => {
      const deck = new Deck();
      deck.dealMultiple(52);
      
      deck.reset();
      
      const card = deck.deal();
      expect(card).toBeInstanceOf(Card);
      expect(deck.getRemainingCount()).toBe(51);
    });
  });

  describe('getRemainingCount', () => {
    it('should return correct count as cards are dealt', () => {
      const deck = new Deck();
      
      expect(deck.getRemainingCount()).toBe(52);
      
      deck.deal();
      expect(deck.getRemainingCount()).toBe(51);
      
      deck.dealMultiple(10);
      expect(deck.getRemainingCount()).toBe(41);
      
      deck.dealMultiple(41);
      expect(deck.getRemainingCount()).toBe(0);
    });
  });

  describe('Fisher-Yates shuffle verification', () => {
    it('should shuffle uniformly (statistical test)', () => {
      // This test verifies that the shuffle produces a reasonably uniform distribution
      // We'll track how often the Ace of Spades appears in the first position
      const trials = 1000;
      let aceOfSpadesFirstCount = 0;
      
      for (let i = 0; i < trials; i++) {
        const deck = new Deck();
        deck.shuffle();
        const firstCard = deck.deal();
        
        if (firstCard.rank === Rank.ACE && firstCard.suit === Suit.SPADES) {
          aceOfSpadesFirstCount++;
        }
      }
      
      // Expected probability is 1/52 ≈ 1.92%
      // With 1000 trials, we expect around 19 occurrences
      // Allow for statistical variance: accept 10-30 occurrences (roughly 1-3%)
      const percentage = (aceOfSpadesFirstCount / trials) * 100;
      expect(percentage).toBeGreaterThan(1);
      expect(percentage).toBeLessThan(3);
    });
  });

  describe('integration scenarios', () => {
    it('should support typical Texas Hold\'em dealing pattern', () => {
      const deck = new Deck();
      deck.shuffle();
      
      // Deal 2 cards to 8 players (16 cards)
      const playerHands: Card[][] = [];
      for (let i = 0; i < 8; i++) {
        playerHands.push(deck.dealMultiple(2));
      }
      
      expect(deck.getRemainingCount()).toBe(36);
      
      // Burn and deal flop (4 cards)
      deck.deal(); // burn
      const flop = deck.dealMultiple(3);
      expect(flop).toHaveLength(3);
      expect(deck.getRemainingCount()).toBe(32);
      
      // Burn and deal turn (2 cards)
      deck.deal(); // burn
      const turn = deck.deal();
      expect(turn).toBeInstanceOf(Card);
      expect(deck.getRemainingCount()).toBe(30);
      
      // Burn and deal river (2 cards)
      deck.deal(); // burn
      const river = deck.deal();
      expect(river).toBeInstanceOf(Card);
      expect(deck.getRemainingCount()).toBe(28);
    });

    it('should handle multiple shuffle and deal cycles', () => {
      const deck = new Deck();
      
      for (let cycle = 0; cycle < 5; cycle++) {
        deck.shuffle();
        expect(deck.getRemainingCount()).toBe(52);
        
        deck.dealMultiple(20);
        expect(deck.getRemainingCount()).toBe(32);
      }
    });
  });
});
