import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { useLoader } from "@react-three/fiber";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";

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

  // Get texture URLs
  const frontTextureUrl = useMemo(() => {
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
    return `/src/assets/playingCardFaces/${suitLetter}-${valueNumber}.svg`;
  }, [suit, value]);

  const backTextureUrl = useMemo(() => {
    return `/src/assets/playingCardBacks/RED_BACK.svg`;
  }, []);

  // Load textures using useLoader
  const [frontTexture, backTexture] = useLoader(THREE.TextureLoader, [
    frontTextureUrl,
    backTextureUrl,
  ]);

  // Configure textures
  useMemo(() => {
    if (frontTexture) {
      frontTexture.flipY = false;
      frontTexture.needsUpdate = true;
    }
    if (backTexture) {
      backTexture.flipY = false;
      backTexture.needsUpdate = true;
    }
  }, [frontTexture, backTexture]);

  // Animation springs
  const { hoverScale, rotationY } = useSpring({
    hoverScale: isHovered ? 1.1 : 1,
    rotationY: isFlipped ? Math.PI : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Create materials
  const materials = useMemo(() => {
    const darkMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: true,
      depthTest: true,
    });

    const frontMaterial = new THREE.MeshPhongMaterial({
      color: isSelected ? "#ffeb3b" : "#ffffff",
      map: frontTexture,
      transparent: true,
      shininess: 40,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const backMaterial = new THREE.MeshPhongMaterial({
      color: "#ffffff",
      map: backTexture,
      transparent: true,
      shininess: 40,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    return [
      darkMaterial, // left
      darkMaterial, // right
      darkMaterial, // top
      darkMaterial, // bottom
      frontMaterial, // front
      backMaterial, // back
    ];
  }, [frontTexture, backTexture, isSelected]);

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
      // onClick={handleClick}
      // onPointerOver={handlePointerOver}
      // onPointerOut={handlePointerOut}
      scale={hoverScale}
    >
      <animated.mesh
        // castShadow
        // receiveShadow
        rotation-y={rotationY}
        geometry={
          new THREE.BoxGeometry(
            CARD_DIMENSIONS.width,
            CARD_DIMENSIONS.height,
            CARD_DIMENSIONS.thickness
          )
        }
        material={materials}
      />
    </animated.group>
  );
}
