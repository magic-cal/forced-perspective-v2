import { useSpring } from "@react-spring/three";
import { Card } from "./Card";
import { CardSuit, CardValue } from "./types";

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

export const AnimatedCard = ({ finalPosition, isSpread, ...cardProps }: AnimatedCardProps) => {
  const { position, rotation } = useSpring({
    position: isSpread ? finalPosition : cardProps.position,
    rotation: isSpread ? [0, 0, 0] : cardProps.rotation,
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  return (
    <group
      position={position as unknown as THREE.Vector3}
      rotation={rotation as unknown as THREE.Euler}
    >
      <Card
        id={cardProps.suit + cardProps.value}
        {...cardProps}
        isInteractive={false}
      />
    </group>
  );
};
