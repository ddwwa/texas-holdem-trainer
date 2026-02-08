import { HandResolver } from './HandResolver';
import { Card } from '../card/Card';
import { HandCategory } from '../types/enums';
import { HandRank } from '../types/core';
import * as fc from 'fast-check';
import { Deck } from '../deck/Deck';

describe('HandResolver', () => {
  let resolver: HandResolver;

  beforeEach(() => {
    resolver = new HandResolver();
  });

  describe('evaluateHand', () => {
    it('should identify a royal flush', () => {
      const holeCards = Card.fromStrings(['Ah', 'Kh']);
      const communityCards = Card.fromStrings(['Qh', 'Jh', 'Th', '2d', '3c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.ROYAL_FLUSH);
      expect(result.value).toBe(14); // Ace high
    });

    it('should identify a straight flush', () => {
      const holeCards = Card.fromStrings(['9h', '8h']);
      const communityCards = Card.fromStrings(['7h', '6h', '5h', 'Kd', '2c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH);
      expect(result.value).toBe(9); // 9 high
    });

    it('should identify four of a kind', () => {
      const holeCards = Card.fromStrings(['Ks', 'Kh']);
      const communityCards = Card.fromStrings(['Kd', 'Kc', '5h', 'Ac', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.FOUR_OF_A_KIND);
      expect(result.value).toBe(13); // Kings
      expect(result.kickers).toEqual([14]); // Ace kicker
    });

    it('should identify a full house', () => {
      const holeCards = Card.fromStrings(['Qs', 'Qh']);
      const communityCards = Card.fromStrings(['Qd', '7c', '7h', 'Ac', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.FULL_HOUSE);
      expect(result.value).toBe(12); // Queens
      expect(result.kickers).toEqual([7]); // Sevens
    });

    it('should identify a flush', () => {
      const holeCards = Card.fromStrings(['Ah', 'Kh']);
      const communityCards = Card.fromStrings(['9h', '6h', '3h', '2d', '5c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.FLUSH);
      expect(result.value).toBe(14); // Ace high
      expect(result.kickers).toEqual([13, 9, 6, 3]); // K, 9, 6, 3
    });

    it('should identify a straight', () => {
      const holeCards = Card.fromStrings(['9h', '8d']);
      const communityCards = Card.fromStrings(['7c', '6s', '5h', 'Kd', '2c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.STRAIGHT);
      expect(result.value).toBe(9); // 9 high
    });

    it('should identify a wheel (A-2-3-4-5 straight)', () => {
      const holeCards = Card.fromStrings(['Ah', '2d']);
      const communityCards = Card.fromStrings(['3c', '4s', '5h', 'Kd', 'Qc']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.STRAIGHT);
      // For wheel, the high card is 5 (ace plays low)
    });

    it('should identify three of a kind', () => {
      const holeCards = Card.fromStrings(['Js', 'Jh']);
      const communityCards = Card.fromStrings(['Jd', '8c', '5h', 'Ac', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.THREE_OF_A_KIND);
      expect(result.value).toBe(11); // Jacks
      expect(result.kickers).toEqual([14, 8]); // A, 8
    });

    it('should identify two pair', () => {
      const holeCards = Card.fromStrings(['Ks', 'Kh']);
      const communityCards = Card.fromStrings(['9d', '9c', '5h', 'Ac', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.TWO_PAIR);
      expect(result.value).toBe(13); // Kings (high pair)
      expect(result.kickers).toEqual([9, 14]); // 9s (low pair), A (kicker)
    });

    it('should identify one pair', () => {
      const holeCards = Card.fromStrings(['Ts', 'Th']);
      const communityCards = Card.fromStrings(['7d', '5c', '3h', 'Ac', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.PAIR);
      expect(result.value).toBe(10); // Tens
      expect(result.kickers).toEqual([14, 7, 5]); // A, 7, 5
    });

    it('should identify high card', () => {
      const holeCards = Card.fromStrings(['Ah', 'Kd']);
      const communityCards = Card.fromStrings(['Qc', 'Js', '9h', '7d', '2c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.HIGH_CARD);
      expect(result.value).toBe(14); // Ace high
      expect(result.kickers).toEqual([13, 12, 11, 9]); // K, Q, J, 9
    });

    it('should choose the best 5-card hand from 7 cards', () => {
      // Player has pocket aces, board has three kings
      const holeCards = Card.fromStrings(['As', 'Ah']);
      const communityCards = Card.fromStrings(['Kd', 'Kc', 'Kh', '2d', '3c']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      // Should recognize full house (Kings over Aces)
      expect(result.category).toBe(HandCategory.FULL_HOUSE);
      expect(result.value).toBe(13); // Kings
      expect(result.kickers).toEqual([14]); // Aces
    });

    it('should throw error if less than 5 cards provided', () => {
      const holeCards = Card.fromStrings(['As', 'Ah']);
      const communityCards = Card.fromStrings(['Kd', 'Kc']);
      
      expect(() => resolver.evaluateHand(holeCards, communityCards)).toThrow('Need at least 5 cards');
    });
  });

  describe('compareHands', () => {
    it('should rank royal flush higher than straight flush', () => {
      const royalFlush: HandRank = {
        category: HandCategory.ROYAL_FLUSH,
        value: 14,
        kickers: []
      };
      const straightFlush: HandRank = {
        category: HandCategory.STRAIGHT_FLUSH,
        value: 9,
        kickers: []
      };
      
      expect(resolver.compareHands(royalFlush, straightFlush)).toBeGreaterThan(0);
      expect(resolver.compareHands(straightFlush, royalFlush)).toBeLessThan(0);
    });

    it('should rank straight flush higher than four of a kind', () => {
      const straightFlush: HandRank = {
        category: HandCategory.STRAIGHT_FLUSH,
        value: 9,
        kickers: []
      };
      const fourOfAKind: HandRank = {
        category: HandCategory.FOUR_OF_A_KIND,
        value: 14,
        kickers: [13]
      };
      
      expect(resolver.compareHands(straightFlush, fourOfAKind)).toBeGreaterThan(0);
    });

    it('should rank four of a kind higher than full house', () => {
      const fourOfAKind: HandRank = {
        category: HandCategory.FOUR_OF_A_KIND,
        value: 2,
        kickers: [3]
      };
      const fullHouse: HandRank = {
        category: HandCategory.FULL_HOUSE,
        value: 14,
        kickers: [13]
      };
      
      expect(resolver.compareHands(fourOfAKind, fullHouse)).toBeGreaterThan(0);
    });

    it('should rank full house higher than flush', () => {
      const fullHouse: HandRank = {
        category: HandCategory.FULL_HOUSE,
        value: 2,
        kickers: [3]
      };
      const flush: HandRank = {
        category: HandCategory.FLUSH,
        value: 14,
        kickers: [13, 12, 11, 10]
      };
      
      expect(resolver.compareHands(fullHouse, flush)).toBeGreaterThan(0);
    });

    it('should rank flush higher than straight', () => {
      const flush: HandRank = {
        category: HandCategory.FLUSH,
        value: 7,
        kickers: [5, 4, 3, 2]
      };
      const straight: HandRank = {
        category: HandCategory.STRAIGHT,
        value: 14,
        kickers: []
      };
      
      expect(resolver.compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it('should rank straight higher than three of a kind', () => {
      const straight: HandRank = {
        category: HandCategory.STRAIGHT,
        value: 5,
        kickers: []
      };
      const threeOfAKind: HandRank = {
        category: HandCategory.THREE_OF_A_KIND,
        value: 14,
        kickers: [13, 12]
      };
      
      expect(resolver.compareHands(straight, threeOfAKind)).toBeGreaterThan(0);
    });

    it('should rank three of a kind higher than two pair', () => {
      const threeOfAKind: HandRank = {
        category: HandCategory.THREE_OF_A_KIND,
        value: 2,
        kickers: [3, 4]
      };
      const twoPair: HandRank = {
        category: HandCategory.TWO_PAIR,
        value: 14,
        kickers: [13, 12]
      };
      
      expect(resolver.compareHands(threeOfAKind, twoPair)).toBeGreaterThan(0);
    });

    it('should rank two pair higher than one pair', () => {
      const twoPair: HandRank = {
        category: HandCategory.TWO_PAIR,
        value: 3,
        kickers: [2, 4]
      };
      const onePair: HandRank = {
        category: HandCategory.PAIR,
        value: 14,
        kickers: [13, 12, 11]
      };
      
      expect(resolver.compareHands(twoPair, onePair)).toBeGreaterThan(0);
    });

    it('should rank one pair higher than high card', () => {
      const onePair: HandRank = {
        category: HandCategory.PAIR,
        value: 2,
        kickers: [3, 4, 5]
      };
      const highCard: HandRank = {
        category: HandCategory.HIGH_CARD,
        value: 14,
        kickers: [13, 12, 11, 10]
      };
      
      expect(resolver.compareHands(onePair, highCard)).toBeGreaterThan(0);
    });

    it('should compare same category by value', () => {
      const acesPair: HandRank = {
        category: HandCategory.PAIR,
        value: 14,
        kickers: [13, 12, 11]
      };
      const kingsPair: HandRank = {
        category: HandCategory.PAIR,
        value: 13,
        kickers: [14, 12, 11]
      };
      
      expect(resolver.compareHands(acesPair, kingsPair)).toBeGreaterThan(0);
    });

    it('should compare same category and value by kickers', () => {
      const hand1: HandRank = {
        category: HandCategory.PAIR,
        value: 10,
        kickers: [14, 13, 12]
      };
      const hand2: HandRank = {
        category: HandCategory.PAIR,
        value: 10,
        kickers: [14, 13, 11]
      };
      
      expect(resolver.compareHands(hand1, hand2)).toBeGreaterThan(0);
    });

    it('should return 0 for identical hands', () => {
      const hand1: HandRank = {
        category: HandCategory.PAIR,
        value: 10,
        kickers: [14, 13, 12]
      };
      const hand2: HandRank = {
        category: HandCategory.PAIR,
        value: 10,
        kickers: [14, 13, 12]
      };
      
      expect(resolver.compareHands(hand1, hand2)).toBe(0);
    });

    it('should handle kicker comparison with different lengths', () => {
      const hand1: HandRank = {
        category: HandCategory.FLUSH,
        value: 14,
        kickers: [13, 12, 11, 10]
      };
      const hand2: HandRank = {
        category: HandCategory.FLUSH,
        value: 14,
        kickers: [13, 12, 11, 9]
      };
      
      expect(resolver.compareHands(hand1, hand2)).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple pairs and choose the best two', () => {
      // Board has three pairs, should choose the two highest
      const holeCards = Card.fromStrings(['Ks', 'Kh']);
      const communityCards = Card.fromStrings(['9d', '9c', '5h', '5c', '2d']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.TWO_PAIR);
      expect(result.value).toBe(13); // Kings
      expect(result.kickers[0]).toBe(9); // Nines (second pair)
    });

    it('should handle full house with multiple three of a kinds', () => {
      // If there are two three of a kinds, should use the higher one as trips
      const holeCards = Card.fromStrings(['Ks', 'Kh']);
      const communityCards = Card.fromStrings(['Kd', '9c', '9h', '9d', '2s']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.FULL_HOUSE);
      // Should be kings over nines (higher three of a kind = kings)
      expect(result.value).toBe(13); // Kings
      expect(result.kickers).toEqual([9]); // Nines
    });

    it('should correctly evaluate with exactly 5 cards', () => {
      const holeCards = Card.fromStrings(['As', 'Ah']);
      const communityCards = Card.fromStrings(['Kd', 'Kc', 'Kh']);
      
      const result = resolver.evaluateHand(holeCards, communityCards);
      
      expect(result.category).toBe(HandCategory.FULL_HOUSE);
    });
  });

  /**
   * Task 3.2: Unit tests for hand evaluation
   * Example 2: Hand ranking evaluation
   * Validates: Requirements 7.3
   */
  describe('hand ranking hierarchy - comprehensive', () => {
    it('should correctly order all hand categories from best to worst', () => {
      // Create one example of each hand category
      const royalFlush: HandRank = { category: HandCategory.ROYAL_FLUSH, value: 14, kickers: [] };
      const straightFlush: HandRank = { category: HandCategory.STRAIGHT_FLUSH, value: 9, kickers: [] };
      const fourOfAKind: HandRank = { category: HandCategory.FOUR_OF_A_KIND, value: 10, kickers: [14] };
      const fullHouse: HandRank = { category: HandCategory.FULL_HOUSE, value: 10, kickers: [9] };
      const flush: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [13, 11, 9, 7] };
      const straight: HandRank = { category: HandCategory.STRAIGHT, value: 10, kickers: [] };
      const threeOfAKind: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 10, kickers: [14, 13] };
      const twoPair: HandRank = { category: HandCategory.TWO_PAIR, value: 14, kickers: [13, 12] };
      const onePair: HandRank = { category: HandCategory.PAIR, value: 14, kickers: [13, 12, 11] };
      const highCard: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 12, 11, 10] };

      // Royal flush beats everything
      expect(resolver.compareHands(royalFlush, straightFlush)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, fourOfAKind)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, fullHouse)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, flush)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, straight)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, threeOfAKind)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, twoPair)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, onePair)).toBeGreaterThan(0);
      expect(resolver.compareHands(royalFlush, highCard)).toBeGreaterThan(0);

      // Straight flush beats everything except royal flush
      expect(resolver.compareHands(straightFlush, fourOfAKind)).toBeGreaterThan(0);
      expect(resolver.compareHands(straightFlush, fullHouse)).toBeGreaterThan(0);
      expect(resolver.compareHands(straightFlush, flush)).toBeGreaterThan(0);
      expect(resolver.compareHands(straightFlush, straight)).toBeGreaterThan(0);

      // Four of a kind beats full house and below
      expect(resolver.compareHands(fourOfAKind, fullHouse)).toBeGreaterThan(0);
      expect(resolver.compareHands(fourOfAKind, flush)).toBeGreaterThan(0);
      expect(resolver.compareHands(fourOfAKind, straight)).toBeGreaterThan(0);

      // Full house beats flush and below
      expect(resolver.compareHands(fullHouse, flush)).toBeGreaterThan(0);
      expect(resolver.compareHands(fullHouse, straight)).toBeGreaterThan(0);
      expect(resolver.compareHands(fullHouse, threeOfAKind)).toBeGreaterThan(0);

      // Flush beats straight and below
      expect(resolver.compareHands(flush, straight)).toBeGreaterThan(0);
      expect(resolver.compareHands(flush, threeOfAKind)).toBeGreaterThan(0);
      expect(resolver.compareHands(flush, twoPair)).toBeGreaterThan(0);

      // Straight beats three of a kind and below
      expect(resolver.compareHands(straight, threeOfAKind)).toBeGreaterThan(0);
      expect(resolver.compareHands(straight, twoPair)).toBeGreaterThan(0);
      expect(resolver.compareHands(straight, onePair)).toBeGreaterThan(0);

      // Three of a kind beats two pair and below
      expect(resolver.compareHands(threeOfAKind, twoPair)).toBeGreaterThan(0);
      expect(resolver.compareHands(threeOfAKind, onePair)).toBeGreaterThan(0);
      expect(resolver.compareHands(threeOfAKind, highCard)).toBeGreaterThan(0);

      // Two pair beats one pair and high card
      expect(resolver.compareHands(twoPair, onePair)).toBeGreaterThan(0);
      expect(resolver.compareHands(twoPair, highCard)).toBeGreaterThan(0);

      // One pair beats high card
      expect(resolver.compareHands(onePair, highCard)).toBeGreaterThan(0);
    });
  });

  describe('kicker logic - comprehensive', () => {
    describe('four of a kind kickers', () => {
      it('should compare four of a kind by quad rank first', () => {
        const acesQuad: HandRank = { category: HandCategory.FOUR_OF_A_KIND, value: 14, kickers: [2] };
        const kingsQuad: HandRank = { category: HandCategory.FOUR_OF_A_KIND, value: 13, kickers: [14] };
        
        expect(resolver.compareHands(acesQuad, kingsQuad)).toBeGreaterThan(0);
      });

      it('should compare four of a kind by kicker when quads are equal', () => {
        const quadWithAceKicker: HandRank = { category: HandCategory.FOUR_OF_A_KIND, value: 10, kickers: [14] };
        const quadWithKingKicker: HandRank = { category: HandCategory.FOUR_OF_A_KIND, value: 10, kickers: [13] };
        
        expect(resolver.compareHands(quadWithAceKicker, quadWithKingKicker)).toBeGreaterThan(0);
      });
    });

    describe('full house kickers', () => {
      it('should compare full house by trips rank first', () => {
        const kingsFullOfAces: HandRank = { category: HandCategory.FULL_HOUSE, value: 13, kickers: [14] };
        const queensFullOfAces: HandRank = { category: HandCategory.FULL_HOUSE, value: 12, kickers: [14] };
        
        expect(resolver.compareHands(kingsFullOfAces, queensFullOfAces)).toBeGreaterThan(0);
      });

      it('should compare full house by pair rank when trips are equal', () => {
        const tensFullOfAces: HandRank = { category: HandCategory.FULL_HOUSE, value: 10, kickers: [14] };
        const tensFullOfKings: HandRank = { category: HandCategory.FULL_HOUSE, value: 10, kickers: [13] };
        
        expect(resolver.compareHands(tensFullOfAces, tensFullOfKings)).toBeGreaterThan(0);
      });
    });

    describe('flush kickers', () => {
      it('should compare flush by high card first', () => {
        const aceHighFlush: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [10, 8, 6, 4] };
        const kingHighFlush: HandRank = { category: HandCategory.FLUSH, value: 13, kickers: [12, 11, 10, 9] };
        
        expect(resolver.compareHands(aceHighFlush, kingHighFlush)).toBeGreaterThan(0);
      });

      it('should compare flush by second kicker when high cards are equal', () => {
        const flush1: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [13, 11, 9, 7] };
        const flush2: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [13, 10, 9, 7] };
        
        expect(resolver.compareHands(flush1, flush2)).toBeGreaterThan(0);
      });

      it('should compare flush by all kickers in order', () => {
        const flush1: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [13, 11, 9, 8] };
        const flush2: HandRank = { category: HandCategory.FLUSH, value: 14, kickers: [13, 11, 9, 7] };
        
        expect(resolver.compareHands(flush1, flush2)).toBeGreaterThan(0);
      });
    });

    describe('straight kickers', () => {
      it('should compare straights by high card', () => {
        const aceHighStraight: HandRank = { category: HandCategory.STRAIGHT, value: 14, kickers: [] };
        const kingHighStraight: HandRank = { category: HandCategory.STRAIGHT, value: 13, kickers: [] };
        
        expect(resolver.compareHands(aceHighStraight, kingHighStraight)).toBeGreaterThan(0);
      });

      it('should recognize wheel (5-high) as lowest straight', () => {
        const wheel: HandRank = { category: HandCategory.STRAIGHT, value: 5, kickers: [] };
        const sixHighStraight: HandRank = { category: HandCategory.STRAIGHT, value: 6, kickers: [] };
        
        expect(resolver.compareHands(sixHighStraight, wheel)).toBeGreaterThan(0);
      });
    });

    describe('three of a kind kickers', () => {
      it('should compare three of a kind by trips rank first', () => {
        const acesTrips: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 14, kickers: [2, 3] };
        const kingsTrips: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 13, kickers: [14, 12] };
        
        expect(resolver.compareHands(acesTrips, kingsTrips)).toBeGreaterThan(0);
      });

      it('should compare three of a kind by first kicker when trips are equal', () => {
        const tripsWithAceKicker: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 10, kickers: [14, 13] };
        const tripsWithKingKicker: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 10, kickers: [13, 12] };
        
        expect(resolver.compareHands(tripsWithAceKicker, tripsWithKingKicker)).toBeGreaterThan(0);
      });

      it('should compare three of a kind by second kicker when first kicker is equal', () => {
        const trips1: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 10, kickers: [14, 13] };
        const trips2: HandRank = { category: HandCategory.THREE_OF_A_KIND, value: 10, kickers: [14, 12] };
        
        expect(resolver.compareHands(trips1, trips2)).toBeGreaterThan(0);
      });
    });

    describe('two pair kickers', () => {
      it('should compare two pair by high pair first', () => {
        const acesAndKings: HandRank = { category: HandCategory.TWO_PAIR, value: 14, kickers: [13, 12] };
        const acesAndQueens: HandRank = { category: HandCategory.TWO_PAIR, value: 14, kickers: [12, 11] };
        
        expect(resolver.compareHands(acesAndKings, acesAndQueens)).toBeGreaterThan(0);
      });

      it('should compare two pair by low pair when high pairs are equal', () => {
        const kingsAndTens: HandRank = { category: HandCategory.TWO_PAIR, value: 13, kickers: [10, 14] };
        const kingsAndNines: HandRank = { category: HandCategory.TWO_PAIR, value: 13, kickers: [9, 14] };
        
        expect(resolver.compareHands(kingsAndTens, kingsAndNines)).toBeGreaterThan(0);
      });

      it('should compare two pair by kicker when both pairs are equal', () => {
        const twoPairWithAceKicker: HandRank = { category: HandCategory.TWO_PAIR, value: 13, kickers: [10, 14] };
        const twoPairWithKingKicker: HandRank = { category: HandCategory.TWO_PAIR, value: 13, kickers: [10, 13] };
        
        expect(resolver.compareHands(twoPairWithAceKicker, twoPairWithKingKicker)).toBeGreaterThan(0);
      });
    });

    describe('one pair kickers', () => {
      it('should compare one pair by pair rank first', () => {
        const acesPair: HandRank = { category: HandCategory.PAIR, value: 14, kickers: [2, 3, 4] };
        const kingsPair: HandRank = { category: HandCategory.PAIR, value: 13, kickers: [14, 12, 11] };
        
        expect(resolver.compareHands(acesPair, kingsPair)).toBeGreaterThan(0);
      });

      it('should compare one pair by first kicker when pairs are equal', () => {
        const pairWithAceKicker: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [14, 13, 12] };
        const pairWithKingKicker: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [13, 12, 11] };
        
        expect(resolver.compareHands(pairWithAceKicker, pairWithKingKicker)).toBeGreaterThan(0);
      });

      it('should compare one pair by second kicker when first kicker is equal', () => {
        const pair1: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [14, 13, 12] };
        const pair2: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [14, 12, 11] };
        
        expect(resolver.compareHands(pair1, pair2)).toBeGreaterThan(0);
      });

      it('should compare one pair by third kicker when first two kickers are equal', () => {
        const pair1: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [14, 13, 12] };
        const pair2: HandRank = { category: HandCategory.PAIR, value: 10, kickers: [14, 13, 11] };
        
        expect(resolver.compareHands(pair1, pair2)).toBeGreaterThan(0);
      });
    });

    describe('high card kickers', () => {
      it('should compare high card by highest card first', () => {
        const aceHigh: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [10, 8, 6, 4] };
        const kingHigh: HandRank = { category: HandCategory.HIGH_CARD, value: 13, kickers: [12, 11, 10, 9] };
        
        expect(resolver.compareHands(aceHigh, kingHigh)).toBeGreaterThan(0);
      });

      it('should compare high card by second kicker when high cards are equal', () => {
        const hand1: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 11, 9, 7] };
        const hand2: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 10, 9, 7] };
        
        expect(resolver.compareHands(hand1, hand2)).toBeGreaterThan(0);
      });

      it('should compare high card by all kickers in order', () => {
        const hand1: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 11, 9, 8] };
        const hand2: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 11, 9, 7] };
        
        expect(resolver.compareHands(hand1, hand2)).toBeGreaterThan(0);
      });

      it('should recognize identical high card hands as ties', () => {
        const hand1: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 11, 9, 7] };
        const hand2: HandRank = { category: HandCategory.HIGH_CARD, value: 14, kickers: [13, 11, 9, 7] };
        
        expect(resolver.compareHands(hand1, hand2)).toBe(0);
      });
    });
  });

  describe('determineWinners', () => {
    describe('Property 20: Showdown occurs with multiple players', () => {
      it('**Validates: Requirements 7.1, 10.3** - should determine winner when multiple players reach showdown', () => {
        fc.assert(
          fc.property(
            fc.array(fc.integer({ min: 0, max: 51 }), { minLength: 7, maxLength: 7 }).filter((arr: number[]) => new Set(arr).size === 7),
            (cardIndices: number[]) => {
              const deck = new Deck();
              const cards = cardIndices.map(i => deck['cards'][i]);
              
              const player1 = {
                id: 'player1',
                holeCards: [cards[0], cards[1]],
                hasFolded: false
              };
              
              const player2 = {
                id: 'player2',
                holeCards: [cards[2], cards[3]],
                hasFolded: false
              };
              
              const communityCards = cards.slice(4, 7);
              
              const winners = resolver.determineWinners([player1, player2], communityCards);
              
              // Should return at least one winner
              expect(winners.length).toBeGreaterThanOrEqual(1);
              // Winners should be from the player list
              expect(['player1', 'player2']).toEqual(expect.arrayContaining(winners));
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 21: Single remaining player wins immediately', () => {
      it('**Validates: Requirements 7.2, 10.5** - should award pot to single remaining player without showdown', () => {
        fc.assert(
          fc.property(
            fc.array(fc.integer({ min: 0, max: 51 }), { minLength: 7, maxLength: 7 }).filter((arr: number[]) => new Set(arr).size === 7),
            (cardIndices: number[]) => {
              const deck = new Deck();
              const cards = cardIndices.map(i => deck['cards'][i]);
              
              const player1 = {
                id: 'player1',
                holeCards: [cards[0], cards[1]],
                hasFolded: false
              };
              
              const player2 = {
                id: 'player2',
                holeCards: [cards[2], cards[3]],
                hasFolded: true // Folded
              };
              
              const communityCards = cards.slice(4, 7);
              
              const winners = resolver.determineWinners([player1, player2], communityCards);
              
              // Should return exactly one winner
              expect(winners).toEqual(['player1']);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 22: Tied hands split pot equally', () => {
      it('**Validates: Requirements 7.4** - should identify tied hands correctly', () => {
        // Create a scenario where two players have identical hands
        const communityCards = Card.fromStrings(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
        
        const player1 = {
          id: 'player1',
          holeCards: Card.fromStrings(['2c', '3c']), // Both have royal flush from board
          hasFolded: false
        };
        
        const player2 = {
          id: 'player2',
          holeCards: Card.fromStrings(['4d', '5d']), // Both have royal flush from board
          hasFolded: false
        };
        
        const winners = resolver.determineWinners([player1, player2], communityCards);
        
        // Both should win (tie)
        expect(winners).toHaveLength(2);
        expect(winners).toContain('player1');
        expect(winners).toContain('player2');
      });

      it('**Validates: Requirements 7.4** - should handle three-way ties', () => {
        const communityCards = Card.fromStrings(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
        
        const players = [
          { id: 'player1', holeCards: Card.fromStrings(['2c', '3c']), hasFolded: false },
          { id: 'player2', holeCards: Card.fromStrings(['4d', '5d']), hasFolded: false },
          { id: 'player3', holeCards: Card.fromStrings(['6s', '7s']), hasFolded: false }
        ];
        
        const winners = resolver.determineWinners(players, communityCards);
        
        // All three should win (tie)
        expect(winners).toHaveLength(3);
        expect(winners).toContain('player1');
        expect(winners).toContain('player2');
        expect(winners).toContain('player3');
      });
    });

    describe('Property 23: Side pot eligibility', () => {
      it('**Validates: Requirements 7.5** - should only include eligible players in winner determination', () => {
        fc.assert(
          fc.property(
            fc.array(fc.integer({ min: 0, max: 51 }), { minLength: 9, maxLength: 9 }).filter((arr: number[]) => new Set(arr).size === 9),
            (cardIndices: number[]) => {
              const deck = new Deck();
              const cards = cardIndices.map(i => deck['cards'][i]);
              
              const players = [
                { id: 'player1', holeCards: [cards[0], cards[1]], hasFolded: false },
                { id: 'player2', holeCards: [cards[2], cards[3]], hasFolded: false },
                { id: 'player3', holeCards: [cards[4], cards[5]], hasFolded: true } // Folded - not eligible
              ];
              
              const communityCards = cards.slice(6, 9);
              
              const winners = resolver.determineWinners(players, communityCards);
              
              // Folded player should never win
              expect(winners).not.toContain('player3');
              // Winners should only be from active players
              winners.forEach((winnerId: string) => {
                expect(['player1', 'player2']).toContain(winnerId);
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('unit tests for determineWinners', () => {
      it('should determine single winner correctly', () => {
        const player1 = {
          id: 'player1',
          holeCards: Card.fromStrings(['Ah', 'Kh']), // Royal flush
          hasFolded: false
        };
        
        const player2 = {
          id: 'player2',
          holeCards: Card.fromStrings(['2c', '3c']), // High card
          hasFolded: false
        };
        
        const communityCards = Card.fromStrings(['Qh', 'Jh', 'Th', '4d', '5s']);
        
        const winners = resolver.determineWinners([player1, player2], communityCards);
        
        expect(winners).toEqual(['player1']);
      });

      it('should handle all players folded except one', () => {
        const players = [
          { id: 'player1', holeCards: Card.fromStrings(['2c', '3c']), hasFolded: false },
          { id: 'player2', holeCards: Card.fromStrings(['4d', '5d']), hasFolded: true },
          { id: 'player3', holeCards: Card.fromStrings(['6s', '7s']), hasFolded: true }
        ];
        
        const communityCards = Card.fromStrings(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
        
        const winners = resolver.determineWinners(players, communityCards);
        
        expect(winners).toEqual(['player1']);
      });

      it('should return empty array if all players folded', () => {
        const players = [
          { id: 'player1', holeCards: Card.fromStrings(['2c', '3c']), hasFolded: true },
          { id: 'player2', holeCards: Card.fromStrings(['4d', '5d']), hasFolded: true }
        ];
        
        const communityCards = Card.fromStrings(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
        
        const winners = resolver.determineWinners(players, communityCards);
        
        expect(winners).toEqual([]);
      });
    });
  });
});

