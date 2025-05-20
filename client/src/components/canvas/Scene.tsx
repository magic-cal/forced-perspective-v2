import { OrbitControls, Preload } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Environment } from "./Environment";
import { CardSuit, CardValue, CARD_SUITS, CARD_VALUES } from "./Card/types";
import { Card } from "@/components/canvas/Card";

export function Scene() {
  const { camera, gl } = useThree();

  useEffect(() => {
    // Initial camera setup
    camera.lookAt(0, 0, 0);
    camera.position.set(0, 5, 10);

    // Enable shadow mapping
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  // Create a full deck of cards
  const deck = useMemo(() => {
    const cards = [];
    let index = 0;

    // Create all 52 cards
    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        // Add slight random offset to make it look more natural
        cards.push({
          position: [1, 0, index * 0.01] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
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
    <>
      {/* Performance Optimizations */}
      <Preload all />

      {/* Environment and Lighting */}
      <Environment preset="sunset" intensity={1} blur={0.65} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={20}
      />

      {/* Deck of Cards */}
      {deck.map((card, index) => (
        <Card
          key={`${card.suit}-${card.value}-${index}`}
          {...card}
          isInteractive={false}
        />
      ))}
    </>
  );
}
