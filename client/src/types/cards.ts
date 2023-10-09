import { Coord3D } from "./world";

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

export const allCards = allSuits.flatMap(
  (suit) => allPips.map((pip) => ({ suit, pip }))[0]
);
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

export const cardDimensions: Coord3D = [5, 5, 0.02];
