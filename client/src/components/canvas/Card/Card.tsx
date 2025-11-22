import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { CardSuit, CardValue, CARD_DIMENSIONS } from "../../../types/cards";
import { FlipState, ForcedValue } from "./types";
import { useCardSelectionStore } from "@/store/cardSelectionStore";
import { useTrickStore } from "@/store/useTrickStore";
import { useSocket } from "@/sockets/SocketProvider";

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
  
  // New props for trick functionality
  forcedValue?: ForcedValue;
  isHighlighted?: boolean;
  flipState?: FlipState;
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
  forcedValue,
  isHighlighted = false,
  flipState = 'face-up',
}: CardProps) {
  const group = useRef<THREE.Group>(null);
  const { setSelectedCard: setLegacySelectedCard, setHoveredCard } = useCardSelectionStore();
  const { currentState, setSelectedCard, isSelectionLocked } = useTrickStore();
  const socket = useSocket();
  
  // Determine actual card values (use forced value if provided)
  const displaySuit = forcedValue?.suit ?? suit;
  const displayValue = forcedValue?.value ?? value;

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
    materialsRef.current.front.color.set(shouldHighlight ? "#ffeb3b" : "#ffffff");
    materialsRef.current.front.emissive = shouldHighlight ? new THREE.Color("#ff9800") : new THREE.Color("#000000");
    materialsRef.current.front.emissiveIntensity = shouldHighlight ? 0.5 : 0;
    materialsRef.current.front.needsUpdate = true;
  }, [isSelected, isHighlighted]);
  
  // Determine flip rotation based on flipState and viewType
  const flipRotation = useMemo(() => {
    // If flipState is explicitly set, use it
    if (flipState === 'face-down') {
      return Math.PI;
    } else if (flipState === 'face-up') {
      return 0;
    }
    
    // isFlipped=true means show BACK (face-down), so rotate by PI
    // isFlipped=false means show FRONT (face-up), so no rotation
    return isFlipped ? Math.PI : 0;
  }, [flipState, isFlipped]);

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
    
    // Check if we're in the participant-selection state
    if (currentState !== 'participant-selection') {
      console.log('Card selection only allowed in participant-selection state');
      return;
    }
    
    // Check if selection is locked
    if (isSelectionLocked) {
      console.log('Selection is locked');
      return;
    }
    
    // Update selection in trick store
    setSelectedCard(id);
    
    // Emit selection event to socket
    if (socket) {
      socket.emit('card-selected', {
        cardId: id,
        suit,
        value,
        timestamp: Date.now(),
      });
    }
    
    // Legacy selection store (for backwards compatibility)
    setLegacySelectedCard({
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

  // Store flip rotation in a ref that can be accessed by parent
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
    >
      <mesh
        rotation-y={flipRotation}
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
