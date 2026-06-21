import { useRef } from "react";
import { Card } from "./Card";
import { useGameStore } from "@/store/gameStore";

interface DeckProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const CARD_VALUES = [
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
const CARD_SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;

export function Deck({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: DeckProps) {
  const deckRef = useRef<THREE.Group>(null);

  return (
    <group ref={deckRef} position={position} rotation={rotation}>
      {/* Example: Render a few cards in a fan layout */}
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          position={[i * 0.5, i * 0.02, 0]}
          rotation={[0, i * -0.1, 0]}
          suit="hearts"
          value="A"
          // onClick={() => handleCardClick(i)}
        />
      ))}
    </group>
  );
}
