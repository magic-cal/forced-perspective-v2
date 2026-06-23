import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Card } from "./Card";
import { CARD_DIMENSIONS, CARD_SUITS, CARD_VALUES, ViewType, ForcedValue } from "./Card/types";
import { TrickState } from "@/types/trick";
import { useTrickStore } from "@/store/useTrickStore";
import { useCardSelectionStore } from "@/store/cardSelectionStore";
import { useSocket } from "@/sockets/SocketProvider";
import { useSessionStore } from "@/store/sessionStore";
import { FORCED_CARD } from "@/utils/cardForcing";
import { TRICK_CONFIG } from "@/config/trick";
import { easeOutQuad, easeInOutQuad, easeInQuad, easeInOutCubic } from "@/utils/easing";

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
const _scatterTarget = new THREE.Vector3();

// Boid orientation scratch objects (reused every frame to avoid allocations)
const _boidFwd   = new THREE.Vector3();
const _boidRight = new THREE.Vector3();
const _boidFace  = new THREE.Vector3();
const _boidUp    = new THREE.Vector3();
const _boidMat4  = new THREE.Matrix4();
let _viewPX = 0, _viewPY = 0, _viewPZ = 0; // camera view attraction point, updated each frame
const _frustum    = new THREE.Frustum();
const _frustumMat = new THREE.Matrix4();
const _frustumPt  = new THREE.Vector3();

const SCATTER_DISTANCE = 350;
const SCATTER_DURATION = 3000;
const SCATTER_STAGGER_MS = 8;

interface ScatterEntry {
  startTime: number;
  localStartPos: THREE.Vector3;
  localDirection: THREE.Vector3;
}

// Non-tunable boid constants
const BOID_SPEED_VAR     = 0.05;
const BOID_SEP_DIST_SQ   = 30;
const BOID_ALIGN_DIST_SQ = 400;
const BOID_BOUNDS_MIN    = 55;
const BOID_BOUNDS_MAX    = 82;
const FORMING_DURATION   = 5000;

// Tunable boid config — mutated directly by BoidDebugPanel sliders each frame
export const boidConfig = {
  BOID_SPEED:      0.22,   // cruise speed (units/frame at 60 fps)
  BOID_SEP_W:      0.07,   // separation weight
  BOID_ALIGN_W:    0.01,   // alignment weight
  BOID_BOUNDS_W:   0.05,   // shell boundary steering weight
  BOID_NOISE:      0.002,  // random nudge per frame
  BOID_VIEW_W:     4,      // inverse-square pull toward camera view point
  BOID_CARD_SCALE: 0.7,    // visual scale during murmuration
  ORIENT_LERP:     0.05,   // orientation slerp fraction per frame
};

// Pre-allocated arrays for boid position snapshot (avoids per-frame allocations)
const MAX_BOID_CARDS = 1024;
const _boidPosArr = new Float32Array(MAX_BOID_CARDS * 3);
const _boidIdxArr = new Int32Array(MAX_BOID_CARDS);
const _boidGroupArr: (THREE.Object3D | null)[] = new Array(MAX_BOID_CARDS).fill(null);
const _boidVelArr = new Float32Array(MAX_BOID_CARDS * 3); // velocity snapshot for alignment rule
const _airplaneQ  = new THREE.Quaternion();                // scratch for orientation blending

interface BoidData { velocity: THREE.Vector3 }

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
  const { lockSelection, setSelectedCard } = useTrickStore();
  const setLegacySelectedCard = useCardSelectionStore((s) => s.setSelectedCard);
  const socket = useSocket();
  const sphereRotationFromSession = useSessionStore((s) => s.sphereRotation);
  const hasSphereRotationEmittedRef = useRef(false);
  const animationStartTimeRef = useRef<number | null>(null);
  const sphereAlignmentStartRef = useRef<number | null>(null);
  // Refs instead of state: only read inside useFrame/callbacks, never drive JSX
  const targetSphereRotationRef = useRef<number | null>(null);
  const rowRotationSpeedsRef = useRef<Map<number, number>>(new Map());
  const frozenCardRotationsRef = useRef<Map<number, THREE.Quaternion>>(new Map());
  const scatterDataRef = useRef<Map<number, ScatterEntry>>(new Map());
  const boidDataRef = useRef<Map<number, BoidData>>(new Map());
  const formingStartTimeRef = useRef<number | null>(null);
  const formingStartPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map());
  const formingAdvancedRef = useRef(false);
  const formingTargetQuaternionsRef = useRef<Map<number, THREE.Quaternion>>(new Map());
  const formingStaggerRef = useRef<Map<number, number>>(new Map());

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
  
  // Trigger flip animation when entering cards-flipping state
  useEffect(() => {
    if (trickState === 'cards-flipping' && animatingCardIndicesRef.current.size === 0 && totalCardCountRef.current > 0) {
      startFlipAnimation();
    }
  }, [trickState, viewType]);

  // Trigger final flip — always clear and restart so early state transitions don't skip it
  useEffect(() => {
    if (trickState === 'final-flip' && totalCardCountRef.current > 0) {
      animatingCardIndicesRef.current = new Map();
      // Ensure all spectator cards are marked as flipped so the animation starts from backs-showing state
      if (viewType === 'participant') {
        const allFlipped = new Set<number>();
        for (let i = 0; i < totalCardCountRef.current; i++) allFlipped.add(i);
        flippedCardIndicesRef.current = allFlipped;
      }
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
      scatterDataRef.current = new Map();
      boidDataRef.current = new Map();
      formingStartTimeRef.current = null;
      formingStartPositionsRef.current = new Map();
      formingAdvancedRef.current = false;
      formingTargetQuaternionsRef.current = new Map();
      formingStaggerRef.current = new Map();
      setForcedCardValue(null);
      animationStartTimeRef.current = null;
      sphereAlignmentStartRef.current = null;
      targetSphereRotationRef.current = null;
      rowRotationSpeedsRef.current = new Map();
      frozenCardRotationsRef.current = new Map();
      hasSphereRotationEmittedRef.current = false;

      // Reset sphere rotation and card visibility
      if (sphereRef.current) {
        sphereRef.current.rotation.y = 0;
        sphereRef.current.children.forEach((row) => {
          row.rotation.y = 0;
          row.children.forEach((cardGroup) => { cardGroup.visible = true; });
        });
      }
    }
  }, [trickState]);

  // Initialise boid simulation when entering setup
  useEffect(() => {
    if (trickState !== 'setup' || !sphereRef.current) return;

    const boidData = new Map<number, BoidData>();

    sphereRef.current.children.forEach((row) => {
      row.children.forEach((cardGroup) => {
        const idx = cardGroup.userData.cardIndex as number;

        // Spawn within the annular shell so cards start in the visible zone
        const phi = Math.acos(1 - 2 * Math.random());
        const theta = Math.random() * Math.PI * 2;
        const r = BOID_BOUNDS_MIN + 2 + Math.random() * (BOID_BOUNDS_MAX - BOID_BOUNDS_MIN - 4);
        cardGroup.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        );
        cardGroup.scale.setScalar(boidConfig.BOID_CARD_SCALE);

        // Random initial velocity near cruise speed
        const speed = boidConfig.BOID_SPEED + (Math.random() - 0.5) * BOID_SPEED_VAR * 2;
        const vPhi = Math.acos(1 - 2 * Math.random());
        const vTheta = Math.random() * Math.PI * 2;
        boidData.set(idx, {
          velocity: new THREE.Vector3(
            speed * Math.sin(vPhi) * Math.cos(vTheta),
            speed * Math.cos(vPhi),
            speed * Math.sin(vPhi) * Math.sin(vTheta),
          ),
        });
      });
    });

    boidDataRef.current = boidData;
  }, [trickState]);

  // When leaving setup/forming, rows are at rotation.y=0 (frozen by shouldStopRotation).
  // Reset the epoch reference so the epoch-based rotation starts from 0 rather than
  // jumping to the accumulated offset since session start.
  useEffect(() => {
    if (trickState === 'forming') {
      useSessionStore.setState({ sessionStartTime: Date.now() });
    }
  }, [trickState]);

  // Capture boid positions as forming start positions when entering forming
  useEffect(() => {
    if (trickState !== 'forming' || !sphereRef.current) return;

    formingAdvancedRef.current = false;
    formingStartTimeRef.current = Date.now();

    const startPositions = new Map<number, THREE.Vector3>();
    sphereRef.current.children.forEach((row) => {
      row.children.forEach((cardGroup) => {
        startPositions.set(
          cardGroup.userData.cardIndex as number,
          cardGroup.position.clone(),
        );
      });
    });
    formingStartPositionsRef.current = startPositions;

    // Capture target quaternion per card at its SPHERE SLOT position (not boid position).
    // Temporarily move each card to basePosition before calling lookAt so the stored
    // orientation is correct for when the card physically arrives at the sphere.
    sphereRef.current.updateWorldMatrix(true, true);
    const targetQuaternions = new Map<number, THREE.Quaternion>();
    const stagger = new Map<number, number>();
    sphereRef.current.children.forEach((row) => {
      row.children.forEach((cardGroup) => {
        const idx = cardGroup.userData.cardIndex as number;
        stagger.set(idx, Math.random() * FORMING_DURATION * 0.25);
        const basePos = cardGroup.userData.basePosition as THREE.Vector3;
        const savedPos = cardGroup.position.clone();
        const savedQ   = cardGroup.quaternion.clone();
        if (basePos) cardGroup.position.copy(basePos);
        (cardGroup as THREE.Object3D).lookAt(_CENTER);
        targetQuaternions.set(idx, cardGroup.quaternion.clone());
        cardGroup.position.copy(savedPos);
        cardGroup.quaternion.copy(savedQ);
      });
    });
    formingTargetQuaternionsRef.current = targetQuaternions;
    formingStaggerRef.current = stagger;
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
  
  // Snap sphere rotation for late-joining clients that missed the alignment animation
  useEffect(() => {
    if (!sphereRef.current || sphereRotationFromSession === 0) return;
    const isPostAlignment = trickState === 'sphere-aligned' || trickState === 'final-flip' || trickState === 'scatter';
    if (isPostAlignment && sphereAlignmentStartRef.current === null) {
      sphereRef.current.rotation.y = sphereRotationFromSession;
    }
  }, [sphereRotationFromSession, trickState]);

  // Handle card selection during participant-selection state
  useEffect(() => {
    if (trickState === 'participant-selection' && selectedCardId) {
      startSphereAlignment(selectedCardId);
    }
  }, [selectedCardId, trickState, startSphereAlignment]);
  
  // When entering sphere-aligned: lock selection, reveal forced card value, restart sphere
  // alignment timer so the animation plays fresh regardless of how long the operator waited
  useEffect(() => {
    if (trickState === 'sphere-aligned' && selectedCardId) {
      if (viewType === 'participant') {
        lockSelection();
      }
      setForcedCardValue(FORCED_CARD);
      sphereAlignmentStartRef.current = Date.now();
    }
  }, [trickState, selectedCardId, lockSelection, viewType]);

  // Initialize scatter animation when entering scatter state
  useEffect(() => {
    if (trickState !== 'scatter' || !sphereRef.current) return;

    sphereRef.current.updateWorldMatrix(true, true);

    const scatterData = new Map<number, ScatterEntry>();
    const currentTime = Date.now();

    const cardDataList: {
      cardIndex: number;
      worldPos: THREE.Vector3;
      theta: number;
      row: THREE.Object3D;
    }[] = [];

    sphereRef.current.children.forEach((row) => {
      row.children.forEach((cardGroup) => {
        const cardComponent = cardGroup.children[0] as THREE.Group;
        const cardId = cardComponent?.userData?.id as string;
        if (cardId === selectedCardId) return;

        const worldPos = new THREE.Vector3();
        cardGroup.getWorldPosition(worldPos);
        const theta = Math.atan2(worldPos.z, worldPos.x);

        cardDataList.push({
          cardIndex: cardGroup.userData.cardIndex as number,
          worldPos,
          theta,
          row,
        });
      });
    });

    // Sort by theta so cards launch in a sweeping wave around the sphere (flock effect)
    cardDataList.sort((a, b) => a.theta - b.theta);

    const rowInvMatrix = new THREE.Matrix4();

    cardDataList.forEach((data, i) => {
      const { worldPos, row, cardIndex, theta } = data;

      // Outward direction with coherent lateral drift — neighbouring cards share similar trajectories
      const outDir = worldPos.clone().normalize();
      outDir.x += Math.sin(theta * 1.7) * 0.15;
      outDir.y += 0.28;
      outDir.z += Math.cos(theta * 1.7) * 0.15;
      outDir.normalize();

      // Convert world direction to row's local space so position.set works correctly
      rowInvMatrix.copy((row as THREE.Object3D).matrixWorld).invert();
      const localDirection = outDir.clone().transformDirection(rowInvMatrix).normalize();
      const localStartPos = (row as THREE.Object3D).worldToLocal(worldPos.clone());

      scatterData.set(cardIndex, {
        startTime: currentTime + i * SCATTER_STAGGER_MS,
        localStartPos,
        localDirection,
      });
    });

    scatterDataRef.current = scatterData;
  }, [trickState, selectedCardId]);

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
    // During boid/forming phases, omit the position prop so React reconciliation
    // does not overwrite the imperatively-driven positions set by useFrame/useEffect.
    const isBoidPhase = trickState === 'setup' || trickState === 'forming';

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
            {...(!isBoidPhase && { position: [x, y + verticalOffset, z] as [number, number, number] })}
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
  useFrame((state, delta) => {
    try {
      if (sphereRef.current) {
        const currentTime = Date.now();
        let completedCount = 0;
        
        const isAligning = trickState === 'sphere-aligned' && sphereAlignmentStartRef.current !== null && targetSphereRotationRef.current !== null;

      // Stop row rotation during boids/forming and all post-selection states
      const shouldStopRotation = trickState === 'setup'
        || trickState === 'participant-selection'
        || trickState === 'sphere-aligned'
        || trickState === 'final-flip'
        || trickState === 'scatter';

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

        // Complete animation — sphere is now aligned; broadcast final angle for late-joiners
        if (alignProgress >= 1.0) {
          sphereAlignmentStartRef.current = null;
          if (viewType === 'participant' && !hasSphereRotationEmittedRef.current) {
            hasSphereRotationEmittedRef.current = true;
            socket?.emit('sphere-rotation-settled', { rotation: sphereRef.current.rotation.y });
          }
        }
      } else if (!isAligning) {
        // Epoch-based row rotation: computed from a shared session clock so any client
        // that joins late snaps to the correct angle immediately, without needing to
        // have been running since t=0.
        const { sessionStartTime, rotationStopTime } = useSessionStore.getState();
        const effectiveNow = rotationStopTime ? Math.min(currentTime, rotationStopTime) : currentTime;
        const elapsedSeconds = (effectiveNow - sessionStartTime) / 1000;

        if (!shouldStopRotation || rotationStopTime !== null) {
          sphereRef.current.children.forEach((row, index) => {
            const direction = index % 2 === 0 ? 1 : -1;
            row.rotation.y = effectiveRotationSpeed * direction * elapsedSeconds;
          });
        }
      }
      
      // BOID + FORMING: murmuration simulation (separation + alignment + cohesion)
      // with an optional homing force that ramps up during 'forming' to pull each
      // card to its sphere slot while it continues flying like a bird.
      if (trickState === 'setup' || trickState === 'forming') {
        // --- snapshot positions + velocities ---
        let boidCount = 0;
        sphereRef.current.children.forEach((row) => {
          row.children.forEach((cardGroup) => {
            const boid = boidDataRef.current.get(cardGroup.userData.cardIndex as number);
            if (!boid) return;
            const b3 = boidCount * 3;
            _boidPosArr[b3]     = cardGroup.position.x;
            _boidPosArr[b3 + 1] = cardGroup.position.y;
            _boidPosArr[b3 + 2] = cardGroup.position.z;
            _boidVelArr[b3]     = boid.velocity.x;
            _boidVelArr[b3 + 1] = boid.velocity.y;
            _boidVelArr[b3 + 2] = boid.velocity.z;
            _boidIdxArr[boidCount]   = cardGroup.userData.cardIndex as number;
            _boidGroupArr[boidCount] = cardGroup as THREE.Object3D;
            boidCount++;
          });
        });

        const isForming      = trickState === 'forming' && formingStartTimeRef.current !== null;
        const formingElapsed = isForming ? (currentTime - formingStartTimeRef.current!) : 0;

        // Read tunable config once per frame so slider changes take effect immediately
        const { BOID_SEP_W, BOID_ALIGN_W, BOID_BOUNDS_W, BOID_NOISE, BOID_VIEW_W, BOID_SPEED, BOID_CARD_SCALE, ORIENT_LERP } = boidConfig;

        // Update frustum once per frame for view-attraction culling
        _frustumMat.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
        _frustum.setFromProjectionMatrix(_frustumMat);

        // Camera view attraction point — shoot a ray from the camera forward and find
        // where it hits the shell midpoint sphere. Both the spectator (at origin) and
        // the audience (inside shell, looking through the sphere) are inside the shell,
        // so this always resolves to a positive-t intersection in front of the camera.
        {
          const me = state.camera.matrixWorld.elements;
          const cfx = -me[8], cfy = -me[9], cfz = -me[10]; // camera -Z = world forward
          const cpx = state.camera.position.x, cpy = state.camera.position.y, cpz = state.camera.position.z;
          const shellMid = (BOID_BOUNDS_MIN + BOID_BOUNDS_MAX) * 0.5;
          const pDotD = cpx * cfx + cpy * cfy + cpz * cfz;
          const disc  = pDotD * pDotD - (cpx * cpx + cpy * cpy + cpz * cpz - shellMid * shellMid);
          const t     = disc >= 0 ? -pDotD + Math.sqrt(disc) : shellMid;
          _viewPX = cpx + cfx * t;
          _viewPY = cpy + cfy * t;
          _viewPZ = cpz + cfz * t;
        }

        // --- per-boid forces ---
        for (let i = 0; i < boidCount; i++) {
          const boid = boidDataRef.current.get(_boidIdxArr[i]);
          if (!boid) continue;

          const obj = _boidGroupArr[i]!;
          const i3  = i * 3;
          const px  = _boidPosArr[i3], py = _boidPosArr[i3 + 1], pz = _boidPosArr[i3 + 2];

          // Per-card staggered forming progress — each card has its own random delay offset
          const cardDelay    = isForming ? (formingStaggerRef.current.get(_boidIdxArr[i]) ?? 0) : 0;
          const cardElapsed  = isForming ? Math.max(0, formingElapsed - cardDelay) : 0;
          const cardProgress = isForming ? Math.min(cardElapsed / (FORMING_DURATION * 0.55), 1.0) : 0;
          const cardEased    = easeInOutCubic(cardProgress);
          // Boid forces scale to zero as card homes in so homing force dominates
          const boidScale    = isForming ? Math.max(0.0, 1 - cardEased * 0.9) : 1.0;

          // Pre-compute distance to sphere slot (used for final approach and speed tuning)
          const homeBase   = isForming && cardEased > 0.05 ? (obj.userData.basePosition as THREE.Vector3) : null;
          const distToHome = homeBase ? obj.position.distanceTo(homeBase) : Infinity;

          // Smooth final approach — within 2 units, lerp directly to avoid visible pop.
          // Scale grows back to full size as the card settles into its slot.
          if (homeBase && distToHome < 2.0) {
            boid.velocity.set(0, 0, 0);
            const approachT = 1.0 - distToHome / 2.0;
            obj.scale.setScalar(BOID_CARD_SCALE + (1 - BOID_CARD_SCALE) * approachT);
            obj.position.lerp(homeBase, 0.15);
            const tQ = formingTargetQuaternionsRef.current.get(_boidIdxArr[i]);
            if (tQ) obj.quaternion.slerp(tQ, 0.2);
            if (distToHome < 0.05) {
              obj.position.copy(homeBase);
              obj.scale.setScalar(1.0);
              if (tQ) obj.quaternion.copy(tQ);
            }
            continue;
          }

          // Still flying — keep bird scale
          obj.scale.setScalar(BOID_CARD_SCALE);

          let sepX = 0, sepY = 0, sepZ = 0;
          let alignVx = 0, alignVy = 0, alignVz = 0, alignN = 0;

          for (let j = 0; j < boidCount; j++) {
            if (j === i) continue;
            const j3  = j * 3;
            const dx  = px - _boidPosArr[j3];
            const dy  = py - _boidPosArr[j3 + 1];
            const dz  = pz - _boidPosArr[j3 + 2];
            const dsq = dx * dx + dy * dy + dz * dz;

            if (dsq < BOID_ALIGN_DIST_SQ && dsq > 0) {
              alignVx += _boidVelArr[j3]; alignVy += _boidVelArr[j3 + 1]; alignVz += _boidVelArr[j3 + 2]; alignN++;
              if (dsq < BOID_SEP_DIST_SQ) {
                const d = Math.sqrt(dsq);
                sepX += dx / d; sepY += dy / d; sepZ += dz / d;
              }
            }
          }

          // Separation
          boid.velocity.x += sepX * BOID_SEP_W * boidScale;
          boid.velocity.y += sepY * BOID_SEP_W * boidScale;
          boid.velocity.z += sepZ * BOID_SEP_W * boidScale;

          // Alignment
          if (alignN > 0) {
            boid.velocity.x += (alignVx / alignN - boid.velocity.x) * BOID_ALIGN_W * boidScale;
            boid.velocity.y += (alignVy / alignN - boid.velocity.y) * BOID_ALIGN_W * boidScale;
            boid.velocity.z += (alignVz / alignN - boid.velocity.z) * BOID_ALIGN_W * boidScale;
          }

          // Shell boundary — gradual ramp so turns aren't abrupt at the shell edge
          const dist = Math.sqrt(px * px + py * py + pz * pz);
          if (dist > 0.001) {
            const invD = 1 / dist;
            if (dist > BOID_BOUNDS_MAX) {
              // Force grows proportionally beyond the boundary — smooth curve-away
              const excess = Math.min((dist - BOID_BOUNDS_MAX) / 8, 1.5);
              const w = BOID_BOUNDS_W * (1 + excess) * boidScale;
              boid.velocity.x -= px * invD * w;
              boid.velocity.y -= py * invD * w;
              boid.velocity.z -= pz * invD * w;
            }
            // During forming, only guard against going inside the sphere itself (not the outer shell)
            const innerBound = isForming ? 18 : BOID_BOUNDS_MIN;
            if (dist < innerBound) {
              const deficit = Math.min((innerBound - dist) / 8, 1.5);
              const w = BOID_BOUNDS_W * (1 + deficit);
              boid.velocity.x += px * invD * w;
              boid.velocity.y += py * invD * w;
              boid.velocity.z += pz * invD * w;
            }
          }

          // Small random nudge — keeps the flock organically varied
          boid.velocity.x += (Math.random() - 0.5) * BOID_NOISE;
          boid.velocity.y += (Math.random() - 0.5) * BOID_NOISE;
          boid.velocity.z += (Math.random() - 0.5) * BOID_NOISE;

          // Inverse-square pull toward the camera view point — only for birds outside
          // the view frustum. Visible birds fly freely; off-screen birds drift back in.
          _frustumPt.set(px, py, pz);
          if (!_frustum.containsPoint(_frustumPt)) {
            const vdx = _viewPX - px, vdy = _viewPY - py, vdz = _viewPZ - pz;
            const vdSq = Math.max(vdx * vdx + vdy * vdy + vdz * vdz, 16);
            const vdLen = Math.sqrt(vdSq);
            const vf = (BOID_VIEW_W / vdSq) * boidScale;
            boid.velocity.x += (vdx / vdLen) * vf;
            boid.velocity.y += (vdy / vdLen) * vf;
            boid.velocity.z += (vdz / vdLen) * vf;
          }

          // Homing force — per-card ramp, uses pre-computed homeBase
          if (homeBase) {
            const homeStrength = cardEased * 0.18;
            boid.velocity.x += (homeBase.x - obj.position.x) * homeStrength;
            boid.velocity.y += (homeBase.y - obj.position.y) * homeStrength;
            boid.velocity.z += (homeBase.z - obj.position.z) * homeStrength;
          }

          // Speed: full forming speed during transit, ease off in the final 14 units for smooth landing
          const proximityFactor = isForming ? Math.min(distToHome / 14, 1) : 1;
          const maxSpd = (BOID_SPEED + BOID_SPEED_VAR) * (isForming ? (0.5 + proximityFactor * 1.5) : 1);
          const minSpd = Math.max(0.005, (BOID_SPEED - BOID_SPEED_VAR) * (isForming ? proximityFactor * 0.3 : 1));
          const spd    = boid.velocity.length();
          if (spd > maxSpd)                     boid.velocity.multiplyScalar(maxSpd / spd);
          else if (spd > 0.001 && spd < minSpd) boid.velocity.multiplyScalar(minSpd / spd);

          obj.position.x += boid.velocity.x;
          obj.position.y += boid.velocity.y;
          obj.position.z += boid.velocity.z;

          // --- Orientation ---
          // Face (+Z local) = outward from scene centre — always visible to observers outside.
          // Up (+Y local) = velocity component perpendicular to face — short end of card leads.
          // Smoothed via slerp each frame to prevent snapping on direction changes.
          const vLen = boid.velocity.length();
          if (vLen > 0.001) {
            _boidFwd.set(boid.velocity.x / vLen, boid.velocity.y / vLen, boid.velocity.z / vLen);

            // Face = toward camera so the card front is always visible to the viewer.
            // Uses card's local-space position as approximation of world position.
            const { x: camX, y: camY, z: camZ } = state.camera.position;
            const cfx = camX - px, cfy = camY - py, cfz = camZ - pz;
            const cfLen = Math.sqrt(cfx * cfx + cfy * cfy + cfz * cfz);
            if (cfLen > 0.001) {
              _boidFace.set(cfx / cfLen, cfy / cfLen, cfz / cfLen);
              // Up = velocity with face component removed (card top follows travel direction)
              const velFaceDot = _boidFwd.x * _boidFace.x + _boidFwd.y * _boidFace.y + _boidFwd.z * _boidFace.z;
              _boidUp.set(
                _boidFwd.x - _boidFace.x * velFaceDot,
                _boidFwd.y - _boidFace.y * velFaceDot,
                _boidFwd.z - _boidFace.z * velFaceDot,
              );
              const upLen = Math.sqrt(_boidUp.x * _boidUp.x + _boidUp.y * _boidUp.y + _boidUp.z * _boidUp.z);
              if (upLen > 0.1) {
                _boidUp.x /= upLen; _boidUp.y /= upLen; _boidUp.z /= upLen;
              } else {
                // Velocity mostly toward camera — fall back to world-up rejection from face
                const wY = Math.abs(_boidFace.y) < 0.98 ? 1 : 0;
                const wZ = Math.abs(_boidFace.y) < 0.98 ? 0 : 1;
                const wDot = wY * _boidFace.y + wZ * _boidFace.z;
                _boidUp.set(-_boidFace.x * wDot, wY - _boidFace.y * wDot, wZ - _boidFace.z * wDot);
                const wLen = Math.sqrt(_boidUp.x * _boidUp.x + _boidUp.y * _boidUp.y + _boidUp.z * _boidUp.z);
                if (wLen > 0.001) { _boidUp.x /= wLen; _boidUp.y /= wLen; _boidUp.z /= wLen; }
              }
            } else {
              // Camera at same position as card — use velocity as face direction
              _boidFace.copy(_boidFwd);
              if (Math.abs(_boidFwd.y) < 0.98) { _boidUp.set(0, 1, 0); } else { _boidUp.set(0, 0, 1); }
            }

            // right = up × face — right-handed basis (X=right, Y=up/~velocity, Z=face/outward)
            _boidRight.crossVectors(_boidUp, _boidFace);
            _boidMat4.makeBasis(_boidRight, _boidUp, _boidFace);

            // During forming: blend per-card toward sphere-slot orientation
            if (isForming && cardEased > 0.03) {
              const targetQ = formingTargetQuaternionsRef.current.get(_boidIdxArr[i]);
              if (targetQ) {
                _airplaneQ.setFromRotationMatrix(_boidMat4);
                _airplaneQ.slerpQuaternions(_airplaneQ, targetQ, cardEased);
              } else {
                _airplaneQ.setFromRotationMatrix(_boidMat4);
              }
            } else {
              _airplaneQ.setFromRotationMatrix(_boidMat4);
            }
            const orientF = isForming ? Math.max(ORIENT_LERP, cardEased * 0.4) : ORIENT_LERP;
            obj.quaternion.slerp(_airplaneQ, orientF);
          }
        }
      }

      // Skip orientation processing entirely during boid/forming states
      if (trickState === 'setup' || trickState === 'forming') return;

      // Update card orientations and animations
      sphereRef.current.children.forEach((row) => {
        row.children.forEach((cardGroup) => {
          // Scatter state: cards fly away like a flock of birds; selected card stays
          if (trickState === 'scatter') {
            const cardComponent = cardGroup.children[0] as THREE.Group;
            const cardId = cardComponent?.userData?.id as string;
            if (cardId !== selectedCardId) {
              const scatter = scatterDataRef.current.get(cardGroup.userData.cardIndex as number);
              if (scatter) {
                const elapsed = currentTime - scatter.startTime;
                if (elapsed >= 0) {
                  const progress = Math.min(elapsed / SCATTER_DURATION, 1.0);
                  const eased = easeInOutCubic(progress);
                  _scatterTarget.copy(scatter.localStartPos).addScaledVector(scatter.localDirection, eased * SCATTER_DISTANCE);
                  cardGroup.position.copy(_scatterTarget);
                  // Hide once fully scattered — XR cameras ignore the far clipping plane
                  if (progress >= 1.0) cardGroup.visible = false;
                }
              }
            }
            return;
          }

          cardGroup.scale.set(1, 1, 1);
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
