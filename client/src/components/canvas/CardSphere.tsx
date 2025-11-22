import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Card } from "./Card";
import { CARD_DIMENSIONS, CARD_SUITS, CARD_VALUES, ViewType, ForcedValue } from "./Card/types";
import { TrickState } from "@/types/trick";
import { useTrickStore } from "@/store/useTrickStore";
import { FORCED_CARD } from "@/utils/cardForcing";
import { TRICK_CONFIG } from "@/config/trick";
import { easeOutQuad, easeInOutQuad, easeInQuad } from "@/utils/easing";

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
  const [animatingCardIndices, setAnimatingCardIndices] = useState<Map<number, { startTime: number; progress: number }>>(new Map());
  const [totalCardCount, setTotalCardCount] = useState(0);
  const [forcedCardValue, setForcedCardValue] = useState<ForcedValue | null>(null);
  const { nextState, lockSelection } = useTrickStore();
  const animationStartTimeRef = useRef<number | null>(null);

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
  
  // Start flip animation with staggered delays
  const startFlipAnimation = () => {
    const staggerDelay = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
      ? TRICK_CONFIG.PERFORMANCE.lowPerf.staggerDelayMs 
      : TRICK_CONFIG.CARD_FLIP.staggerDelayMs;
    
    const newAnimatingCards = new Map<number, { startTime: number; progress: number }>();
    const currentTime = Date.now();
    
    for (let i = 0; i < totalCardCount; i++) {
      newAnimatingCards.set(i, {
        startTime: currentTime + (i * staggerDelay),
        progress: 0,
      });
    }
    
    setAnimatingCardIndices(newAnimatingCards);
    animationStartTimeRef.current = currentTime;
  };
  
  // Trigger flip animation when entering cards-flipping or final-flip state
  useEffect(() => {
    if ((trickState === 'cards-flipping' || trickState === 'final-flip') && animatingCardIndices.size === 0 && totalCardCount > 0) {
      // Reset flipped cards for final flip
      if (trickState === 'final-flip') {
        setFlippedCardIndices(new Set());
      }
      startFlipAnimation();
    }
  }, [trickState, totalCardCount]);
  
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
        // All cards show faces initially
        cardFlipped = false;
      } else if (trickState === 'cards-flipping') {
        // For spectator: cards that have been animated show backs
        // For audience: cards remain showing faces
        if (viewType === 'participant') {
          cardFlipped = hasBeenFlipped;
        } else {
          cardFlipped = false;
        }
      } else if (trickState === 'final-flip') {
        // Final flip: both views flip
        // For spectator: flip from backs to faces (reverse)
        // For audience: flip from faces to backs (first flip)
        if (viewType === 'participant') {
          // Spectator had backs showing, now show faces after final flip
          cardFlipped = !hasBeenFlipped;
        } else {
          // Audience had faces showing, now show backs after final flip
          cardFlipped = hasBeenFlipped;
        }
      } else if (trickState === 'unlink-and-rotate' || trickState === 'participant-selection') {
        // All cards show faces (or backs for spectator after flip)
        cardFlipped = viewType === 'participant' && hasBeenFlipped;
      } else if (trickState === 'lock-and-reveal') {
        // Revealed card shows face, others show faces too
        cardFlipped = viewType === 'participant' && hasBeenFlipped;
      } else {
        // Default: show faces
        cardFlipped = false;
      }
      
      // Apply forced card value if this is the selected card in lock-and-reveal state
      const cardForcedValue = (isSelected && forcedCardValue) ? forcedCardValue : undefined;
      
      rowCards.push(
        <group 
          key={`${row}-${i}`} 
          position={[x, y + verticalOffset, z]}
          userData={{ 
            isFlipped: cardFlipped,
            cardIndex: currentCardIndex,
            basePosition: new THREE.Vector3(x, y + verticalOffset, z)
          }}
        >
          <Card
            id={cardId}
            suit={card.suit}
            value={card.value}
            isFlipped={false}
            isHighlighted={isSelected}
            isInteractive={trickState === 'participant-selection' && viewType === 'participant'}
            forcedValue={cardForcedValue}
            disableInternalRotation={true}
            viewType={viewType}
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

  // Helper function to determine if flip should apply for current view
  const shouldFlipForView = (currentViewType: ViewType, currentTrickState: TrickState): boolean => {
    // Final flip applies to both views
    if (currentTrickState === 'final-flip') return true;
    
    // During cards-flipping, only spectator/participant view flips
    if (currentTrickState === 'cards-flipping') return currentViewType === 'participant';
    
    return false;
  };

  // Helper function to calculate inward-facing orientation (face visible from center)
  const calculateInwardOrientation = (cardGroup: THREE.Group) => {
    const centerPosition = new THREE.Vector3(0, 0, 0);
    
    // Make card face inward (toward center)
    cardGroup.lookAt(centerPosition);
    
    // No additional rotation - cards show faces to viewers at center
  };

  // Animate card flip with three phases: forward, rotate, return
  const animateCardFlip = (
    cardIndex: number, 
    elapsedTime: number, 
    cardWorldPos: THREE.Vector3,
    currentViewType: ViewType
  ): { positionOffset: THREE.Vector3; rotationProgress: number; isComplete: boolean } => {
    // Skip animation for audience during main flip
    if (currentViewType === 'audience' && trickState === 'cards-flipping') {
      return { positionOffset: new THREE.Vector3(0, 0, 0), rotationProgress: 0, isComplete: false };
    }
    
    const flipDuration = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
      ? TRICK_CONFIG.PERFORMANCE.lowPerf.animationDurations.cardFlip 
      : TRICK_CONFIG.ANIMATION_DURATIONS.cardFlip;
    
    const animData = animatingCardIndices.get(cardIndex);
    if (!animData) {
      return { positionOffset: new THREE.Vector3(0, 0, 0), rotationProgress: 1.0, isComplete: true };
    }
    
    const timeSinceStart = elapsedTime - animData.startTime;
    if (timeSinceStart < 0) {
      // Animation hasn't started yet (stagger delay)
      return { positionOffset: new THREE.Vector3(0, 0, 0), rotationProgress: 0, isComplete: false };
    }
    
    const progress = Math.min(timeSinceStart / flipDuration, 1.0);
    const outwardDirection = cardWorldPos.clone().normalize();
    const forwardDistance = 2;
    
    let positionOffset = new THREE.Vector3(0, 0, 0);
    let rotationProgress = 0;
    
    if (progress < 0.3) {
      // Phase 1: Forward motion (0-30%)
      const forwardProgress = progress / 0.3;
      const easedProgress = easeOutQuad(forwardProgress);
      positionOffset = outwardDirection.clone().multiplyScalar(forwardDistance * easedProgress);
      rotationProgress = 0;
    } else if (progress < 0.7) {
      // Phase 2: Rotation (30-70%)
      const rotateProgress = (progress - 0.3) / 0.4;
      const easedProgress = easeInOutQuad(rotateProgress);
      positionOffset = outwardDirection.clone().multiplyScalar(forwardDistance);
      rotationProgress = easedProgress;
    } else {
      // Phase 3: Return motion (70-100%)
      const returnProgress = (progress - 0.7) / 0.3;
      const easedProgress = easeInQuad(returnProgress);
      positionOffset = outwardDirection.clone().multiplyScalar(forwardDistance * (1 - easedProgress));
      rotationProgress = 1.0;
    }
    
    return { positionOffset, rotationProgress, isComplete: progress >= 1.0 };
  };

  // Animate the rows and update card rotations
  useFrame((_state, delta) => {
    if (sphereRef.current) {
      const currentTime = Date.now();
      let completedCount = 0;
      
      // Rotate each row in alternating directions
      sphereRef.current.children.forEach((row, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        row.rotation.y += effectiveRotationSpeed * direction * delta;

        row.children.forEach((cardGroup) => {
          const currentCardIndex = cardGroup.userData.cardIndex as number;
          
          // Get the card's world position
          const cardWorldPos = new THREE.Vector3();
          cardGroup.getWorldPosition(cardWorldPos);
          
          // Check if this card is animating
          const isAnimating = animatingCardIndices.has(currentCardIndex);
          const hasBeenFlipped = flippedCardIndices.has(currentCardIndex);
          
          if (isAnimating && shouldFlipForView(viewType, trickState)) {
            // Apply flip animation
            const { positionOffset, rotationProgress, isComplete } = animateCardFlip(
              currentCardIndex, 
              currentTime, 
              cardWorldPos,
              viewType
            );
            
            // Apply position offset (relative to base position)
            const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
            cardGroup.position.copy(basePosition).add(positionOffset);
            
            // Start with inward orientation, then add flip rotation
            calculateInwardOrientation(cardGroup as THREE.Group);
            
            // Add the flip rotation (0 to PI) on top of the inward orientation
            // This rotates the card 180 degrees around its local Y axis
            const flipAngle = rotationProgress * Math.PI;
            cardGroup.rotateY(flipAngle);
            
            // Mark as flipped when animation completes
            if (isComplete) {
              setFlippedCardIndices(prev => {
                const newSet = new Set(prev);
                newSet.add(currentCardIndex);
                return newSet;
              });
              setAnimatingCardIndices(prev => {
                const newMap = new Map(prev);
                newMap.delete(currentCardIndex);
                return newMap;
              });
              completedCount++;
            }
            
            // Update isFlipped based on view and state
            if (trickState === 'final-flip') {
              cardGroup.userData.isFlipped = viewType === 'audience'; // Audience shows backs, spectator shows faces
            } else {
              cardGroup.userData.isFlipped = viewType === 'participant'; // Show back after flip for spectator
            }
          } else if (hasBeenFlipped && viewType === 'participant' && trickState !== 'final-flip') {
            // Post-flip state for spectator (before final flip): cards have been flipped, so they show backs
            // Start with face-forward orientation, then add the full 180° flip
            calculateInwardOrientation(cardGroup as THREE.Group);
            cardGroup.rotateY(Math.PI); // Add the full flip rotation to show backs
            cardGroup.userData.isFlipped = true;
          } else if (hasBeenFlipped && trickState === 'final-flip') {
            // Final flip completed state
            calculateInwardOrientation(cardGroup as THREE.Group);
            if (viewType === 'audience') {
              // Audience: flip from faces to backs
              cardGroup.rotateY(Math.PI);
              cardGroup.userData.isFlipped = true;
            } else {
              // Spectator: flip from backs to faces (no additional rotation needed)
              cardGroup.userData.isFlipped = false;
            }
          } else if (viewType === 'audience' && (trickState !== 'setup' && trickState !== 'cards-flipping' && trickState !== 'final-flip')) {
            // Audience view: cards remain face-forward (no flip during main trick)
            calculateInwardOrientation(cardGroup as THREE.Group);
            cardGroup.userData.isFlipped = false;
            
            // Reset position to base
            const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
            if (basePosition) {
              cardGroup.position.copy(basePosition);
            }
          } else {
            // Initial state: face-forward (faces visible from center)
            calculateInwardOrientation(cardGroup as THREE.Group);
            cardGroup.userData.isFlipped = false;
          }
        });
      });
      
      // Check if all animations are complete
      if (animatingCardIndices.size > 0 && animatingCardIndices.size === completedCount) {
        console.log('All cards flipped, transitioning to next state');
        nextState();
      }
    }
  });

  return <group ref={sphereRef}>{cards}</group>;
}
