import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";
import { textureManager } from "../../../utils/TextureManager";

// Create rounded rectangle shape for the card
const createRoundedRectShape = (
  width: number,
  height: number,
  radius: number
) => {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2 + radius);
  shape.lineTo(-width / 2, height / 2 - radius);
  shape.quadraticCurveTo(
    -width / 2,
    height / 2,
    -width / 2 + radius,
    height / 2
  );
  shape.lineTo(width / 2 - radius, height / 2);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
  shape.lineTo(width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(
    width / 2,
    -height / 2,
    width / 2 - radius,
    -height / 2
  );
  shape.lineTo(-width / 2 + radius, -height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    -height / 2,
    -width / 2,
    -height / 2 + radius
  );
  return shape;
};

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
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);

  // Load textures using TextureManager
  useEffect(() => {
    let isMounted = true;

    const loadTextures = async () => {
      try {
        const [front, back] = await Promise.all([
          textureManager.loadCardTexture(suit, value),
          textureManager.loadCardBack("RED"),
        ]);

        if (isMounted) {
          setFrontTexture(front);
          setBackTexture(back);
        }
      } catch (error) {
        console.error("Error loading card textures:", error);
      }
    };

    loadTextures();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [suit, value]);

  // Animation springs
  const { hoverScale, rotationY } = useSpring({
    hoverScale: isHovered ? 1.1 : 1,
    rotationY: isFlipped ? Math.PI : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Create geometry once
  const geometry = useMemo(() => {
    const shape = createRoundedRectShape(
      CARD_DIMENSIONS.width,
      CARD_DIMENSIONS.height,
      0.1
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: CARD_DIMENSIONS.thickness,
      bevelEnabled: false,
    });
    return geometry;
  }, []);

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

  // Material properties
  const materialProps = useMemo(
    () => ({
      metalness: 0.1,
      roughness: 0.6,
      envMapIntensity: 1.5,
    }),
    []
  );

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
      <animated.mesh
        castShadow
        receiveShadow
        rotation-y={rotationY}
        geometry={geometry}
      >
        <meshStandardMaterial
          {...materialProps}
          color={isSelected ? "#ffeb3b" : "#ffffff"}
          map={frontTexture}
          side={THREE.FrontSide}
          transparent
        />
      </animated.mesh>

      {/* Back face */}
      <animated.mesh
        castShadow
        receiveShadow
        rotation-y={rotationY.to((r) => r + Math.PI)}
        geometry={geometry}
      >
        <meshStandardMaterial
          {...materialProps}
          color="#ffffff"
          map={backTexture}
          side={THREE.BackSide}
          transparent
        />
      </animated.mesh>
    </animated.group>
  );
}
