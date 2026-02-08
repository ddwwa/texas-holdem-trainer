import React from 'react';
import { Card as ICard } from '../../types/core';
import Card from './Card';
import '../styles/CommunityCards.css';

interface CommunityCardsProps {
  cards: ICard[];
  highlightedCards?: ICard[]; // Cards to highlight (used in winner's hand)
}

function CommunityCards({ cards, highlightedCards = [] }: CommunityCardsProps) {
  const isHighlighted = (card: ICard): boolean => {
    return highlightedCards.some(hc => hc.rank === card.rank && hc.suit === card.suit);
  };

  return (
    <div className="community-cards">
      {cards.length === 0 && (
        <div className="no-cards">Waiting for flop...</div>
      )}
      {cards.map((card, index) => (
        <div key={index} className={isHighlighted(card) ? 'highlighted-card' : ''}>
          <Card card={card} />
        </div>
      ))}
    </div>
  );
}

export default CommunityCards;
