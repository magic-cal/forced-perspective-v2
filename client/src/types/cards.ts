import { Coord3D } from "./world";

export type Card = {
  suit: Suit;
  pip: Pip;
};

export enum Suit {
  Clubs = 0,
  Hearts = 1,
  Spades = 2,
  Diamonds = 3,
}

export enum Pip {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
}

const allSuits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
const allPips = [
  Pip.Ace,
  Pip.Two,
  Pip.Three,
  Pip.Four,
  Pip.Five,
  Pip.Six,
  Pip.Seven,
  Pip.Eight,
  Pip.Nine,
  Pip.Ten,
  Pip.Jack,
  Pip.Queen,
  Pip.King,
];

export const playingCards52 = allSuits.flatMap((suit) =>
  allPips.map((pip) => ({ suit, pip }))
);

export const oneWayDeck52 = (card: Card) => {
  return Array.from({ length: 52 }, () => card);
};

export const aceOfSpades = { suit: Suit.Spades, pip: Pip.Ace };
export const kingOfHearts = { suit: Suit.Hearts, pip: Pip.King };
export const fourOfSpades = { suit: Suit.Spades, pip: Pip.Four };

export const playingCards1 = (card: Card = aceOfSpades) => {
  return [card];
};

export const suitToLetter = (suit: Suit) => {
  switch (suit) {
    case Suit.Clubs:
      return "C";
    case Suit.Diamonds:
      return "D";
    case Suit.Hearts:
      return "H";
    case Suit.Spades:
      return "S";
  }
};

export const CARD_DIMENSIONS: Coord3D = [3.5, 5, 0.02];
export const CARD_PADDING: Coord3D = [0.1, 0.1, 0.1];
