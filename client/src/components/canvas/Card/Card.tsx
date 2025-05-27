import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";
import { useCardSelectionStore } from "@/store/cardSelectionStore";

export interface CardProps {
  id: string;
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
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  suit,
  value,
  isFlipped = false,
  isSelected = false,
  isInteractive = false,
  onClick,
  onHover,
}: CardProps) {
  const group = useRef<THREE.Group>(null);
  const { setSelectedCard, setHoveredCard } = useCardSelectionStore();

  // Create reusable materials
  const materialsRef = useRef<{
    dark: THREE.MeshPhongMaterial;
    front: THREE.MeshPhongMaterial;
    back: THREE.MeshPhongMaterial;
  }>({
    dark: new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
    front: new THREE.MeshPhongMaterial({
      color: "#ffffff",
      transparent: true,
      side: THREE.DoubleSide,
    }),
    back: new THREE.MeshPhongMaterial({
      color: "#ffffff",
      transparent: true,
      side: THREE.DoubleSide,
    }),
  });

  // Get texture URLs using Vite's import.meta.glob
  const frontTextureUrl = useMemo(() => {
    const suitLetter = suit.charAt(0).toUpperCase();
    const valueNumber =
      value === "A" ? "1" :
      value === "J" ? "11" :
      value === "Q" ? "12" :
      value === "K" ? "13" :
      value;

    const fileName = `${suitLetter}-${valueNumber}.svg`;
    const cardFaces = import.meta.glob('../../../assets/playingCardFaces/*.svg', { as: 'url', eager: true });
    return cardFaces[`../../../assets/playingCardFaces/${fileName}`] || '';
  }, [suit, value]);

  const backTextureUrl = useMemo(() => {
    const fileName = 'RED_BACK.svg';
    const cardBacks = import.meta.glob('../../../assets/playingCardBacks/*.svg', { as: 'url', eager: true });
    return cardBacks[`../../../assets/playingCardBacks/${fileName}`] || '';
  }, []);

  // Load textures using useLoader with error handling
  const [frontTexture, backTexture] = useLoader(THREE.TextureLoader, [
    frontTextureUrl,
    backTextureUrl,
  ].filter(Boolean), (loader) => {
    loader.setCrossOrigin('anonymous');
  });

  // Configure textures once when they load
  useEffect(() => {
    if (frontTexture) {
      materialsRef.current.front.map = frontTexture;
      materialsRef.current.front.needsUpdate = true;
    } else {
      console.warn('Front texture could not be loaded');
    }
    
    if (backTexture) {
      materialsRef.current.back.map = backTexture;
      materialsRef.current.back.needsUpdate = true;
    } else {
      console.warn('Back texture could not be loaded');
    }
  }, [frontTexture, backTexture]);

  // Update material properties when needed
  useEffect(() => {
    materialsRef.current.front.color.set(isSelected ? "#ffeb3b" : "#ffffff");
    materialsRef.current.front.needsUpdate = true;
  }, [isSelected]);

  // Return reusable materials
  const materials = useMemo(() => {
    return [
      materialsRef.current.dark, // left
      materialsRef.current.dark, // right
      materialsRef.current.dark, // top
      materialsRef.current.dark, // bottom
      materialsRef.current.front, // front
      materialsRef.current.back, // back
    ];
  }, []);

  const handlePointerOver = () => {
    if (!isInteractive) return;
    setHoveredCard({
      id,
      suit,
      value,
      position,
      rotation,
      isFlipped,
      isSelected,
    });
    onHover?.(true);
  };

  const handlePointerOut = () => {
    if (!isInteractive) return;
    setHoveredCard(null);
    onHover?.(false);
  };

  const handleClick = () => {
    if (!isInteractive) return;
    setSelectedCard({
      id,
      suit,
      value,
      position,
      rotation,
      isFlipped,
      isSelected,
    });
    onClick?.();
  };

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh
        rotation-y={isFlipped ? Math.PI : 0}
        geometry={
          new THREE.BoxGeometry(
            CARD_DIMENSIONS.width,
            CARD_DIMENSIONS.height,
            CARD_DIMENSIONS.thickness
          )
        }
        material={materials}
      />
    </group>
  );
}
