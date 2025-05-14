import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CardSuit, CardValue } from "./types";
import { animated, useSpring } from "@react-spring/three";

export interface CardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  suit: CardSuit;
  value: CardValue;
  isFlipped?: boolean;
  isSelected?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
}

export function Card({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  suit,
  value,
  isFlipped = false,
  isSelected = false,
  isInteractive = true,
  onClick,
  onHover,
}: CardProps) {
  const group = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Animation springs
  const { hoverScale, rotationY } = useSpring({
    hoverScale: isHovered ? 1.1 : 1,
    rotationY: isFlipped ? Math.PI : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Selection animation
  useFrame((state) => {
    if (!group.current || !isSelected) return;

    // Gentle floating animation for selected cards
    const t = state.clock.getElapsedTime();
    group.current.position.y = position[1] + Math.sin(t * 2) * 0.1;
  });

  const handlePointerOver = () => {
    if (!isInteractive) return;
    setIsHovered(true);
    onHover?.(true);
  };

  const handlePointerOut = () => {
    if (!isInteractive) return;
    setIsHovered(false);
    onHover?.(false);
  };

  const handleClick = () => {
    if (!isInteractive) return;
    onClick?.();
  };

  return (
    <animated.group
      ref={group}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={hoverScale}
    >
      {/* Front face */}
      <animated.mesh castShadow receiveShadow rotation-y={rotationY}>
        <boxGeometry args={[2.5, 3.5, 0.05]} />
        <meshStandardMaterial
          color={isSelected ? "#ffeb3b" : "#ffffff"}
          metalness={0.2}
          roughness={0.5}
        />
      </animated.mesh>

      {/* Back face */}
      <animated.mesh
        castShadow
        receiveShadow
        rotation-y={rotationY.to((r) => r + Math.PI)}
      >
        <boxGeometry args={[2.5, 3.5, 0.05]} />
        <meshStandardMaterial color="#2196f3" metalness={0.2} roughness={0.5} />
      </animated.mesh>

      {/* Card value and suit will be added here later */}
    </animated.group>
  );
}
