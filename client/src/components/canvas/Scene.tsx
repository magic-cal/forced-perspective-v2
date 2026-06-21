import { useDeviceOrientationStore } from "@/store/deviceOrientationStore";
import { OrbitControls, Preload } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { debug, SHOW_DEBUG_UI } from "@/config/debug";
import PanoramaViewer from "../PanoramaViewer";
import { CardDeck } from "./CardDeck";
import { CardSphere } from "./CardSphere";
import LandmarkGallery from './LandmarkGallery';
import { DeviceOrientationControls } from "./DeviceOrientationControls";
import { Environment } from "./Environment";
import { HeadsetIndicator } from "./HeadsetIndicator";
import { XRDebug } from "./XRDebug";
import { PointerIndicator } from "./PointerIndicator";
import { useCameraSync } from "@/hooks/useCameraSync";
import { useCameraUnlink } from "@/hooks/useCameraUnlink";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/sockets/SocketProvider";
import { useTrickStore } from "@/store/useTrickStore";
import { TRICK_CONFIG } from "@/config/trick";

// Reusable — avoids allocations inside useFrame
const _sphereCenter = new THREE.Vector3(0, 0, 0);

export function Scene() {
  const { camera, gl } = useThree();
  const [isSpread, setIsSpread] = useState(false);
  const skipGallery = new URLSearchParams(window.location.search).get('gallery') === '0';
  const [currentScene, setCurrentScene] = useState<"cards" | "landmarks" | "card-deck">(skipGallery ? "cards" : "landmarks");
  const lastBroadcastQuatRef = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const [pointerHitPos, setPointerHitPos] = useState<THREE.Vector3 | null>(null);
  const lastPointerEmitRef = useRef(0);
  // Driven imperatively via useFrame in HeadsetIndicator — no React state, no re-renders
  const headsetIndicatorQuatRef = useRef(new THREE.Quaternion());
  // Target quaternion for audience camera slerp — updated from participant-rotation events.
  // Drives camera.quaternion directly to avoid Euler gimbal lock at extreme pitch angles.
  const audienceCamTargetQuatRef = useRef(new THREE.Quaternion());
  const hasAudienceCamTargetRef = useRef(false);
  const isDeviceMovementEnabled = useDeviceOrientationStore(
    (state) => state.isEnabled
  );
  const isPresenting = useXR((state) => state.isPresenting);

  const role = useGameStore((s) => s.role);
  const socket = useSocket();
  const currentState = useTrickStore((s) => s.currentState);
  const isUnlinked = useTrickStore((s) => s.isUnlinked);
  const selectedCardId = useTrickStore((s) => s.selectedCardId);
  
  // Determine view type based on role
  const viewType = role === 'spectator' ? 'participant' : 'audience';
  
  // Trick state sync is handled by useTrickSync (mounted in App.tsx)

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
      debug.trick('Camera unlink complete');
    },
  });

  // Trigger unlink animation when entering cards-flipping state
  useEffect(() => {
    if (currentState === 'cards-flipping' && viewType === 'audience' && !isUnlinked) {
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

      // Return to gallery (or cards if gallery was disabled via URL param)
      setCurrentScene(skipGallery ? 'cards' : 'landmarks');

      // Reset headset indicator + audience camera target rotations
      headsetIndicatorQuatRef.current.identity();
      audienceCamTargetQuatRef.current.identity();
      hasAudienceCamTargetRef.current = false;
      
      // Reset camera to initial position
      const initialPosition = new THREE.Vector3(0, 2, 6);
      const initialLookAt = new THREE.Vector3(0, 2, 0);
      
      camera.position.copy(initialPosition);
      camera.lookAt(initialLookAt);
      
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
  }, [currentState, viewType, resetUnlinkState, resetInterpolation, camera, forceBroadcast, skipGallery]);
  
  useFrame((state, _delta, frame) => {
    if (!socket || viewType !== 'participant') return;
    const QUAT_THRESHOLD = 0.005;

    let qx: number, qy: number, qz: number, qw: number;

    if (frame) {
      // XR mode — use the authoritative WebXR viewer pose (absolute orientation).
      // isPresenting from useXR is unreliable (undefined in this @react-three/xr v6
      // build); !!frame is the definitive indicator that an XR frame is active.
      // We use absolute orientation (no relative calculation) because WebXR's reference
      // space is gravity-aligned Y-up, matching the Three.js scene coordinate system.
      // A relative calculation would bake in the entry angle as a downward offset.
      const refSpace = state.gl.xr.getReferenceSpace();
      if (!refSpace) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pose = (frame as any).getViewerPose(refSpace);
      if (!pose) return;

      qx = pose.transform.orientation.x;
      qy = pose.transform.orientation.y;
      qz = pose.transform.orientation.z;
      qw = pose.transform.orientation.w;
    } else {
      qx = camera.quaternion.x;
      qy = camera.quaternion.y;
      qz = camera.quaternion.z;
      qw = camera.quaternion.w;
    }

    const last = lastBroadcastQuatRef.current;
    if (
      Math.abs(qx - last.x) > QUAT_THRESHOLD ||
      Math.abs(qy - last.y) > QUAT_THRESHOLD ||
      Math.abs(qz - last.z) > QUAT_THRESHOLD ||
      Math.abs(qw - last.w) > QUAT_THRESHOLD
    ) {
      socket.emit('participant-rotation', { x: qx, y: qy, z: qz, w: qw });
      last.x = qx; last.y = qy; last.z = qz; last.w = qw;
    }
  });

  // Audience: receive participant head rotation, drive indicator + audience camera target.
  // We store the quaternion in a ref and slerp the camera toward it in useFrame below,
  // rather than converting to Euler (which breaks at ±90° pitch due to gimbal lock).
  useEffect(() => {
    if (!socket || viewType !== 'audience') return undefined;

    const handleRotationUpdate = (q: { x: number; y: number; z: number; w: number }) => {
      headsetIndicatorQuatRef.current.set(q.x, q.y, q.z, q.w);
      audienceCamTargetQuatRef.current.set(q.x, q.y, q.z, q.w);
      hasAudienceCamTargetRef.current = true;
    };

    socket.on('participant-rotation', handleRotationUpdate);
    return () => { socket.off('participant-rotation', handleRotationUpdate); };
  }, [socket, viewType]);

  // Audience: slerp camera quaternion + lerp position to match the spectator each frame.
  // Quaternion slerp avoids Euler gimbal lock at extreme pitch angles.
  // Position lerps to the sphere center [0,0,0] — the spectator's standing point in VR.
  useFrame((_, delta) => {
    if (viewType !== 'audience' || isUnlinked || !hasAudienceCamTargetRef.current) return;
    const t = Math.min(0.15 * delta * 60, 1);
    camera.quaternion.slerp(audienceCamTargetQuatRef.current, t);
    camera.position.lerp(_sphereCenter, t);
  });

  // Magician can force-skip the gallery on all clients
  useEffect(() => {
    if (!socket) return undefined;
    const handle = () => setCurrentScene('cards');
    socket.on('gallery-skip', handle);
    return () => { socket.off('gallery-skip', handle); };
  }, [socket]);

  // Clear pointer when leaving selection state
  useEffect(() => {
    if (currentState !== 'participant-selection') {
      setPointerHitPos(null);
      if (socket && viewType === 'participant') {
        socket.emit('pointer-hit', null);
      }
    }
  }, [currentState, socket, viewType]);

  // Participant: broadcast pointer hit position to audience (throttled)
  const handlePointerHit = useCallback((point: THREE.Vector3 | null) => {
    setPointerHitPos(point);
    const now = Date.now();
    if (socket && now - lastPointerEmitRef.current > 40) {
      socket.emit('pointer-hit', point ? { x: point.x, y: point.y, z: point.z } : null);
      lastPointerEmitRef.current = now;
    }
  }, [socket]);

  // Audience: receive pointer hit from participant
  useEffect(() => {
    if (!socket || viewType !== 'audience') return undefined;
    const handle = (data: { x: number; y: number; z: number } | null) => {
      setPointerHitPos(data ? new THREE.Vector3(data.x, data.y, data.z) : null);
    };
    socket.on('pointer-hit', handle);
    return () => { socket.off('pointer-hit', handle); };
  }, [socket, viewType]);

  // Initialize scene
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const handleDeckClick = () => {
    setIsSpread(!isSpread);
  };

  // Keyboard / pointer handler to progress the landmarks gallery or move to cards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n') {
        // Next: if in landmarks, move to cards when done
        if (currentScene === 'landmarks') {
          setCurrentScene('card-deck');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentScene]);

  return (
    <>
      <Preload all />
      {currentScene === "landmarks" ? null : (
        <Environment preset="sunset" intensity={1} blur={0.65} />
      )}
      {!isPresenting && (
        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          minDistance={10}
          maxDistance={50}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.1}
          enabled={!isDeviceMovementEnabled && !(viewType === 'audience' && !isUnlinked)}
        />
      )}
      <DeviceOrientationControls enabled={isDeviceMovementEnabled && !isPresenting} />

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
          onPointerHit={viewType === 'participant' ? handlePointerHit : undefined}
        />
      ) : currentScene === 'landmarks' ? (
        <LandmarkGallery onFinish={() => setCurrentScene('cards')} />
      ) : (
        <PanoramaViewer />
      )}
      
      {/* Pointer hit indicator - visible to both roles during card selection */}
      {currentState === 'participant-selection' && pointerHitPos && (
        <PointerIndicator position={pointerHitPos} />
      )}

      {/* Headset indicator - only visible to audience after unlink */}
      {viewType === 'audience' && isUnlinked && (
        <HeadsetIndicator
          position={[0, 0, 0]}
          quaternionRef={headsetIndicatorQuatRef}
        />
      )}

      {/* XRDebug: gate behind ?debug=1 so it stays available but hidden by default */}
      {SHOW_DEBUG_UI && viewType === 'audience' && (
        <XRDebug quaternionRef={headsetIndicatorQuatRef} />
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
