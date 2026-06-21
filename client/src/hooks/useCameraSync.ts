import { useEffect, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSocket } from '@/sockets/SocketProvider';
import { useGameStore } from '@/store/gameStore';

// Pre-allocated scratch — avoids allocations inside useFrame
const _xrQuat = new THREE.Quaternion();
const _xrEuler = new THREE.Euler();

type CameraState = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
};

const cameraStateCache: CameraState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

type CameraSyncOptions = {
  enabled?: boolean;
  throttleMs?: number;
  isUnlinked?: boolean;
  viewType?: 'participant' | 'audience';
};

export function useCameraSync(options: CameraSyncOptions = {}) {
  const { enabled = true, throttleMs = 50, isUnlinked = false, viewType } = options;
  const { camera } = useThree();
  const socket = useSocket();
  const role = useGameStore((s) => s.role);
  const isSubscribed = useRef(false);

  const effectiveViewType = viewType ?? (role === 'spectator' ? 'participant' : 'audience');

  // Audience interpolation targets
  const targetPosition = useRef({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
  const targetRotation = useRef({ x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z });
  const isInterpolating = useRef(false);

  // Broadcaster state (avoids allocations inside useFrame)
  const lastSentRef = useRef({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  const lastEmitMsRef = useRef(0);

  const updateCamera = useCallback((data: CameraState) => {
    targetPosition.current = { ...data.position };
    targetRotation.current = { ...data.rotation };
    isInterpolating.current = true;
  }, []);

  const stopInterpolation = useCallback(() => {
    isInterpolating.current = false;
  }, []);

  const resetInterpolation = useCallback(() => {
    isInterpolating.current = false;
    targetPosition.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    targetRotation.current = { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z };
  }, [camera]);

  const forceBroadcast = useCallback(() => {
    if (!socket || role !== 'spectator') return;
    cameraStateCache.position.x = camera.position.x;
    cameraStateCache.position.y = camera.position.y;
    cameraStateCache.position.z = camera.position.z;
    cameraStateCache.rotation.x = camera.rotation.x;
    cameraStateCache.rotation.y = camera.rotation.y;
    cameraStateCache.rotation.z = camera.rotation.z;
    socket.emit('camera-update', cameraStateCache);
  }, [socket, role, camera]);

  // --- Spectator: broadcast camera state via useFrame.
  //     In XR mode, camera.rotation is the XR ArrayCamera's world-space Euler which
  //     includes the XR rig transform — the wrong value to send the audience.
  //     Use frame.getViewerPose() for rotation instead (same fix as Scene.tsx head tracking).
  useFrame((state, _, frame) => {
    if (!socket || role !== 'spectator' || !enabled || effectiveViewType !== 'participant') return;

    const now = performance.now();
    if (now - lastEmitMsRef.current < throttleMs) return;

    const { x: px, y: py, z: pz } = camera.position;
    let rx: number, ry: number, rz: number;

    if (frame) {
      // VR mode: viewer pose gives the correct head orientation in reference space.
      const refSpace = state.gl.xr.getReferenceSpace();
      if (!refSpace) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pose = (frame as any).getViewerPose(refSpace);
      if (!pose) return;
      _xrQuat.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w,
      );
      _xrEuler.setFromQuaternion(_xrQuat);
      rx = _xrEuler.x; ry = _xrEuler.y; rz = _xrEuler.z;
    } else {
      rx = camera.rotation.x; ry = camera.rotation.y; rz = camera.rotation.z;
    }

    const last = lastSentRef.current;
    const t = 0.001;
    if (
      Math.abs(px - last.position.x) < t &&
      Math.abs(py - last.position.y) < t &&
      Math.abs(pz - last.position.z) < t &&
      Math.abs(rx - last.rotation.x) < t &&
      Math.abs(ry - last.rotation.y) < t &&
      Math.abs(rz - last.rotation.z) < t
    ) return;

    cameraStateCache.position.x = px; cameraStateCache.position.y = py; cameraStateCache.position.z = pz;
    cameraStateCache.rotation.x = rx; cameraStateCache.rotation.y = ry; cameraStateCache.rotation.z = rz;
    last.position.x = px; last.position.y = py; last.position.z = pz;
    last.rotation.x = rx; last.rotation.y = ry; last.rotation.z = rz;
    lastEmitMsRef.current = now;

    socket.emit('camera-update', cameraStateCache);
  });

  // --- Audience: lerp camera position toward received state.
  //     Rotation is handled separately in Scene.tsx via quaternion slerp on
  //     'participant-rotation', which avoids Euler gimbal lock at extreme pitch.
  useFrame((_, delta) => {
    if (!camera || role !== 'audience' || !enabled || isUnlinked || !isInterpolating.current) return;

    const lerpFactor = Math.min(0.2 * Math.min(delta * 60, 1), 1);

    camera.position.x += (targetPosition.current.x - camera.position.x) * lerpFactor;
    camera.position.y += (targetPosition.current.y - camera.position.y) * lerpFactor;
    camera.position.z += (targetPosition.current.z - camera.position.z) * lerpFactor;

    const pd = Math.abs(targetPosition.current.x - camera.position.x)
             + Math.abs(targetPosition.current.y - camera.position.y)
             + Math.abs(targetPosition.current.z - camera.position.z);

    if (pd < 0.001) isInterpolating.current = false;
  });

  // --- Audience: receive camera updates from spectator
  useEffect(() => {
    if (!socket || role !== 'audience' || !enabled || (isUnlinked && effectiveViewType === 'audience')) return;

    const handleCameraUpdate = (data: CameraState) => {
      if (data) updateCamera(data);
    };

    socket.on('camera-update', handleCameraUpdate);
    isSubscribed.current = true;

    return () => {
      if (socket && isSubscribed.current) {
        socket.off('camera-update', handleCameraUpdate);
        isSubscribed.current = false;
      }
    };
  }, [socket, role, enabled, isUnlinked, effectiveViewType, updateCamera]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (socket && isSubscribed.current) {
        socket.off('camera-update');
        isSubscribed.current = false;
      }
    };
  }, [socket]);

  return { updateCamera, stopInterpolation, resetInterpolation, forceBroadcast };
}
