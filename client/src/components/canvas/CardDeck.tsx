import { useMemo } from "react";
import { CardSuit, CardValue, CARD_SUITS, CARD_VALUES } from "./Card/types";
import { AnimatedCard } from "./Card/AnimatedCard";

interface CardDeckProps {
  isSpread: boolean;
  onDeckClick: () => void;
}

const getFinalPosition = (
  suit: CardSuit,
  value: CardValue,
  index: number
): [number, number, number] => {
  const suitIndex = CARD_SUITS.indexOf(suit);
  const valueIndex = CARD_VALUES.indexOf(value);

  const row = suitIndex;
  const col = valueIndex;

  return [(col - 6) * 3, -row * 4, 0];
};

export const CardDeck = ({ isSpread, onDeckClick }: CardDeckProps) => {
  const deck = useMemo(() => {
    const cards: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      suit: CardSuit;
      value: CardValue;
      isFlipped: boolean;
    }> = [];
    let index = 0;

    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        cards.push({
          position: [0, 0, (index * 0.01) / 2], // Slightly offset cards
          rotation: [0, 0, 0],
          suit,
          value,
          isFlipped: false,
        });
        index++;
      }
    }
    return cards;
  }, []);

  return (
    <group onClick={onDeckClick}>
      {deck.map((card) => (
        <AnimatedCard
          key={`${card.suit}-${card.value}`}
          finalPosition={getFinalPosition(card.suit, card.value, deck.indexOf(card))}
          isSpread={isSpread}
          {...card}
        />
      ))}
    </group>
  );
};
