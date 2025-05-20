import { OrbitControls, Preload } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { Environment } from "./Environment";
import { Card } from "./Card";
import { CardSuit, CardValue } from "./Card/types";

export function Scene() {
  const { camera, gl } = useThree();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  useEffect(() => {
    // Initial camera setup
    camera.lookAt(0, 0, 0);
    camera.position.set(0, 5, 10);

    // Enable shadow mapping
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  // Demo cards setup
  const demoCards = [
    // Center card - face up
    {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      suit: "hearts" as CardSuit,
      value: "A" as CardValue,
      isFlipped: false,
    },
    // Left card - face down
    {
      position: [-3, 0, 0] as [number, number, number],
      rotation: [0, 0.2, 0] as [number, number, number],
      suit: "spades" as CardSuit,
      value: "K" as CardValue,
      isFlipped: true,
    },
    // Right card - face up, tilted
    {
      position: [3, 0, 0] as [number, number, number],
      rotation: [0.2, -0.2, 0] as [number, number, number],
      suit: "diamonds" as CardSuit,
      value: "Q" as CardValue,
      isFlipped: false,
    },
    // Back card - face up, more tilted
    {
      position: [0, 0, -3] as [number, number, number],
      rotation: [0.3, 0, 0] as [number, number, number],
      suit: "clubs" as CardSuit,
      value: "J" as CardValue,
      isFlipped: false,
    },
  ];

  return (
    <>
      {/* Performance Optimizations */}
      <Preload all />

      {/* Environment and Lighting */}
      <Environment preset="city" intensity={1} blur={0.65} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={20}
      />

      {/* <Deck /> */}

      {/* Ground plane for better perspective */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Demo Cards */}
      {demoCards.map((card, index) => (
        <Card
          key={index}
          {...card}
          isSelected={selectedCard === index}
          isInteractive={true}
          onClick={() => setSelectedCard(index === selectedCard ? null : index)}
          onHover={(isHovering: boolean) => {
            // Optional hover effect demonstrat
            // ion
            console.log(`Card ${index} hover: ${isHovering}`);
          }}
        />
      ))}
    </>
  );
}
