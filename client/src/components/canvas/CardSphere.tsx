import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Card } from "./Card";
import { CardSuit, CardValue, CARD_SUITS, CARD_VALUES } from "./Card/types";
import { CARD_DIMENSIONS } from "./Card/types";

interface CardSphereProps {
  radius?: number;
  maxCardsPerRow?: number;
  rotationSpeed?: number;
}

export function CardSphere({
  radius = 15,
  maxCardsPerRow = 48,
  rotationSpeed = 0.02,
}: CardSphereProps) {
  const sphereRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Calculate spacing based on card dimensions
  const cardWidth = CARD_DIMENSIONS.width;
  const cardHeight = CARD_DIMENSIONS.height;
  const spacingFactor = 1.001;

  // Generate cards for the sphere
  const cards = [];
  const rows = 20;

  for (let row = 0; row < rows; row++) {
    const rowCards = [];
    const verticalPosition = row / (rows - 1);
    const phi = verticalPosition * Math.PI;

    const sinValue = Math.pow(Math.sin(phi), 2);
    const cardsInRow = Math.max(2, Math.round(maxCardsPerRow * sinValue));

    const rowRadius = radius * (1 + Math.sin(phi) * 0.1);

    if (cardsInRow < 3) continue;

    for (let i = 0; i < cardsInRow; i++) {
      const theta = (i / cardsInRow) * Math.PI * 2;

      const x = rowRadius * Math.sin(phi) * Math.cos(theta);
      const y = rowRadius * Math.cos(phi);
      const z = rowRadius * Math.sin(phi) * Math.sin(theta);

      const suit = CARD_SUITS[i % CARD_SUITS.length];
      const value = CARD_VALUES[i % CARD_VALUES.length];

      rowCards.push(
        <group key={`${row}-${i}`} position={[x, y, z]}>
          <Card
            suit={suit}
            value={value}
            isFlipped={false}
            isInteractive={false}
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
