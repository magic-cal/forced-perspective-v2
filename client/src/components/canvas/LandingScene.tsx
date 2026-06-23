import { Float } from "@react-three/drei";
import { Card } from "./Card";
import type { CardSuit, CardValue } from "@/types/cards";

const FLOATING_CARDS: {
  suit: CardSuit;
  value: CardValue;
  position: [number, number, number];
  rotation: [number, number, number];
  floatSpeed: number;
}[] = [
  { suit: "spades",   value: "A",  position: [-22,  -1, -8],  rotation: [0.05,  0.55,  0.18], floatSpeed: 0.4  },
  { suit: "hearts",   value: "K",  position: [-11,   2, -18], rotation: [0.0,   0.18,  0.06], floatSpeed: 0.35 },
  { suit: "diamonds", value: "Q",  position: [  1,   0, -22], rotation: [0.05, -0.08, -0.03], floatSpeed: 0.45 },
  { suit: "clubs",    value: "J",  position: [ 13,   2, -17], rotation: [0.0,  -0.22, -0.08], floatSpeed: 0.3  },
  { suit: "spades",   value: "7",  position: [ 23,  -1,  -7], rotation: [0.05, -0.55, -0.20], floatSpeed: 0.5  },
];

export function LandingScene() {
  return (
    <>
      {FLOATING_CARDS.map((card, i) => (
        <Float
          key={i}
          speed={card.floatSpeed}
          rotationIntensity={0.08}
          floatIntensity={0.6}
          floatingRange={[-0.4, 0.4]}
        >
          <group position={card.position} rotation={card.rotation} scale={3.5}>
            <Card
              id={`landing-card-${i}`}
              suit={card.suit}
              value={card.value}
              isFlipped={true}
              disableInternalRotation={false}
              viewType="participant"
            />
          </group>
        </Float>
      ))}
    </>
  );
}
