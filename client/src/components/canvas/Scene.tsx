import { OrbitControls, Preload } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Environment } from "./Environment";
import { CardSuit, CardValue, CARD_SUITS, CARD_VALUES } from "./Card/types";
import { Card } from "@/components/canvas/Card";
import { useSpring, animated } from "@react-spring/three";
import { CARD_DIMENSIONS } from "./Card/types";

interface CardState {
  position: [number, number, number];
  rotation: [number, number, number];
  suit: CardSuit;
  value: CardValue;
  isFlipped: boolean;
}

interface AnimatedCardProps extends CardState {
  finalPosition: [number, number, number];
  isSpread: boolean;
}

function AnimatedCard({
  finalPosition,
  isSpread,
  ...cardProps
}: AnimatedCardProps) {
  const { position, rotation } = useSpring({
    position: isSpread ? finalPosition : cardProps.position,
    rotation: isSpread ? [0, 0, 0] : cardProps.rotation,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  return (
    <animated.group
      position={position as unknown as THREE.Vector3}
      rotation={rotation as unknown as THREE.Euler}
    >
      <Card {...cardProps} isInteractive={false} />
    </animated.group>
  );
}

export function Scene() {
  const { camera, gl } = useThree();
  const [isSpread, setIsSpread] = useState(false);

  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.position.set(0, 8, 20);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  const getFinalPosition = (
    suit: CardSuit,
    value: CardValue,
    index: number
  ): [number, number, number] => {
    const suitIndex = CARD_SUITS.indexOf(suit);
    const valueIndex = CARD_VALUES.indexOf(value);

    const row = suitIndex;
    const col = valueIndex;

    return [(col - 6) * 3, -row * 4, 0];
  };

  const deck = useMemo(() => {
    const cards: CardState[] = [];
    let index = 0;

    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        cards.push({
          position: [0, 0, (index * CARD_DIMENSIONS.thickness) / 2],
          rotation: [0, 0, 0],
          suit,
          value,
          isFlipped: false,
        });
        index++;
      }
    }
    return cards;
  }, []);

  const handleDeckClick = () => {
    setIsSpread(!isSpread);
  };

  return (
    <>
      <Preload all />
      <Environment preset="sunset" intensity={1} blur={0.65} />
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={40}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />

      <group position={[0, 0, 0]} onClick={handleDeckClick}>
        {deck.map((card, index) => (
          <AnimatedCard
            key={`${card.suit}-${card.value}-${index}`}
            {...card}
            finalPosition={getFinalPosition(card.suit, card.value, index)}
            isSpread={isSpread}
          />
        ))}
      </group>
    </>
  );
}
