import { memo, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";
import { FlipState, ForcedValue, ViewType } from "./types";
import { useCardSelectionStore } from "@/store/cardSelectionStore";

// One dark material shared across all Card instances — never changes
const _darkMaterial = new THREE.MeshPhongMaterial({
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
});

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
  onCardClick?: () => void; // parent handles selection logic — avoids per-card store subscription

  // New props for trick functionality
  forcedValue?: ForcedValue;
  isHighlighted?: boolean;
  flipState?: FlipState;
  disableInternalRotation?: boolean; // Disable mesh rotation when parent handles it
  viewType?: ViewType; // Determines if card backs should be transparent (audience view)
}

export const Card = memo(function Card({
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
  onCardClick,
  forcedValue,
  isHighlighted = false,
  flipState = 'face-up',
  disableInternalRotation = false,
  viewType = 'participant',
}: CardProps) {
  const group = useRef<THREE.Group>(null);
  // Selector pattern: stable function refs, never triggers re-render on state change
  const setHoveredCard = useCardSelectionStore((s) => s.setHoveredCard);
  
  // Determine actual card values (use forced value if provided)
  const displaySuit = forcedValue?.suit ?? suit;
  const displayValue = forcedValue?.value ?? value;

  const backOpacity = viewType === 'audience' ? 0.7 : 1.0;

  const materialsRef = useRef<{
    front: THREE.MeshPhongMaterial;
    back: THREE.MeshPhongMaterial;
  }>({
    front: new THREE.MeshPhongMaterial({
      color: "#ffffff",
      transparent: true,
      side: THREE.FrontSide,
    }),
    back: new THREE.MeshPhongMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: backOpacity,
      side: THREE.FrontSide,
    }),
  });

  // Get texture URLs using Vite's import.meta.glob
  const frontTextureUrl = useMemo(() => {
    const suitLetter = displaySuit.charAt(0).toUpperCase();
    const valueNumber =
      displayValue === "A" ? "1" :
      displayValue === "J" ? "11" :
      displayValue === "Q" ? "12" :
      displayValue === "K" ? "13" :
      displayValue;

    const fileName = `${suitLetter}-${valueNumber}.svg`;
    const cardFaces = import.meta.glob('../../../assets/playingCardFaces/*.svg', { as: 'url', eager: true });
    return cardFaces[`../../../assets/playingCardFaces/${fileName}`] || '';
  }, [displaySuit, displayValue]);

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
    // Highlight selected or highlighted cards with a more visible glow
    const shouldHighlight = isSelected || isHighlighted;
    
    // Apply highlighting to front
    materialsRef.current.front.color.set(shouldHighlight ? "#ffeb3b" : "#ffffff");
    materialsRef.current.front.emissive = shouldHighlight ? new THREE.Color("#ff9800") : new THREE.Color("#000000");
    materialsRef.current.front.emissiveIntensity = shouldHighlight ? 0.5 : 0;
    materialsRef.current.front.needsUpdate = true;
    
    // Apply highlighting to back as well (for audience view)
    materialsRef.current.back.color.set(shouldHighlight ? "#ffeb3b" : "#ffffff");
    materialsRef.current.back.emissive = shouldHighlight ? new THREE.Color("#ff9800") : new THREE.Color("#000000");
    materialsRef.current.back.emissiveIntensity = shouldHighlight ? 0.5 : 0;
    materialsRef.current.back.needsUpdate = true;
  }, [isSelected, isHighlighted]);
  
  // Update back material opacity based on viewType
  useEffect(() => {
    const backOpacity = viewType === 'audience' ? 0.5 : 1.0;
    materialsRef.current.back.opacity = backOpacity;
    materialsRef.current.back.needsUpdate = true;
  }, [viewType]);
  
  const cardGeometry = useMemo(
    () => new THREE.BoxGeometry(CARD_DIMENSIONS.width, CARD_DIMENSIONS.height, CARD_DIMENSIONS.thickness),
    []
  );

  // Determine flip rotation based on flipState and viewType
  const flipRotation = useMemo(() => {
    // If parent is handling rotation, don't apply internal rotation
    if (disableInternalRotation) {
      return 0;
    }
    
    // If flipState is explicitly set, use it
    if (flipState === 'face-down') {
      return Math.PI;
    } else if (flipState === 'face-up') {
      return 0;
    }
    
    // isFlipped=true means show BACK (face-down), so rotate by PI
    // isFlipped=false means show FRONT (face-up), so no rotation
    return isFlipped ? Math.PI : 0;
  }, [flipState, isFlipped, disableInternalRotation]);

  const materials = useMemo(() => [
    _darkMaterial, // left  — shared singleton
    _darkMaterial, // right — shared singleton
    _darkMaterial, // top   — shared singleton
    _darkMaterial, // bottom — shared singleton
    materialsRef.current.front,
    materialsRef.current.back,
  ], []);

  const handlePointerOver = () => {
    if (!isInteractive) return;
    setHoveredCard({ id, suit, value, position, rotation, isFlipped, isSelected });
    onHover?.(true);
  };

  const handlePointerOut = () => {
    if (!isInteractive) return;
    setHoveredCard(null);
    onHover?.(false);
  };

  const handleClick = () => {
    if (!isInteractive) return;
    onCardClick?.();
    onClick?.();
  };

  useEffect(() => {
    if (group.current) {
      group.current.userData.flipRotation = flipRotation;
    }
  }, [flipRotation]);

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      userData={{ id }}
    >
      <mesh
        rotation-y={flipRotation}
        geometry={cardGeometry}
        material={materials}
      />
    </group>
  );
});
