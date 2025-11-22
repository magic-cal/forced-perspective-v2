import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Card } from "./Card";
import { CARD_DIMENSIONS, CARD_SUITS, CARD_VALUES, ViewType, ForcedValue } from "./Card/types";
import { TrickState } from "@/types/trick";
import { useCardFlipAnimation } from "@/hooks/useCardFlipAnimation";
import { useTrickStore } from "@/store/useTrickStore";
import { FORCED_CARD } from "@/utils/cardForcing";
import { TRICK_CONFIG } from "@/config/trick";

interface CardSphereProps {
  radius?: number;
  maxCardsPerRow?: number;
  rotationSpeed?: number;
  viewType?: ViewType;
  trickState?: TrickState;
  selectedCardId?: string | null;
}

// Deterministic Fisher-Yates shuffle using a seeded RNG
function deterministicShuffleArray<T>(array: T[], seed: number): T[] {
  // Simple LCG (Linear Congruential Generator)
  function seededRandom() {
    // LCG constants
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function CardSphere({
  radius = 15,
  maxCardsPerRow = 48,
  rotationSpeed = 0.02,
  viewType = 'participant',
  trickState = 'setup',
  selectedCardId = null,
}: CardSphereProps) {
  // Apply performance mode settings
  const effectiveRotationSpeed = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
    ? TRICK_CONFIG.PERFORMANCE.lowPerf.rotationSpeed 
    : rotationSpeed;
  const effectiveMaxCardsPerRow = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
    ? TRICK_CONFIG.PERFORMANCE.lowPerf.maxCardsPerRow 
    : maxCardsPerRow;
  const sphereRef = useRef<THREE.Group>(null);
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());
  const [totalCardCount, setTotalCardCount] = useState(0);
  const [forcedCardValue, setForcedCardValue] = useState<ForcedValue | null>(null);
  const { nextState, lockSelection } = useTrickStore();

  // Create and shuffle a deck of all possible cards
  const shuffledDeck = useMemo(() => {
    const deck = [];
    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        deck.push({ suit, value });
      }
    }
    return deterministicShuffleArray(deck, 111111);
  }, []);
  
  // Initialize card flip animation
  const { startFlipAnimation, getFlippedCards, isAnimating } = useCardFlipAnimation({
    totalCards: totalCardCount,
    onComplete: () => {
      console.log('All cards flipped, transitioning to next state');
      nextState();
    },
  });
  
  // Trigger flip animation when entering cards-flipping state
  useEffect(() => {
    if (trickState === 'cards-flipping' && !isAnimating && totalCardCount > 0) {
      startFlipAnimation();
    }
  }, [trickState, isAnimating, totalCardCount, startFlipAnimation]);
  
  // Handle lock and reveal state
  useEffect(() => {
    if (trickState === 'lock-and-reveal' && selectedCardId) {
      console.log('Locking selection and applying forced card');
      
      // Lock the selection
      lockSelection();
      
      // Apply forced card value
      setForcedCardValue(FORCED_CARD);
      
      // Transition to next state after reveal animation (1.5 seconds)
      setTimeout(() => {
        console.log('Reveal complete');
        // Could transition to next state or reset here
      }, 1500);
    }
  }, [trickState, selectedCardId, lockSelection]);
  
  // Update flipped cards during animation
  useFrame(() => {
    if (isAnimating) {
      const flipped = getFlippedCards(Date.now());
      setFlippedCardIndices(flipped);
    }
  });

  // Calculate spacing based on card dimensions
  const cardHeight = CARD_DIMENSIONS.height;
  const spacingFactor = 1.4;

  // Generate cards for the sphere
  const cards = [];
  const rows = 20;
  let cardIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowCards = [];
    const verticalPosition = row / (rows - 1);
    const phi = verticalPosition * Math.PI;

    const sinValue = Math.pow(Math.sin(phi), 2);
    const cardsInRow = Math.max(2, Math.round(effectiveMaxCardsPerRow * sinValue));

    const rowRadius = radius * (1 + Math.sin(phi) * 0.1) * spacingFactor;

    if (cardsInRow < 3) continue;

    for (let i = 0; i < cardsInRow; i++) {
      const theta = (i / cardsInRow) * Math.PI * 2;

      const x = rowRadius * Math.sin(phi) * Math.cos(theta);
      const y = rowRadius * Math.cos(phi);
      const z = rowRadius * Math.sin(phi) * Math.sin(theta);

      const verticalOffset = cardHeight * 1.0 * Math.sin(phi);

      // Get the next card from our shuffled deck
      const card = shuffledDeck[cardIndex % shuffledDeck.length];
      const currentCardIndex = cardIndex;
      cardIndex++;

      const cardId = `${card.suit}-${card.value}-${row}-${i}`;
      const isSelected = cardId === selectedCardId;
      
      // Determine if this card should show its BACK (isFlipped=true)
      // Initially all cards show backs (isFlipped=true)
      // During cards-flipping animation, cards that have been flipped show faces (isFlipped=false)
      const hasBeenFlipped = flippedCardIndices.has(currentCardIndex);
      
      let cardFlipped: boolean;
      if (trickState === 'setup') {
        // All cards show backs initially
        cardFlipped = true;
      } else if (trickState === 'cards-flipping') {
        // Cards that have been animated show faces, others show backs
        cardFlipped = !hasBeenFlipped;
      } else if (trickState === 'unlink-and-rotate' || trickState === 'participant-selection') {
        // All cards show faces
        cardFlipped = false;
      } else if (trickState === 'lock-and-reveal') {
        // Revealed card shows face, others show faces too
        cardFlipped = false;
      } else {
        // Default: show backs
        cardFlipped = true;
      }
      
      // Apply forced card value if this is the selected card in lock-and-reveal state
      const cardForcedValue = (isSelected && forcedCardValue) ? forcedCardValue : undefined;
      
      rowCards.push(
        <group 
          key={`${row}-${i}`} 
          position={[x, y + verticalOffset, z]}
          userData={{ isFlipped: cardFlipped }}
        >
          <Card
            id={cardId}
            suit={card.suit}
            value={card.value}
            isFlipped={cardFlipped}
            isHighlighted={isSelected}
            isInteractive={trickState === 'participant-selection' && viewType === 'participant'}
            forcedValue={cardForcedValue}
          />
        </group>
      );
    }
    cards.push(
      <group key={row} rotation={[0, 0, 0]}>
        {rowCards}
      </group>
    );
  }
  
  // Update total card count if it changed
  if (totalCardCount !== cardIndex) {
    setTotalCardCount(cardIndex);
  }

  // Animate the rows and update card rotations
  useFrame((_state, delta) => {
    if (sphereRef.current) {
      // Rotate each row in alternating directions
      sphereRef.current.children.forEach((row, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        row.rotation.y += effectiveRotationSpeed * direction * delta;

        row.children.forEach((cardGroup) => {
          // Make card face the center
          cardGroup.lookAt(new THREE.Vector3(0, 0, 0));
          
          // Apply flip rotation AFTER lookAt if card is flipped
          if (cardGroup.userData.isFlipped) {
            // Save the current quaternion from lookAt
            const lookAtQuaternion = cardGroup.quaternion.clone();
            
            // Create a 180-degree rotation around the Y axis
            const flipQuaternion = new THREE.Quaternion();
            flipQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            
            // Combine: first lookAt, then flip
            cardGroup.quaternion.copy(lookAtQuaternion).multiply(flipQuaternion);
          }
        });
      });
    }
  });

  return <group ref={sphereRef}>{cards}</group>;
}
