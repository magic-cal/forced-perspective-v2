import { Card, CardSuit, CardValue } from '@/types/cards';
import { TRICK_CONFIG } from '@/config/trick';
import * as THREE from 'three';

export const FORCED_CARD = TRICK_CONFIG.FORCED_CARD;

/**
 * Determines if a card should be forced based on selection
 */
export function shouldForceCard(cardId: string, selectedCardId: string): boolean {
  return cardId === selectedCardId;
}

/**
 * Gets the IDs of cards adjacent to a given card in 3D space
 * Adjacent is defined as cards within a certain distance threshold
 */
export function getAdjacentCardIds(
  cardId: string,
  allCards: Array<{ id: string; position: [number, number, number] }>
): string[] {
  const targetCard = allCards.find((c) => c.id === cardId);
  if (!targetCard) return [];

  const targetPos = new THREE.Vector3(...targetCard.position);
  const adjacentThreshold = 4; // Distance threshold for adjacency

  return allCards
    .filter((card) => {
      if (card.id === cardId) return false;
      const cardPos = new THREE.Vector3(...card.position);
      const distance = targetPos.distanceTo(cardPos);
      return distance < adjacentThreshold;
    })
    .map((card) => card.id);
}

/**
 * Applies the forced card value to a card, storing the original values
 */
export function applyForcedCard(card: Card, selectedCardId: string): Card {
  if (!shouldForceCard(card.id, selectedCardId)) {
    return card;
  }

  return {
    ...card,
    suit: FORCED_CARD.suit,
    value: FORCED_CARD.value,
  };
}

/**
 * Checks if a card has the forced card value
 */
export function isForcedCardValue(suit: CardSuit, value: CardValue): boolean {
  return suit === FORCED_CARD.suit && value === FORCED_CARD.value;
}

/**
 * Ensures adjacent cards don't have the forced card value
 * Returns a new card with a different value if it matches the forced card
 */
export function ensureAdjacentNotForced(
  card: Card,
  adjacentCardIds: string[]
): Card {
  if (!adjacentCardIds.includes(card.id)) {
    return card;
  }

  if (isForcedCardValue(card.suit, card.value)) {
    // Change to a different value (next value in sequence)
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const currentIndex = values.indexOf(card.value);
    const newValue = values[(currentIndex + 1) % values.length];

    return {
      ...card,
      value: newValue,
    };
  }

  return card;
}
