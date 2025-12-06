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
  const [headsetIndicatorRotation, setHeadsetIndicatorRotation] = useState<[number, number, number]>([0, 0, 0]);
  const isDeviceMovementEnabled = useDeviceOrientationStore(
    (state) => state.isEnabled
  );

  const role = useGameStore((s) => s.role);
  const socket = useSocket();
  const currentState = useTrickStore ((s) => s.currentState);
  const isUnlinked = useTrickStore((s) => s.isUnlinked);
  const nextState = useTrickStore((s) => s.nextState);
  const setState = useTrickStore((s) => s.setState);
  const selectedCardId = useTrickStore((s) => s.selectedCardId);
  
  // Determine view type based on role
  const viewType = role === 'spectator' ? 'participant' : 'audience';
  
  // Sync trick state via socket
  useEffect(() => {
    if (!socket) return;
    
    // Broadcast state changes (magician/spectator only)
    if (role === 'magician' || role === 'spectator') {
      socket.emit('trick-state-change', { state: currentState });
      console.log('Broadcasting trick state:', currentState);
    }
    
    // Listen for state changes (audience only)
    if (role === 'audience') {
      const handleStateChange = (data: { state: TrickState }) => {
        console.log('Received trick state:', data.state);
        setState(data.state);
      };
      
      socket.on('trick-state-change', handleStateChange);
      return () => {
        socket.off('trick-state-change', handleStateChange);
      };
    }
  }, [socket, currentState, role, setState]);

  // Initialize camera sync with unlink state
  const { resetInterpolation, forceBroadcast } = useCameraSync({ 
    enabled: true,
    isUnlinked,
    viewType,
  });
  
  // Initialize camera unlink animation
  const { startUnlinkAnimation, resetUnlinkState } = useCameraUnlink({
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
      // Reset interpolation state before unlinking to prevent jumps
      resetInterpolation();
      useTrickStore.setState({ isUnlinked: true });
      startUnlinkAnimation().catch(debug.error);
    }
  }, [currentState, viewType, isUnlinked, startUnlinkAnimation, resetInterpolation]);
  
  // Reset everything when returning to setup state
  useEffect(() => {
    if (currentState === 'setup') {
      debug.trick('Resetting all trick state');
      
      // Reset camera unlink state
      resetUnlinkState();
      
      // Reset interpolation
      resetInterpolation();
      
      // Reset headset indicator rotation
      setHeadsetIndicatorRotation([0, 0, 0]);
      
      // Reset camera to initial position
      const initialPosition = new THREE.Vector3(0, 2, 6);
      const initialLookAt = new THREE.Vector3(0, 2, 0);
      
      camera.position.copy(initialPosition);
      camera.lookAt(initialLookAt);
      
      debug.camera(`Camera reset to initial position: ${initialPosition.x}, ${initialPosition.y}, ${initialPosition.z}`);
      
      // For audience, re-enable camera sync by ensuring isUnlinked is false
      if (viewType === 'audience') {
        useTrickStore.setState({ isUnlinked: false });
      }
      
      // For spectator, force broadcast the reset camera position
      if (viewType === 'participant') {
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          forceBroadcast();
        }, 100);
      }
    }
  }, [currentState, viewType, resetUnlinkState, resetInterpolation, camera, forceBroadcast]);
  
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
        // Calculate the headset indicator rotation relative to audience camera
        // When unlinked, the participant is at the center and should face the audience
        if (isUnlinked) {
          // Calculate the rotation needed for the headset to face the audience
          // Create a temporary object to use lookAt
          const tempObject = new THREE.Object3D();
          tempObject.position.set(0, camera.position.y, 0); // Headset at center
          tempObject.lookAt(camera.position); // Face the audience camera
          
          // Extract the Y rotation (yaw) from the lookAt result
          const baseRotationY = tempObject.rotation.y;
          
          // Apply participant's relative head rotation on top of facing the audience
          setHeadsetIndicatorRotation([
            rotation.x,
            baseRotationY + rotation.y,
            rotation.z
          ]);
        } else {
          // When linked, use the participant's rotation directly
          setHeadsetIndicatorRotation([rotation.x, rotation.y, rotation.z]);
        }
      };
      
      socket.on('participant-rotation', handleRotationUpdate);
      return () => {
        socket.off('participant-rotation', handleRotationUpdate);
      };
    }
    
    return undefined;
  }, [socket, viewType, camera]);

  // Initialize scene
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

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
          rotation={headsetIndicatorRotation}
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
