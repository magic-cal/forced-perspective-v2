import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";

// Create rounded rectangle shape
const createRoundedRectGeometry = (
  width: number,
  height: number,
  radius: number
) => {
  // Create a shape with rounded corners
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_DIMENSIONS.thickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 10,
  });

  return geometry;
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

  // Load textures directly
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const suitLetter = suit.charAt(0).toUpperCase();
    const valueNumber =
      value === "A"
        ? "1"
        : value === "J"
        ? "11"
        : value === "Q"
        ? "12"
        : value === "K"
        ? "13"
        : value;

    // Load front texture
    textureLoader.load(
      `https://localhost:5173/src/assets/playingCardFaces/${suitLetter}-${valueNumber}.svg`,
      (texture) => {
        texture.flipY = false;
        texture.needsUpdate = true;
        setFrontTexture(texture);
      },
      undefined,
      (error) => console.error("Error loading front texture:", error)
    );

    // Load back texture
    textureLoader.load(
      `https://localhost:5173/src/assets/playingCardBacks/RED_BACK.svg`,
      (texture) => {
        texture.flipY = false;
        texture.needsUpdate = true;
        setBackTexture(texture);
      },
      undefined,
      (error) => console.error("Error loading back texture:", error)
    );
  }, [suit, value]);

  // Animation springs
  const { hoverScale, rotationY } = useSpring({
    hoverScale: isHovered ? 1.1 : 1,
    rotationY: isFlipped ? Math.PI : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Create geometry once with proper rounded corners
  const geometry = useMemo(() => {
    return createRoundedRectGeometry(
      CARD_DIMENSIONS.width,
      CARD_DIMENSIONS.height,
      0.15 // Increased radius for more noticeable rounding
    );
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
          color={isSelected ? "#ffeb3b" : "#ffffff"}
          map={frontTexture}
          side={THREE.FrontSide}
          transparent
          alphaTest={0.5}
          metalness={0.1}
          roughness={0.6}
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
          color="#ffffff"
          map={backTexture}
          side={THREE.BackSide}
          transparent
          alphaTest={0.5}
          metalness={0.1}
          roughness={0.6}
        />
      </animated.mesh>
    </animated.group>
  );
}
