import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useSocket } from '@/sockets/SocketProvider';
import { useGameStore } from '@/store/gameStore';

type CameraState = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
};

// Reusable state object to avoid allocations
const cameraStateCache: CameraState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

type CameraSyncOptions = {
  /** Whether to enable camera syncing */
  enabled?: boolean;
  /** Throttle interval in ms for camera updates */
  throttleMs?: number;
  /** Whether the camera is unlinked (disables sync for audience) */
  isUnlinked?: boolean;
  /** View type to determine sync behavior */
  viewType?: 'participant' | 'audience';
};

/**
 * Hook to sync camera position/rotation between spectator and audience
 * @returns Methods to control camera syncing
 */
export function useCameraSync(options: CameraSyncOptions = {}) {
  const { enabled = true, throttleMs = 50, isUnlinked = false, viewType } = options;
  const { camera, gl } = useThree();
  const socket = useSocket();
  const role = useGameStore((s) => s.role);
  const isSubscribed = useRef(false);
  
  // Determine effective view type from role if not explicitly provided
  const effectiveViewType = viewType ?? (role === 'spectator' ? 'participant' : 'audience');

  // Smooth interpolation refs for audience
  // Initialize with camera's current position/rotation to avoid jumping
  const targetPosition = useRef({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
  const targetRotation = useRef({ x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z });
  const isInterpolating = useRef(false);

  // Throttled camera update function with smooth interpolation
  const updateCamera = useCallback((data: CameraState) => {
    targetPosition.current = { ...data.position };
    targetRotation.current = { ...data.rotation };
    isInterpolating.current = true;
  }, []);

  // Stop interpolation immediately
  const stopInterpolation = useCallback(() => {
    isInterpolating.current = false;
  }, []);

  // Smooth interpolation loop for audience
  useEffect(() => {
    // Don't interpolate if unlinked (camera is controlled by unlink animation)
    if (!camera || role !== 'audience' || !enabled || isUnlinked) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const interpolateCamera = (currentTime: number) => {
      if (isInterpolating.current) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Smooth lerp factor (adjust for responsiveness vs smoothness)
        const lerpFactor = Math.min(0.2 * Math.min(deltaTime * 60, 1), 1);

        // Interpolate position
        camera.position.x += (targetPosition.current.x - camera.position.x) * lerpFactor;
        camera.position.y += (targetPosition.current.y - camera.position.y) * lerpFactor;
        camera.position.z += (targetPosition.current.z - camera.position.z) * lerpFactor;

        // Interpolate rotation
        camera.rotation.x += (targetRotation.current.x - camera.rotation.x) * lerpFactor;
        camera.rotation.y += (targetRotation.current.y - camera.rotation.y) * lerpFactor;
        camera.rotation.z += (targetRotation.current.z - camera.rotation.z) * lerpFactor;

        // Check if we're close enough to stop interpolating
        const positionDiff = Math.abs(targetPosition.current.x - camera.position.x) +
                            Math.abs(targetPosition.current.y - camera.position.y) +
                            Math.abs(targetPosition.current.z - camera.position.z);
        const rotationDiff = Math.abs(targetRotation.current.x - camera.rotation.x) +
                            Math.abs(targetRotation.current.y - camera.rotation.y) +
                            Math.abs(targetRotation.current.z - camera.rotation.z);

        if (positionDiff < 0.001 && rotationDiff < 0.001) {
          isInterpolating.current = false;
        }
      }

      animationFrameId = requestAnimationFrame(interpolateCamera);
    };

    animationFrameId = requestAnimationFrame(interpolateCamera);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camera, role, enabled, isUnlinked]);

  // Handle camera updates from socket
  useEffect(() => {
    // Don't sync if unlinked and we're the audience
    if (!socket || role !== 'audience' || !enabled || (isUnlinked && effectiveViewType === 'audience')) {
      return;
    }

    const handleCameraUpdate = (data: CameraState) => {
      if (!data) return;
      try {
        updateCamera(data);
      } catch (error) {
        console.error('Error updating camera:', error);
      }
    };

    // Use single consistent event name
    socket.on('camera-update', handleCameraUpdate);
    
    isSubscribed.current = true;
    console.log('[Camera Sync] Audience listening for camera updates');

    return () => {
      if (socket && isSubscribed.current) {
        socket.off('camera-update', handleCameraUpdate);
        isSubscribed.current = false;
      }
    };
  }, [socket, role, enabled, isUnlinked, effectiveViewType, updateCamera]);

  // Broadcast camera updates (spectator/participant only)
  useEffect(() => {
    if (!socket || role !== 'spectator' || !enabled || effectiveViewType !== 'participant') {
      return;
    }

    // Track last sent values to avoid unnecessary updates
    let lastSentPosition = { x: 0, y: 0, z: 0 };
    let lastSentRotation = { x: 0, y: 0, z: 0 };
    const threshold = 0.001; // Minimum change to trigger update

    const handleCameraChange = () => {
      if (!socket) return;
      
      // Check if camera has changed significantly
      const positionChanged = 
        Math.abs(camera.position.x - lastSentPosition.x) > threshold ||
        Math.abs(camera.position.y - lastSentPosition.y) > threshold ||
        Math.abs(camera.position.z - lastSentPosition.z) > threshold;
      
      const rotationChanged = 
        Math.abs(camera.rotation.x - lastSentRotation.x) > threshold ||
        Math.abs(camera.rotation.y - lastSentRotation.y) > threshold ||
        Math.abs(camera.rotation.z - lastSentRotation.z) > threshold;

      if (!positionChanged && !rotationChanged) {
        return; // Skip update if no significant change
      }

      // Reuse cache object to avoid allocations
      cameraStateCache.position.x = camera.position.x;
      cameraStateCache.position.y = camera.position.y;
      cameraStateCache.position.z = camera.position.z;
      cameraStateCache.rotation.x = camera.rotation.x;
      cameraStateCache.rotation.y = camera.rotation.y;
      cameraStateCache.rotation.z = camera.rotation.z;

      // Update last sent values
      lastSentPosition = { ...cameraStateCache.position };
      lastSentRotation = { ...cameraStateCache.rotation };
      
      // Use consistent event name
      socket.emit('camera-update', cameraStateCache);
    };

    // Initial update immediately
    console.log('[Camera Sync] Spectator starting camera broadcast');
    handleCameraChange();
    
    // Use requestAnimationFrame for smoother updates tied to render loop
    let animationFrameId: number;
    let lastUpdateTime = 0;

    const updateLoop = (currentTime: number) => {
      if (currentTime - lastUpdateTime >= throttleMs) {
        handleCameraChange();
        lastUpdateTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camera, gl, role, socket, enabled, throttleMs, effectiveViewType]);

  // Cleanup on unmount or when syncing is disabled
  useEffect(() => {
    return () => {
      if (socket && isSubscribed.current) {
        socket.off('camera-update');
        isSubscribed.current = false;
      }
    };
  }, [socket]);

  return {
    /**
     * Manually trigger a camera update
     */
    updateCamera,
    /**
     * Stop camera interpolation immediately
     */
    stopInterpolation,
  };
}
