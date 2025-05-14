import { Coord3D } from "./world";

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardValue =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

// Mapping for file names
export const VALUE_TO_FILE_MAP: Record<CardValue, string> = {
  A: "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "11",
  Q: "12",
  K: "13",
};

export const SUIT_TO_FILE_MAP: Record<CardSuit, string> = {
  hearts: "H",
  diamonds: "D",
  clubs: "C",
  spades: "S",
};

// Standard dimensions for a playing card (using common ratio)
export const CARD_DIMENSIONS = {
  width: 2.5,
  height: 3.5,
  thickness: 0.05,
} as const;

// Card data interface
export interface Card {
  id: string;
  suit: CardSuit;
  value: CardValue;
  position: [number, number, number];
  rotation: [number, number, number];
  isFlipped: boolean;
  isSelected: boolean;
}

// Utility functions
export const getCardFileName = (suit: CardSuit, value: CardValue): string => {
  return `${SUIT_TO_FILE_MAP[suit]}-${VALUE_TO_FILE_MAP[value]}`;
};

// Constants for deck creation
export const CARD_SUITS: readonly CardSuit[] = [
  "hearts",
  "diamonds",
  "clubs",
  "spades",
] as const;
export const CARD_VALUES: readonly CardValue[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

// Create a full deck of cards
export const createDeck = (): Card[] => {
  return CARD_SUITS.flatMap((suit) =>
    CARD_VALUES.map((value) => ({
      id: `${suit}-${value}`,
      suit,
      value,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      isFlipped: false,
      isSelected: false,
    }))
  );
};

// Utility type for card ranks (useful for comparing cards)
export const CARD_RANKS: Record<CardValue, number> = {
  A: 14, // Ace high by default
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

// Compare two cards by rank
export const compareCards = (a: Card, b: Card): number => {
  return CARD_RANKS[a.value] - CARD_RANKS[b.value];
};

// Check if a card is face card
export const isFaceCard = (value: CardValue): boolean => {
  return ["J", "Q", "K"].includes(value);
};

// Check if a card is red
export const isRedSuit = (suit: CardSuit): boolean => {
  return ["hearts", "diamonds"].includes(suit);
};

export const playingCards52 = CARD_SUITS.flatMap((suit) =>
  CARD_VALUES.map((value) => ({
    id: `${suit}-${value}`,
    suit,
    value,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    isFlipped: false,
    isSelected: false,
  }))
);

export const oneWayDeck52 = (card: Card) => {
  return Array.from({ length: 52 }, () => card);
};

export const threeCardMonte = () => [aceOfSpades, aceOfClubs, queenOfHearts];

// Predefined cards with complete Card interface implementation
export const aceOfSpades: Card = {
  id: "spades-A",
  suit: "spades",
  value: "A",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isFlipped: false,
  isSelected: false,
};

export const aceOfClubs: Card = {
  id: "clubs-A",
  suit: "clubs",
  value: "A",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isFlipped: false,
  isSelected: false,
};

export const kingOfHearts: Card = {
  id: "hearts-K",
  suit: "hearts",
  value: "K",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isFlipped: false,
  isSelected: false,
};

export const queenOfHearts: Card = {
  id: "hearts-Q",
  suit: "hearts",
  value: "Q",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isFlipped: false,
  isSelected: false,
};

export const fourOfSpades: Card = {
  id: "spades-4",
  suit: "spades",
  value: "4",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isFlipped: false,
  isSelected: false,
};

export const playingCards1 = (card: Card = aceOfSpades) => {
  return [card];
};

export const suitToLetter = (suit: CardSuit) => {
  switch (suit) {
    case "hearts":
      return "H";
    case "diamonds":
      return "D";
    case "clubs":
      return "C";
    case "spades":
      return "S";
  }
};

export const CARD_PADDING: Coord3D = [0.1, 0.1, 0.1];
