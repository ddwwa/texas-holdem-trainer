import { Card } from './Card';
import { Rank, Suit } from '../types/enums';
import * as fc from 'fast-check';

describe('Card', () => {
  describe('constructor and basic properties', () => {
    it('should create a card with rank and suit', () => {
      const card = new Card(Rank.ACE, Suit.HEARTS);
      expect(card.rank).toBe(Rank.ACE);
      expect(card.suit).toBe(Suit.HEARTS);
    });

    it('should create cards with all valid ranks', () => {
      const ranks = Object.values(Rank);
      ranks.forEach(rank => {
        const card = new Card(rank, Suit.SPADES);
        expect(card.rank).toBe(rank);
      });
    });

    it('should create cards with all valid suits', () => {
      const suits = Object.values(Suit);
      suits.forEach(suit => {
        const card = new Card(Rank.KING, suit);
        expect(card.suit).toBe(suit);
      });
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      expect(new Card(Rank.ACE, Suit.HEARTS).toString()).toBe('Ah');
      expect(new Card(Rank.KING, Suit.DIAMONDS).toString()).toBe('Kd');
      expect(new Card(Rank.QUEEN, Suit.CLUBS).toString()).toBe('Qc');
      expect(new Card(Rank.JACK, Suit.SPADES).toString()).toBe('Js');
      expect(new Card(Rank.TEN, Suit.HEARTS).toString()).toBe('Th');
      expect(new Card(Rank.TWO, Suit.DIAMONDS).toString()).toBe('2d');
    });
  });

  describe('equals', () => {
    it('should return true for identical cards', () => {
      const card1 = new Card(Rank.ACE, Suit.HEARTS);
      const card2 = new Card(Rank.ACE, Suit.HEARTS);
      expect(card1.equals(card2)).toBe(true);
    });

    it('should return false for cards with different ranks', () => {
      const card1 = new Card(Rank.ACE, Suit.HEARTS);
      const card2 = new Card(Rank.KING, Suit.HEARTS);
      expect(card1.equals(card2)).toBe(false);
    });

    it('should return false for cards with different suits', () => {
      const card1 = new Card(Rank.ACE, Suit.HEARTS);
      const card2 = new Card(Rank.ACE, Suit.SPADES);
      expect(card1.equals(card2)).toBe(false);
    });

    it('should return false for cards with different rank and suit', () => {
      const card1 = new Card(Rank.ACE, Suit.HEARTS);
      const card2 = new Card(Rank.KING, Suit.SPADES);
      expect(card1.equals(card2)).toBe(false);
    });
  });

  describe('getRankValue', () => {
    it('should return correct numeric values for all ranks', () => {
      expect(new Card(Rank.TWO, Suit.HEARTS).getRankValue()).toBe(2);
      expect(new Card(Rank.THREE, Suit.HEARTS).getRankValue()).toBe(3);
      expect(new Card(Rank.FOUR, Suit.HEARTS).getRankValue()).toBe(4);
      expect(new Card(Rank.FIVE, Suit.HEARTS).getRankValue()).toBe(5);
      expect(new Card(Rank.SIX, Suit.HEARTS).getRankValue()).toBe(6);
      expect(new Card(Rank.SEVEN, Suit.HEARTS).getRankValue()).toBe(7);
      expect(new Card(Rank.EIGHT, Suit.HEARTS).getRankValue()).toBe(8);
      expect(new Card(Rank.NINE, Suit.HEARTS).getRankValue()).toBe(9);
      expect(new Card(Rank.TEN, Suit.HEARTS).getRankValue()).toBe(10);
      expect(new Card(Rank.JACK, Suit.HEARTS).getRankValue()).toBe(11);
      expect(new Card(Rank.QUEEN, Suit.HEARTS).getRankValue()).toBe(12);
      expect(new Card(Rank.KING, Suit.HEARTS).getRankValue()).toBe(13);
      expect(new Card(Rank.ACE, Suit.HEARTS).getRankValue()).toBe(14);
    });

    it('should have Ace as highest value', () => {
      const ace = new Card(Rank.ACE, Suit.HEARTS);
      const king = new Card(Rank.KING, Suit.HEARTS);
      expect(ace.getRankValue()).toBeGreaterThan(king.getRankValue());
    });
  });

  describe('compareRank', () => {
    it('should return positive when this card is higher', () => {
      const ace = new Card(Rank.ACE, Suit.HEARTS);
      const king = new Card(Rank.KING, Suit.HEARTS);
      expect(ace.compareRank(king)).toBeGreaterThan(0);
    });

    it('should return negative when this card is lower', () => {
      const two = new Card(Rank.TWO, Suit.HEARTS);
      const three = new Card(Rank.THREE, Suit.HEARTS);
      expect(two.compareRank(three)).toBeLessThan(0);
    });

    it('should return zero when ranks are equal', () => {
      const aceHearts = new Card(Rank.ACE, Suit.HEARTS);
      const aceSpades = new Card(Rank.ACE, Suit.SPADES);
      expect(aceHearts.compareRank(aceSpades)).toBe(0);
    });

    it('should compare correctly across all ranks', () => {
      const two = new Card(Rank.TWO, Suit.HEARTS);
      const five = new Card(Rank.FIVE, Suit.HEARTS);
      const ten = new Card(Rank.TEN, Suit.HEARTS);
      const ace = new Card(Rank.ACE, Suit.HEARTS);

      expect(two.compareRank(five)).toBeLessThan(0);
      expect(five.compareRank(ten)).toBeLessThan(0);
      expect(ten.compareRank(ace)).toBeLessThan(0);
      expect(ace.compareRank(two)).toBeGreaterThan(0);
    });
  });

  describe('fromString', () => {
    it('should create card from valid string', () => {
      const card = Card.fromString('Ah');
      expect(card.rank).toBe(Rank.ACE);
      expect(card.suit).toBe(Suit.HEARTS);
    });

    it('should create cards for all valid combinations', () => {
      const validCards = [
        { str: '2h', rank: Rank.TWO, suit: Suit.HEARTS },
        { str: 'Kd', rank: Rank.KING, suit: Suit.DIAMONDS },
        { str: 'Qc', rank: Rank.QUEEN, suit: Suit.CLUBS },
        { str: 'Js', rank: Rank.JACK, suit: Suit.SPADES },
        { str: 'Th', rank: Rank.TEN, suit: Suit.HEARTS },
        { str: '9d', rank: Rank.NINE, suit: Suit.DIAMONDS },
      ];

      validCards.forEach(({ str, rank, suit }) => {
        const card = Card.fromString(str);
        expect(card.rank).toBe(rank);
        expect(card.suit).toBe(suit);
      });
    });

    it('should throw error for invalid string length', () => {
      expect(() => Card.fromString('A')).toThrow('Invalid card string');
      expect(() => Card.fromString('Ahh')).toThrow('Invalid card string');
      expect(() => Card.fromString('')).toThrow('Invalid card string');
    });

    it('should throw error for invalid rank', () => {
      expect(() => Card.fromString('Xh')).toThrow('Invalid rank');
      expect(() => Card.fromString('1h')).toThrow('Invalid rank');
      expect(() => Card.fromString('Bh')).toThrow('Invalid rank');
    });

    it('should throw error for invalid suit', () => {
      expect(() => Card.fromString('Ax')).toThrow('Invalid suit');
      expect(() => Card.fromString('Aa')).toThrow('Invalid suit');
      expect(() => Card.fromString('AH')).toThrow('Invalid suit');
    });

    it('should round-trip with toString', () => {
      const original = new Card(Rank.KING, Suit.DIAMONDS);
      const roundTrip = Card.fromString(original.toString());
      expect(roundTrip.equals(original)).toBe(true);
    });
  });

  describe('fromStrings', () => {
    it('should create array of cards from string array', () => {
      const cards = Card.fromStrings(['Ah', 'Kd', 'Qc']);
      expect(cards).toHaveLength(3);
      expect(cards[0].rank).toBe(Rank.ACE);
      expect(cards[0].suit).toBe(Suit.HEARTS);
      expect(cards[1].rank).toBe(Rank.KING);
      expect(cards[1].suit).toBe(Suit.DIAMONDS);
      expect(cards[2].rank).toBe(Rank.QUEEN);
      expect(cards[2].suit).toBe(Suit.CLUBS);
    });

    it('should handle empty array', () => {
      const cards = Card.fromStrings([]);
      expect(cards).toHaveLength(0);
    });

    it('should throw error if any string is invalid', () => {
      expect(() => Card.fromStrings(['Ah', 'Xd'])).toThrow();
    });
  });

  // Property-based tests
  describe('Property-based tests', () => {
    // Arbitrary for generating random ranks
    const rankArbitrary = fc.constantFrom(...Object.values(Rank));
    
    // Arbitrary for generating random suits
    const suitArbitrary = fc.constantFrom(...Object.values(Suit));
    
    // Arbitrary for generating random cards
    const cardArbitrary = fc.record({
      rank: rankArbitrary,
      suit: suitArbitrary
    }).map(({ rank, suit }) => new Card(rank, suit));

    it('property: toString and fromString are inverses', () => {
      fc.assert(
        fc.property(cardArbitrary, (card) => {
          const str = card.toString();
          const reconstructed = Card.fromString(str);
          return card.equals(reconstructed);
        }),
        { numRuns: 100 }
      );
    });

    it('property: equals is reflexive (card equals itself)', () => {
      fc.assert(
        fc.property(cardArbitrary, (card) => {
          return card.equals(card);
        }),
        { numRuns: 100 }
      );
    });

    it('property: equals is symmetric', () => {
      fc.assert(
        fc.property(cardArbitrary, cardArbitrary, (card1, card2) => {
          return card1.equals(card2) === card2.equals(card1);
        }),
        { numRuns: 100 }
      );
    });

    it('property: equals is transitive', () => {
      fc.assert(
        fc.property(cardArbitrary, cardArbitrary, cardArbitrary, (card1, card2, card3) => {
          if (card1.equals(card2) && card2.equals(card3)) {
            return card1.equals(card3);
          }
          return true; // Property holds vacuously if precondition not met
        }),
        { numRuns: 100 }
      );
    });

    it('property: compareRank is antisymmetric', () => {
      fc.assert(
        fc.property(cardArbitrary, cardArbitrary, (card1, card2) => {
          const comparison1 = card1.compareRank(card2);
          const comparison2 = card2.compareRank(card1);
          return comparison1 === -comparison2;
        }),
        { numRuns: 100 }
      );
    });

    it('property: compareRank is transitive', () => {
      fc.assert(
        fc.property(cardArbitrary, cardArbitrary, cardArbitrary, (card1, card2, card3) => {
          const cmp12 = card1.compareRank(card2);
          const cmp23 = card2.compareRank(card3);
          const cmp13 = card1.compareRank(card3);
          
          // If card1 > card2 and card2 > card3, then card1 > card3
          if (cmp12 > 0 && cmp23 > 0) {
            return cmp13 > 0;
          }
          // If card1 < card2 and card2 < card3, then card1 < card3
          if (cmp12 < 0 && cmp23 < 0) {
            return cmp13 < 0;
          }
          return true; // Property holds vacuously if precondition not met
        }),
        { numRuns: 100 }
      );
    });

    it('property: getRankValue returns value in valid range', () => {
      fc.assert(
        fc.property(cardArbitrary, (card) => {
          const value = card.getRankValue();
          return value >= 2 && value <= 14;
        }),
        { numRuns: 100 }
      );
    });

    it('property: cards with same rank have same rank value', () => {
      fc.assert(
        fc.property(rankArbitrary, suitArbitrary, suitArbitrary, (rank, suit1, suit2) => {
          const card1 = new Card(rank, suit1);
          const card2 = new Card(rank, suit2);
          return card1.getRankValue() === card2.getRankValue();
        }),
        { numRuns: 100 }
      );
    });

    it('property: compareRank returns 0 iff ranks are equal', () => {
      fc.assert(
        fc.property(cardArbitrary, cardArbitrary, (card1, card2) => {
          const comparison = card1.compareRank(card2);
          const ranksEqual = card1.rank === card2.rank;
          return (comparison === 0) === ranksEqual;
        }),
        { numRuns: 100 }
      );
    });

    it('property: toString always produces 2-character string', () => {
      fc.assert(
        fc.property(cardArbitrary, (card) => {
          return card.toString().length === 2;
        }),
        { numRuns: 100 }
      );
    });
  });
});
