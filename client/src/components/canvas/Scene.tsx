import { useDeviceOrientationStore } from "@/store/deviceOrientationStore";
import { OrbitControls, Preload } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { debug, SHOW_DEBUG_UI } from "@/config/debug";
import { CardSphere } from "./CardSphere";
import LandmarkGallery from './LandmarkGallery';
import { LandingScene } from './LandingScene';
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
import { useShowFlowStore } from "@/store/useShowFlowStore";
import { TRICK_CONFIG } from "@/config/trick";
import { easeInOutCubic } from "@/utils/easing";


// Pre-allocated scratch — avoids allocations inside useFrame
const _up = new THREE.Vector3(0, 1, 0);
const _lookAtOrigin = new THREE.Vector3(0, 0, 0);
const _tempMatrix = new THREE.Matrix4();
const _cardWorldPos = new THREE.Vector3();
const _liveTargetPos = new THREE.Vector3();
const _liveTargetQuat = new THREE.Quaternion();

export function Scene() {
  const { camera, gl, scene } = useThree();
  const showPhase = useShowFlowStore((s) => s.showPhase);
  const galleryEnabled = useShowFlowStore((s) => s.galleryEnabled);
  const lastBroadcastQuatRef = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const [pointerHitPos, setPointerHitPos] = useState<THREE.Vector3 | null>(null);
  const lastPointerEmitRef = useRef(0);
  // Driven imperatively via useFrame in HeadsetIndicator — no React state, no re-renders
  const headsetIndicatorQuatRef = useRef(new THREE.Quaternion());
  // Target quaternion for audience camera slerp — updated from participant-rotation events.
  // Drives camera.quaternion directly to avoid Euler gimbal lock at extreme pitch angles.
  const audienceCamTargetQuatRef = useRef(new THREE.Quaternion());
  const hasAudienceCamTargetRef = useRef(false);

  // Sphere-aligned camera: lock the audience cam into a fixed line-of-sight through the
  // selected card to the headset when the trick enters sphere-aligned state.
  // audienceCamLocked (state) disables useCameraSync; the ref mirrors it for useFrame.
  const [audienceCamLocked, setAudienceCamLocked] = useState(false);
  const audienceCamLockedRef = useRef(false);
  const sphereAlignedNeedsInitRef = useRef(false);
  const sphereAlignedStartPosRef = useRef<THREE.Vector3 | null>(null);
  const sphereAlignedTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const sphereAlignedStartQuatRef = useRef<THREE.Quaternion | null>(null);
  const sphereAlignedTargetQuatRef = useRef<THREE.Quaternion | null>(null);
  const sphereAlignedAnimStartRef = useRef<number | null>(null);
  const selectedCardObjectRef = useRef<THREE.Object3D | null>(null);
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
    enabled: !audienceCamLocked,
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
  
  // Lock audience camera into aligned position when entering sphere-aligned.
  // Delay camera init until the sphere rotation animation completes so the card
  // world-position used for targeting is the final settled position, not mid-rotation.
  useEffect(() => {
    if (currentState !== 'sphere-aligned' || viewType !== 'audience' || !selectedCardId) return;
    audienceCamLockedRef.current = true;
    setAudienceCamLocked(true);
    selectedCardObjectRef.current = null; // reset for fresh scene search
    sphereAlignedNeedsInitRef.current = true; // begin immediately — live-track the rotating card
  }, [currentState, viewType, selectedCardId]);

  // Reset everything when returning to setup state
  useEffect(() => {
    if (currentState === 'setup') {
      debug.trick('Resetting all trick state');

      // Reset camera unlink state
      resetUnlinkState();

      // Reset interpolation
      resetInterpolation();

      // Return to the appropriate phase for the next run
      useShowFlowStore.getState().reset();

      // Reset headset indicator + audience camera target rotations
      headsetIndicatorQuatRef.current.identity();
      audienceCamTargetQuatRef.current.identity();
      hasAudienceCamTargetRef.current = false;

      // Release sphere-aligned camera lock
      audienceCamLockedRef.current = false;
      setAudienceCamLocked(false);
      sphereAlignedNeedsInitRef.current = false;
      sphereAlignedStartPosRef.current = null;
      sphereAlignedTargetPosRef.current = null;
      sphereAlignedStartQuatRef.current = null;
      sphereAlignedTargetQuatRef.current = null;
      sphereAlignedAnimStartRef.current = null;
      selectedCardObjectRef.current = null;
      
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
  }, [currentState, viewType, resetUnlinkState, resetInterpolation, camera, forceBroadcast]);
  
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

  // Audience: slerp camera quaternion to match the spectator's head rotation each frame.
  // Quaternion slerp avoids Euler gimbal lock at extreme pitch angles.
  // Position is owned entirely by useCameraSync (camera-update events) — do not write
  // camera.position here or it will fight the sync lerp and cause visible pulsing.
  // Suspended when audienceCamLockedRef is true (sphere-aligned / final-flip) so the
  // spectator's head movement doesn't fight the aligned camera position.
  useFrame((_, delta) => {
    if (viewType !== 'audience' || isUnlinked || audienceCamLockedRef.current || !hasAudienceCamTargetRef.current || showPhase === 'end-gallery') return;
    const t = Math.min(0.15 * delta * 60, 1);
    camera.quaternion.slerp(audienceCamTargetQuatRef.current, t);
  });

  // Sphere-aligned camera: smoothly move the audience camera to face the selected card,
  // live-tracking its position while the sphere rotates so both motions feel like one.
  useFrame(() => {
    if (viewType !== 'audience' || !audienceCamLockedRef.current) return;

    // Phase 1: first frame — find the card object in the scene and cache a ref to it.
    if (sphereAlignedNeedsInitRef.current && selectedCardId) {
      let found: THREE.Object3D | null = null;
      scene.traverse((obj) => {
        if (!found && obj.userData?.id === selectedCardId) found = obj;
      });
      if (found) {
        selectedCardObjectRef.current = found;
        sphereAlignedStartPosRef.current = camera.position.clone();
        sphereAlignedStartQuatRef.current = camera.quaternion.clone();
        sphereAlignedAnimStartRef.current = Date.now();
        sphereAlignedNeedsInitRef.current = false;
      }
      return;
    }

    const cardObj = selectedCardObjectRef.current;
    const startPos = sphereAlignedStartPosRef.current;
    const startQuat = sphereAlignedStartQuatRef.current;
    if (!cardObj || !startPos || !startQuat) return;

    // Read the card's live world position (changes while sphere is still rotating)
    cardObj.getWorldPosition(_cardWorldPos);
    if (_cardWorldPos.length() < 0.01) return;

    // Target: same orbital distance from centre, looking toward origin through card
    const currentDist = startPos.length() || TRICK_CONFIG.CAMERA.unlinkDistance;
    _liveTargetPos.copy(_cardWorldPos).normalize().multiplyScalar(currentDist);
    _tempMatrix.lookAt(_liveTargetPos, _lookAtOrigin, _up);
    _liveTargetQuat.setFromRotationMatrix(_tempMatrix);

    if (sphereAlignedAnimStartRef.current !== null) {
      // Animated phase: lerp from start toward live target
      const elapsed = Date.now() - sphereAlignedAnimStartRef.current;
      const progress = Math.min(elapsed / TRICK_CONFIG.SPHERE_ALIGNMENT.audienceCamDuration, 1.0);
      const eased = easeInOutCubic(progress);
      camera.position.lerpVectors(startPos, _liveTargetPos, eased);
      camera.quaternion.slerpQuaternions(startQuat, _liveTargetQuat, eased);
      if (progress >= 1.0) sphereAlignedAnimStartRef.current = null;
    } else {
      // Settled phase: gently hold on the card's final position
      camera.position.lerp(_liveTargetPos, 0.1);
      camera.quaternion.slerp(_liveTargetQuat, 0.1);
    }
  });

  // Audience/spectator: respond to scene-switching events from the magician
  useEffect(() => {
    if (!socket) return undefined;
    const handleGallerySkip = () => useShowFlowStore.getState().setShowPhase('trick');
    const handleEndGalleryStart = () => useShowFlowStore.getState().setShowPhase('end-gallery');
    const handleTrickReset = () => useShowFlowStore.getState().reset();
    socket.on('gallery-skip', handleGallerySkip);
    socket.on('end-gallery-start', handleEndGalleryStart);
    socket.on('trick-reset', handleTrickReset);
    return () => {
      socket.off('gallery-skip', handleGallerySkip);
      socket.off('end-gallery-start', handleEndGalleryStart);
      socket.off('trick-reset', handleTrickReset);
    };
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

  // Initialize scene — disable shadow maps entirely on Quest (nothing receives them anyway)
  useEffect(() => {
    gl.shadowMap.enabled = !isPresenting;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, isPresenting]);

  return (
    <>
      <Preload all />
      <Environment preset="sunset" intensity={1} blur={0.65} enableShadows={!isPresenting} />
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
          enabled={!isDeviceMovementEnabled && (viewType !== 'audience' || showPhase === 'end-gallery')}
        />
      )}
      <DeviceOrientationControls enabled={isDeviceMovementEnabled && !isPresenting} />

      {showPhase === 'start-gallery' && galleryEnabled ? (
        <LandmarkGallery onFinish={() => useShowFlowStore.getState().setShowPhase('trick')} />
      ) : showPhase === 'end-gallery' && galleryEnabled ? (
        <LandmarkGallery
          indexEvent="end-landmark-index"
          finishEvent="end-landmark-finish"
        />
      ) : showPhase === 'trick' ? (
        <CardSphere
          radius={15}
          maxCardsPerRow={48}
          rotationSpeed={0.02}
          viewType={viewType}
          trickState={currentState}
          selectedCardId={selectedCardId}
          onPointerHit={viewType === 'participant' ? handlePointerHit : undefined}
        />
      ) : showPhase === 'landing' ? (
        <LandingScene />
      ) : null}
      
      {/* Pointer hit indicator - visible to both roles during card selection */}
      {currentState === 'participant-selection' && pointerHitPos && (
        <PointerIndicator position={pointerHitPos} viewType={viewType} />
      )}

      {/* Headset indicator - only visible to audience after unlink */}
      {viewType === 'audience' && isUnlinked && showPhase !== 'end-gallery' && (
        <HeadsetIndicator
          position={[0, 0, 0]}
          quaternionRef={headsetIndicatorQuatRef}
        />
      )}

      {/* XRDebug: gate behind ?debug=1 so it stays available but hidden by default */}
      {SHOW_DEBUG_UI && viewType === 'audience' && (
        <XRDebug quaternionRef={headsetIndicatorQuatRef} />
      )}

    </>
  );
}
