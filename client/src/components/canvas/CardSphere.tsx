import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Card } from "./Card";
import { CARD_DIMENSIONS, CARD_SUITS, CARD_VALUES } from "./Card/types";

interface CardSphereProps {
  radius?: number;
  maxCardsPerRow?: number;
  rotationSpeed?: number;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Deterministic Fisher-Yates shuffle using a seeded RNG
function deterministicShuffleArray<T>(array: T[], seed: number): T[] {
  // Simple LCG (Linear Congruential Generator)
  function seededRandom() {
    // LCG constants
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function CardSphere({
  radius = 15,
  maxCardsPerRow = 48,
  rotationSpeed = 0.02,
}: CardSphereProps) {
  const sphereRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Create and shuffle a deck of all possible cards
  const shuffledDeck = useMemo(() => {
    const deck = [];
    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        deck.push({ suit, value });
      }
    }
    return deterministicShuffleArray(deck, 111111);
  }, []);

  // Calculate spacing based on card dimensions
  const cardWidth = CARD_DIMENSIONS.width;
  const cardHeight = CARD_DIMENSIONS.height;
  const spacingFactor = 1.4;

  // Generate cards for the sphere
  const cards = [];
  const rows = 20;
  let cardIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowCards = [];
    const verticalPosition = row / (rows - 1);
    const phi = verticalPosition * Math.PI;

    const sinValue = Math.pow(Math.sin(phi), 2);
    const cardsInRow = Math.max(2, Math.round(maxCardsPerRow * sinValue));

    const rowRadius = radius * (1 + Math.sin(phi) * 0.1) * spacingFactor;

    if (cardsInRow < 3) continue;

    for (let i = 0; i < cardsInRow; i++) {
      const theta = (i / cardsInRow) * Math.PI * 2;

      const x = rowRadius * Math.sin(phi) * Math.cos(theta);
      const y = rowRadius * Math.cos(phi);
      const z = rowRadius * Math.sin(phi) * Math.sin(theta);

      const verticalOffset = cardHeight * 1.0 * Math.sin(phi);

      // Get the next card from our shuffled deck
      const card = shuffledDeck[cardIndex % shuffledDeck.length];
      cardIndex++;

      rowCards.push(
        <group key={`${row}-${i}`} position={[x, y + verticalOffset, z]}>
          <Card
            id={`${card.suit}-${card.value}-${row}-${i}`}
            suit={card.suit}
            value={card.value}
            isFlipped={false}
          />
        </group>
      );
    }
    cards.push(
      <group key={row} rotation={[0, 0, 0]}>
        {rowCards}
      </group>
    );
  }

  // Animate the rows and update card rotations
  useFrame((state, delta) => {
    if (sphereRef.current) {
      // Rotate each row in alternating directions
      sphereRef.current.children.forEach((row, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        row.rotation.y += rotationSpeed * direction * delta;

        row.children.forEach((cardGroup) => {
          const cardPosition = new THREE.Vector3();
          cardGroup.getWorldPosition(cardPosition);

          cardGroup.lookAt(new THREE.Vector3(0, 0, 0));
        });
      });
    }
  });

  return <group ref={sphereRef}>{cards}</group>;
}
