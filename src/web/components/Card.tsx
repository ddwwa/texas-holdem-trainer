import React from 'react';
import { Card as ICard } from '../../types/core';
import '../styles/Card.css';

interface CardProps {
  card: ICard;
  faceDown?: boolean;
}

function Card({ card, faceDown = false }: CardProps) {
  if (faceDown) {
    return <div className="card face-down"></div>;
  }

  const suitSymbols: { [key: string]: string } = {
    'h': '♥',
    'd': '♦',
    'c': '♣',
    's': '♠'
  };

  const suitClass = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades'
  }[card.suit];
  
  const suit = suitSymbols[card.suit];
  
  return (
    <div className={`card ${suitClass}`}>
      <div className="card-content">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{suit}</div>
      </div>
    </div>
  );
}

export default Card;
