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

export interface CardData {
  id: string;
  suit: CardSuit;
  value: CardValue;
  position: [number, number, number];
  rotation: [number, number, number];
  isFlipped: boolean;
  isSelected: boolean;
  
  // New fields for trick functionality
  originalValue?: CardValue;
  originalSuit?: CardSuit;
  isForced?: boolean;
  adjacentCardIds?: string[];
}

export type ViewType = 'participant' | 'audience';
export type FlipState = 'face-up' | 'face-down' | 'animating';

export interface ForcedValue {
  suit: CardSuit;
  value: CardValue;
}

export const CARD_DIMENSIONS = {
  width: 2.5,
  height: 3.5,
  thickness: 0.01,
} as const;

export const CARD_SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
export const CARD_VALUES: CardValue[] = [
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
];
