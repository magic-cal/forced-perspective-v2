import { useDeviceOrientationStore } from "@/store/deviceOrientationStore";
import { OrbitControls, Preload } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { debug } from "@/config/debug";
import PanoramaViewer from "../PanoramaViewer";
import { CardDeck } from "./CardDeck";
import { CardSphere } from "./CardSphere";
import { DeviceOrientationControls } from "./DeviceOrientationControls";
import { Environment } from "./Environment";
import { HeadsetIndicator } from "./HeadsetIndicator";
import { useCameraSync } from "@/hooks/useCameraSync";
import { useCameraAnimation } from "@/hooks/useCameraAnimation";
import { useCameraUnlink } from "@/hooks/useCameraUnlink";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/sockets/SocketProvider";
import { useTrickStore } from "@/store/useTrickStore";
import { TRICK_CONFIG } from "@/config/trick";

export function Scene() {
  const { camera, gl } = useThree();
  const [isSpread, setIsSpread] = useState(false);
  const [currentScene, setCurrentScene] = useState<
    "cards" | "landmarks" | "card-deck"
  >("cards");
  const [participantRotation, setParticipantRotation] = useState<[number, number, number]>([0, 0, 0]);
  const isDeviceMovementEnabled = useDeviceOrientationStore(
    (state) => state.isEnabled
  );

  const role = useGameStore((s) => s.role);
  const socket = useSocket();
  const currentState = useTrickStore((s) => s.currentState);
  const isUnlinked = useTrickStore((s) => s.isUnlinked);
  const nextState = useTrickStore((s) => s.nextState);
  const selectedCardId = useTrickStore((s) => s.selectedCardId);
  
  // Determine view type based on role
  const viewType = role === 'spectator' ? 'participant' : 'audience';

  // Subscribe to Zustand store changes and broadcast via socket
  useEffect(() => {
    if (!socket) return;

    const unsubscribe = useTrickStore.subscribe((state, prevState) => {
      // Broadcast state changes
      if (state.currentState !== prevState.currentState) {
        debug.trick(`Broadcasting state change: ${state.currentState}`);
        socket.emit('trick-state-changed', {
          state: state.currentState,
          timestamp: Date.now(),
        });
      }

      // Broadcast unlink changes
      if (state.isUnlinked !== prevState.isUnlinked && state.isUnlinked) {
        debug.trick('Broadcasting unlink triggered');
        socket.emit('unlink-triggered', {
          timestamp: Date.now(),
        });
      }

      // Broadcast card selection changes
      if (state.selectedCardId !== prevState.selectedCardId && state.selectedCardId) {
        debug.trick(`Broadcasting card selection: ${state.selectedCardId}`);
        socket.emit('card-selected', {
          cardId: state.selectedCardId,
          suit: 'unknown', // Will be filled by actual card data
          value: 'unknown',
          timestamp: Date.now(),
        });
      }
    });

    return unsubscribe;
  }, [socket]);

  // Listen for state changes from other clients
  useEffect(() => {
    if (!socket) return;

    const handleStateChange = (data: { state: string; timestamp: number }) => {
      debug.trick(`Received state change: ${data.state}`);
      // Only update if different to prevent loops
      if (useTrickStore.getState().currentState !== data.state) {
        useTrickStore.setState({ currentState: data.state as any });
      }
    };

    const handleUnlinkTriggered = () => {
      debug.trick('Received unlink triggered');
      if (!useTrickStore.getState().isUnlinked) {
        useTrickStore.setState({ isUnlinked: true });
      }
    };

    const handleCardSelected = (data: { cardId: string }) => {
      debug.trick(`Received card selection: ${data.cardId}`);
      if (useTrickStore.getState().selectedCardId !== data.cardId) {
        useTrickStore.setState({ selectedCardId: data.cardId });
      }
    };

    socket.on('trick-state-changed', handleStateChange);
    socket.on('unlink-triggered', handleUnlinkTriggered);
    socket.on('card-selected', handleCardSelected);

    return () => {
      socket.off('trick-state-changed', handleStateChange);
      socket.off('unlink-triggered', handleUnlinkTriggered);
      socket.off('card-selected', handleCardSelected);
    };
  }, [socket]);

  // Initialize camera sync with unlink state
  useCameraSync({ 
    enabled: true,
    isUnlinked,
    viewType,
  });
  
  // Initialize camera unlink animation
  const { startUnlinkAnimation } = useCameraUnlink({
    sphereRadius: TRICK_CONFIG.CAMERA.sphereRadius,
    animationDuration: TRICK_CONFIG.ANIMATION_DURATIONS.cameraUnlink,
    onComplete: () => {
      debug.trick('Camera unlink complete, transitioning to next state');
      nextState();
    },
  });

  // Initialize camera animation
  const { startAnimation } = useCameraAnimation();

  // Trigger unlink animation when entering unlink-and-rotate state
  useEffect(() => {
    if (currentState === 'unlink-and-rotate' && viewType === 'audience' && !isUnlinked) {
      debug.trick('Triggering camera unlink animation for audience');
      useTrickStore.setState({ isUnlinked: true });
      startUnlinkAnimation().catch(debug.error);
    }
  }, [currentState, viewType, isUnlinked, startUnlinkAnimation]);
  
  // Track participant camera rotation for headset indicator with throttling
  useEffect(() => {
    if (!socket) return undefined;
    
    if (viewType === 'participant') {
      // Broadcast rotation updates with threshold to reduce network traffic
      let lastRotation = { x: 0, y: 0, z: 0 };
      const ROTATION_THRESHOLD = 0.01; // radians
      
      const updateRotation = () => {
        const { x, y, z } = camera.rotation;
        
        // Only broadcast if rotation changed significantly
        if (
          Math.abs(x - lastRotation.x) > ROTATION_THRESHOLD ||
          Math.abs(y - lastRotation.y) > ROTATION_THRESHOLD ||
          Math.abs(z - lastRotation.z) > ROTATION_THRESHOLD
        ) {
          socket.emit('participant-rotation', { x, y, z });
          lastRotation = { x, y, z };
        }
      };
      
      // Use requestAnimationFrame for smooth updates
      let animationFrameId: number;
      const animate = () => {
        updateRotation();
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
      
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    } else if (viewType === 'audience') {
      // Listen for rotation updates
      const handleRotationUpdate = (rotation: { x: number; y: number; z: number }) => {
        setParticipantRotation([rotation.x, rotation.y, rotation.z]);
      };
      
      socket.on('participant-rotation', handleRotationUpdate);
      return () => {
        socket.off('participant-rotation', handleRotationUpdate);
      };
    }
    
    return undefined;
  }, [socket, viewType, camera]);

  // Start animation for audience after a delay (legacy - can be removed if not needed)
  useEffect(() => {
    if (!socket || role !== "audience") return;

    const handleStartAnimation = () => {
      debug.camera("Starting camera animation for audience");
      startAnimation({
        duration: 3000,
        radius: 5,
        height: 2,
        target: [0, 0, 0],
      }).catch(console.error);
    };

    // Start animation after 5 seconds
    const timer = setTimeout(handleStartAnimation, 5000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      socket.off("start-animation", handleStartAnimation);
    };
  }, [role, socket, startAnimation]);

  // Initialize scene
  useEffect(() => {
    camera.position.set(0, 0, 0);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  const handleDeckClick = () => {
    setIsSpread(!isSpread);
  };

  return (
    <>
      <Preload all />
      {currentScene === "landmarks" ? null : (
        <Environment preset="sunset" intensity={1} blur={0.65} />
      )}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={10}
        maxDistance={50}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.1}
        enabled={!isDeviceMovementEnabled}
      />
      <DeviceOrientationControls enabled={isDeviceMovementEnabled} />

      {currentScene === "card-deck" ? (
        <CardDeck isSpread={isSpread} onDeckClick={handleDeckClick} />
      ) : currentScene === "cards" ? (
        <CardSphere 
          radius={15} 
          maxCardsPerRow={48} 
          rotationSpeed={0.02}
          viewType={viewType}
          trickState={currentState}
          selectedCardId={selectedCardId}
        />
      ) : (
        <PanoramaViewer />
      )}
      
      {/* Headset indicator - only visible to audience after unlink */}
      {viewType === 'audience' && isUnlinked && (
        <HeadsetIndicator
          position={[0, 0, 0]}
          rotation={participantRotation}
          visible={true}
        />
      )}

      {/* Scene switcher button */}
      {/* <mesh
        position={[0, -10, 0]}
        onClick={() =>
          setCurrentScene(currentScene === "cards" ? "landmarks" : "cards")
        }
      >
        <boxGeometry args={[2, 0.5, 0.5]} />
        <meshStandardMaterial
          color={currentScene === "cards" ? "#ff4444" : "#44ff44"}
        />
      </mesh> */}
    </>
  );
}
