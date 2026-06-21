import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Card } from "./Card";
import { CARD_DIMENSIONS, CARD_SUITS, CARD_VALUES, ViewType, ForcedValue } from "./Card/types";
import { TrickState } from "@/types/trick";
import { useTrickStore } from "@/store/useTrickStore";
import { useCardSelectionStore } from "@/store/cardSelectionStore";
import { useSocket } from "@/sockets/SocketProvider";
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
  onPointerHit?: (point: THREE.Vector3 | null) => void;
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

const _CENTER = new THREE.Vector3(0, 0, 0);
const _outwardDir = new THREE.Vector3();
const _posOffset = new THREE.Vector3();
const _animResult = { positionOffset: _posOffset, rotationProgress: 0, isComplete: false };

export function CardSphere({
  radius = 15,
  maxCardsPerRow = 48,
  rotationSpeed = 0.02,
  viewType = 'participant',
  trickState = 'setup',
  selectedCardId = null,
  onPointerHit,
}: CardSphereProps) {
  // Apply performance mode settings
  const effectiveRotationSpeed = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
    ? TRICK_CONFIG.PERFORMANCE.lowPerf.rotationSpeed 
    : rotationSpeed;
  const effectiveMaxCardsPerRow = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode 
    ? TRICK_CONFIG.PERFORMANCE.lowPerf.maxCardsPerRow 
    : maxCardsPerRow;
  const sphereRef = useRef<THREE.Group>(null);
  const _worldPosRef = useRef(new THREE.Vector3());
  const flippedCardIndicesRef = useRef<Set<number>>(new Set());
  const animatingCardIndicesRef = useRef<Map<number, { startTime: number; progress: number }>>(new Map());
  const totalCardCountRef = useRef(0);
  const [forcedCardValue, setForcedCardValue] = useState<ForcedValue | null>(null);
  const { nextState, lockSelection, setSelectedCard } = useTrickStore();
  const setLegacySelectedCard = useCardSelectionStore((s) => s.setSelectedCard);
  const socket = useSocket();
  const animationStartTimeRef = useRef<number | null>(null);
  const sphereAlignmentStartRef = useRef<number | null>(null);
  // Refs instead of state: only read inside useFrame/callbacks, never drive JSX
  const targetSphereRotationRef = useRef<number | null>(null);
  const rowRotationSpeedsRef = useRef<Map<number, number>>(new Map());
  const frozenCardRotationsRef = useRef<Map<number, THREE.Quaternion>>(new Map());

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
    
    for (let i = 0; i < totalCardCountRef.current; i++) {
      newAnimatingCards.set(i, {
        startTime: currentTime + (i * staggerDelay),
        progress: 0,
      });
    }
    
    animatingCardIndicesRef.current = newAnimatingCards;
    animationStartTimeRef.current = currentTime;
  };
  
  // Trigger flip animation when entering cards-flipping or final-flip state
  useEffect(() => {
    if ((trickState === 'cards-flipping' || trickState === 'final-flip') && animatingCardIndicesRef.current.size === 0 && totalCardCountRef.current > 0) {
      startFlipAnimation();
    }
  }, [trickState, viewType]);
  
  // Freeze card rotations and clear animations for audience when entering cards-flipping
  useEffect(() => {
    if (trickState === 'cards-flipping' && viewType === 'audience') {
      if (sphereRef.current && animatingCardIndicesRef.current.size > 0) {
        const rotations = new Map<number, THREE.Quaternion>();
        sphereRef.current.children.forEach((row) => {
          row.children.forEach((cardGroup) => {
            const cardIndex = cardGroup.userData.cardIndex as number;
            rotations.set(cardIndex, cardGroup.quaternion.clone());
          });
        });
        frozenCardRotationsRef.current = rotations;
      }

      animatingCardIndicesRef.current = new Map();
      animationStartTimeRef.current = null;
    }
  }, [trickState, viewType]);
  
  // Reset all card animation state when returning to setup
  useEffect(() => {
    if (trickState === 'setup') {
      flippedCardIndicesRef.current = new Set();
      animatingCardIndicesRef.current = new Map();
      setForcedCardValue(null);
      animationStartTimeRef.current = null;
      sphereAlignmentStartRef.current = null;
      targetSphereRotationRef.current = null;
      rowRotationSpeedsRef.current = new Map();
      frozenCardRotationsRef.current = new Map();
      
      // Reset sphere rotation to initial state
      if (sphereRef.current) {
        sphereRef.current.rotation.y = 0;
        
        sphereRef.current.children.forEach((row) => {
          row.rotation.y = 0;
        });
      }
    }
  }, [trickState]);
  
  // Helper function to start sphere alignment animation
  const startSphereAlignment = useCallback((cardId: string) => {
    if (!sphereRef.current) return;
    
    // Find the selected card's position in world space
    let selectedCardGroup: THREE.Object3D | null = null;
    
    sphereRef.current.children.forEach((_row) => {
      _row.children.forEach((cardGroup) => {
        const cardComponent = cardGroup.children[0] as THREE.Group;
        const currentCardId = cardComponent?.userData?.id as string;
        if (currentCardId === cardId) {
          selectedCardGroup = cardGroup as THREE.Object3D;
        }
      });
    });
    
    if (selectedCardGroup) {
      // Get the card's world position
      const cardWorldPos = new THREE.Vector3();
      (selectedCardGroup as THREE.Object3D).getWorldPosition(cardWorldPos);
      
      // Calculate the angle needed to rotate the sphere to bring the card in front
      const angleToCard = Math.atan2(cardWorldPos.x, cardWorldPos.z);
      
      // We want the opposite side (180 degrees away)
      let targetAngle = -angleToCard + Math.PI;
      
      // Normalize the angle to [-PI, PI] range to ensure shortest path
      while (targetAngle > Math.PI) targetAngle -= 2 * Math.PI;
      while (targetAngle < -Math.PI) targetAngle += 2 * Math.PI;
      
      targetSphereRotationRef.current = targetAngle;

      // Capture current row rotation speeds
      const speeds = new Map<number, number>();
      sphereRef.current.children.forEach((_row, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        speeds.set(index, effectiveRotationSpeed * direction);
      });
      rowRotationSpeedsRef.current = speeds;
      
      sphereAlignmentStartRef.current = Date.now();
    }
  }, [effectiveRotationSpeed]);
  
  // Handle card selection during participant-selection state
  useEffect(() => {
    if (trickState === 'participant-selection' && selectedCardId) {
      startSphereAlignment(selectedCardId);
    }
  }, [selectedCardId, trickState, startSphereAlignment]);
  
  // Handle lock and reveal state
  useEffect(() => {
    if (trickState === 'lock-and-reveal' && selectedCardId) {
      if (viewType === 'participant') {
        lockSelection();
      }
      setForcedCardValue(FORCED_CARD);
      startSphereAlignment(selectedCardId);
    }
  }, [trickState, selectedCardId, lockSelection, startSphereAlignment, viewType]);

  // Card click — centralised here so Card components don't need store/socket subscriptions
  const handleCardClick = useCallback((cardId: string, cardSuit: string, cardValue: string) => {
    setSelectedCard(cardId);
    socket?.emit('card-selected', { cardId, suit: cardSuit, value: cardValue, timestamp: Date.now() });
    setLegacySelectedCard({ id: cardId, suit: cardSuit as any, value: cardValue as any, position: [0,0,0], rotation: [0,0,0], isFlipped: false, isSelected: true });
  }, [socket, setSelectedCard, setLegacySelectedCard]);

  // Generate cards — memoised so the JSX array is only rebuilt when trick state,
  // selection, or forced-value changes, not on every animation frame.
  const cards = useMemo(() => {
    const cardHeight = CARD_DIMENSIONS.height;
    const spacingFactor = 1.4;
    const rows = 20;
    const result = [];
    let cardIndex = 0;

    for (let row = 0; row < rows; row++) {
      const rowCards = [];
      const phi = (row / (rows - 1)) * Math.PI;
      const sinValue = Math.pow(Math.sin(phi), 2);
      const cardsInRow = Math.max(2, Math.round(effectiveMaxCardsPerRow * sinValue));
      const rowRadius = radius * (1 + Math.sin(phi) * 0.1) * spacingFactor;

      if (cardsInRow < 3) { cardIndex += cardsInRow; continue; }

      for (let i = 0; i < cardsInRow; i++) {
        const theta = (i / cardsInRow) * Math.PI * 2;
        const x = rowRadius * Math.sin(phi) * Math.cos(theta);
        const y = rowRadius * Math.cos(phi);
        const z = rowRadius * Math.sin(phi) * Math.sin(theta);
        const verticalOffset = cardHeight * Math.sin(phi);

        const card = shuffledDeck[cardIndex % shuffledDeck.length];
        const currentCardIndex = cardIndex;
        cardIndex++;

        const cardId = `${card.suit}-${card.value}-${row}-${i}`;
        const isSelected = cardId === selectedCardId;
        const cardForcedValue = (isSelected && forcedCardValue) ? forcedCardValue : undefined;

        rowCards.push(
          <group
            key={`${row}-${i}`}
            position={[x, y + verticalOffset, z]}
            userData={{
              cardIndex: currentCardIndex,
              basePosition: new THREE.Vector3(x, y + verticalOffset, z),
              isFlipped: false,
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
              onCardClick={trickState === 'participant-selection' && viewType === 'participant'
                ? () => handleCardClick(cardId, card.suit, card.value)
                : undefined}
            />
          </group>
        );
      }
      result.push(
        <group key={row} rotation={[0, 0, 0]}>
          {rowCards}
        </group>
      );
    }
    totalCardCountRef.current = cardIndex;
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, effectiveMaxCardsPerRow, radius, trickState, viewType, selectedCardId, forcedCardValue, handleCardClick]);

  // Helper function to calculate inward-facing orientation (face visible from center)
  const calculateInwardOrientation = (cardGroup: THREE.Group, shouldFaceOutward: boolean = false) => {
    cardGroup.lookAt(_CENTER);
    if (shouldFaceOutward) {
      cardGroup.rotateY(Math.PI);
    }
  };

  // Animate card flip with three phases: forward, rotate, return
  // Writes into module-level _animResult / _posOffset / _outwardDir to avoid per-frame allocations.
  const animateCardFlip = (
    cardIndex: number,
    elapsedTime: number,
    cardWorldPos: THREE.Vector3,
    currentViewType: ViewType
  ) => {
    if (currentViewType === 'audience' && trickState === 'cards-flipping') {
      _posOffset.set(0, 0, 0);
      _animResult.rotationProgress = 0;
      _animResult.isComplete = false;
      return _animResult;
    }

    const flipDuration = TRICK_CONFIG.PERFORMANCE.lowPerformanceMode
      ? TRICK_CONFIG.PERFORMANCE.lowPerf.animationDurations.cardFlip
      : TRICK_CONFIG.ANIMATION_DURATIONS.cardFlip;

    const animData = animatingCardIndicesRef.current.get(cardIndex);
    if (!animData) {
      _posOffset.set(0, 0, 0);
      _animResult.rotationProgress = 1.0;
      _animResult.isComplete = true;
      return _animResult;
    }

    const timeSinceStart = elapsedTime - animData.startTime;
    if (timeSinceStart < 0) {
      _posOffset.set(0, 0, 0);
      _animResult.rotationProgress = 0;
      _animResult.isComplete = false;
      return _animResult;
    }

    const progress = Math.min(timeSinceStart / flipDuration, 1.0);
    _outwardDir.copy(cardWorldPos).normalize();
    const forwardDistance = 2;

    if (progress < 0.3) {
      const easedProgress = easeOutQuad(progress / 0.3);
      _posOffset.copy(_outwardDir).multiplyScalar(forwardDistance * easedProgress);
      _animResult.rotationProgress = 0;
    } else if (progress < 0.7) {
      const easedProgress = easeInOutQuad((progress - 0.3) / 0.4);
      _posOffset.copy(_outwardDir).multiplyScalar(forwardDistance);
      _animResult.rotationProgress = easedProgress;
    } else {
      const easedProgress = easeInQuad((progress - 0.7) / 0.3);
      _posOffset.copy(_outwardDir).multiplyScalar(forwardDistance * (1 - easedProgress));
      _animResult.rotationProgress = 1.0;
    }

    _animResult.isComplete = progress >= 1.0;
    return _animResult;
  };

  // Animate the rows and update card rotations
  useFrame((_state, delta) => {
    try {
      if (sphereRef.current) {
        const currentTime = Date.now();
        let completedCount = 0;
        
        const isAligning = trickState === 'lock-and-reveal' && sphereAlignmentStartRef.current !== null && targetSphereRotationRef.current !== null;
      
      // Stop rotation during participant-selection and all subsequent states
      const shouldStopRotation = trickState === 'participant-selection' 
        || trickState === 'lock-and-reveal' 
        || trickState === 'sphere-aligned' 
        || trickState === 'final-flip';
      
      if (isAligning && sphereAlignmentStartRef.current) {
        const elapsed = currentTime - sphereAlignmentStartRef.current;
        const slowdownDuration = TRICK_CONFIG.SPHERE_ALIGNMENT.rotationSlowdownDuration;
        const totalDuration = TRICK_CONFIG.SPHERE_ALIGNMENT.duration;
        
        // Phase 1: Slow down row rotations (first half of animation)
        if (elapsed < slowdownDuration) {
          const slowdownProgress = elapsed / slowdownDuration;
          const slowdownFactor = 1 - easeInOutQuad(slowdownProgress);
          
          sphereRef.current.children.forEach((row, index) => {
            const baseSpeed = rowRotationSpeedsRef.current.get(index) || 0;
            row.rotation.y += baseSpeed * slowdownFactor * delta;
          });
        }
        
        // Phase 2: Rotate entire sphere to align card (throughout animation)
        const alignProgress = Math.min(elapsed / totalDuration, 1.0);
        const easedAlignProgress = easeInOutQuad(alignProgress);
        
        // Interpolate sphere rotation
        sphereRef.current.rotation.y = (targetSphereRotationRef.current ?? 0) * easedAlignProgress;
        
        // Complete animation
        if (alignProgress >= 1.0) {
          sphereAlignmentStartRef.current = null;
          // Only transition state once (from spectator view)
          if (viewType === 'participant') {
            nextState();
          }
        }
      } else if (!isAligning && !shouldStopRotation) {
        // Normal rotation when not aligning and not in participant-selection
        sphereRef.current.children.forEach((row, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          row.rotation.y += effectiveRotationSpeed * direction * delta;
        });
      }
      
      // Update card orientations and animations
      sphereRef.current.children.forEach((row) => {
        row.children.forEach((cardGroup) => {
          const currentCardIndex = cardGroup.userData.cardIndex as number;
          const isAnimating = animatingCardIndicesRef.current.has(currentCardIndex);
          const hasBeenFlipped = flippedCardIndicesRef.current.has(currentCardIndex);
          const isSpectator = viewType === 'participant';
          const isAudience = viewType === 'audience';
          
          // Handle animating cards
          if (isAnimating) {
            cardGroup.getWorldPosition(_worldPosRef.current);
            const { positionOffset, rotationProgress, isComplete } = animateCardFlip(
              currentCardIndex,
              currentTime,
              _worldPosRef.current,
              viewType
            );
            
            const shouldSkipAnimation = isAudience && trickState === 'cards-flipping';
            const inStaggerDelay = positionOffset.length() === 0 && rotationProgress === 0 && !isComplete;
            
            // If we should skip animation (audience during initial flip), just maintain current state
            if (shouldSkipAnimation) {
              const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
              cardGroup.position.copy(basePosition);
              // Don't recalculate orientation - keep whatever orientation the card already has
              // This prevents cards from appearing to flip as the sphere rotates
              cardGroup.userData.isFlipped = false;
            }
            // During stagger delay in final-flip, maintain current state to prevent flash
            else if (inStaggerDelay && trickState === 'final-flip') {
              const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
              cardGroup.position.copy(basePosition);
              
              if (isSpectator && hasBeenFlipped) {
                // Spectator: keep showing backs (face outward)
                calculateInwardOrientation(cardGroup as THREE.Group, true);
                cardGroup.userData.isFlipped = true;
              } else if (isAudience && !hasBeenFlipped) {
                // Audience: keep showing backs (face inward) until they flip
                calculateInwardOrientation(cardGroup as THREE.Group, false);
                cardGroup.userData.isFlipped = false;
              }
            } else if (!inStaggerDelay && !shouldSkipAnimation) {
              // Animate the card
              const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
              cardGroup.position.copy(basePosition).add(positionOffset);
              
              calculateInwardOrientation(cardGroup as THREE.Group);
              
              // Calculate flip angle based on flip direction
              const isFinalFlipSpectator = trickState === 'final-flip' && isSpectator;
              const isFinalFlipAudience = trickState === 'final-flip' && isAudience;
              const isInitialFlipSpectator = trickState === 'cards-flipping' && isSpectator;
              
              let flipAngle: number;
              if (isFinalFlipSpectator) {
                // Spectator: Backs (outward) to faces (inward) - PI → 0
                flipAngle = Math.PI * (1 - rotationProgress);
              } else if (isFinalFlipAudience) {
                // Audience: start at 0 (inward), flip to PI (outward)
                flipAngle = rotationProgress * Math.PI;
              } else if (isInitialFlipSpectator) {
                // Initial flip for spectator: Faces (inward) to backs (outward) - 0 → PI
                flipAngle = rotationProgress * Math.PI;
              } else {
                // Default: 0 → PI
                flipAngle = rotationProgress * Math.PI;
              }
              
              cardGroup.rotateY(flipAngle);
            }
            
            // Handle animation completion
            if (isComplete && !shouldSkipAnimation) {
              if (trickState === 'final-flip' && isSpectator) {
                flippedCardIndicesRef.current.delete(currentCardIndex);
              } else {
                flippedCardIndicesRef.current.add(currentCardIndex);
              }
              animatingCardIndicesRef.current.delete(currentCardIndex);
              completedCount++;
            } else if (shouldSkipAnimation && isComplete) {
              animatingCardIndicesRef.current.delete(currentCardIndex);
              completedCount++;
            }
          }
          // Handle non-animating cards
          else {
            const basePosition = cardGroup.userData.basePosition as THREE.Vector3;
            if (basePosition) {
              cardGroup.position.copy(basePosition);
            }
            
            // Determine orientation based on view and flip state
            // Spectator (center): sees faces when cards face inward, backs when cards face outward
            // Audience (outside): sees backs when cards face inward, faces when cards face outward
            
            if (isSpectator) {
              // Spectator logic
              if (hasBeenFlipped) {
                // After initial flip, before final flip: show backs (face outward)
                calculateInwardOrientation(cardGroup as THREE.Group, true);
                cardGroup.userData.isFlipped = true;
              } else {
                // Initial state or after final flip: show faces (face inward)
                calculateInwardOrientation(cardGroup as THREE.Group, false);
                cardGroup.userData.isFlipped = false;
              }
            } else if (isAudience) {
              const shouldMaintainOrientation = trickState === 'cards-flipping' 
                || trickState === 'participant-selection'
                || trickState === 'lock-and-reveal'
                || trickState === 'sphere-aligned';
              
              if (shouldMaintainOrientation) {
                const frozenRotation = frozenCardRotationsRef.current.get(currentCardIndex);
                if (frozenRotation) {
                  cardGroup.quaternion.copy(frozenRotation);
                }
              } else {
                if (hasBeenFlipped) {
                  calculateInwardOrientation(cardGroup as THREE.Group, true);
                  cardGroup.userData.isFlipped = true;
                } else {
                  calculateInwardOrientation(cardGroup as THREE.Group, false);
                  cardGroup.userData.isFlipped = false;
                }
              }
            }
          }
        });
      });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CardSphere] Error during useFrame:', err);
    }
  });

  const isSelecting = trickState === 'participant-selection' && viewType === 'participant';

  return (
    <group
      ref={sphereRef}
      onPointerMove={isSelecting ? (e) => { e.stopPropagation(); onPointerHit?.(e.point.clone()); } : undefined}
      onPointerLeave={isSelecting ? () => onPointerHit?.(null) : undefined}
    >
      {cards}
    </group>
  );
}
