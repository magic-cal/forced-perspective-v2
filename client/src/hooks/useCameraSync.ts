import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useSocket } from '@/sockets/SocketProvider';
import { useGameStore } from '@/store/gameStore';
import * as THREE from 'three';

type CameraState = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
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

  // Throttled camera update function
  const updateCamera = useCallback((data: CameraState) => {
    camera.position.set(data.position.x, data.position.y, data.position.z);
    camera.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
  }, [camera]);

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

    // Listen for both direct and broadcast updates
    socket.off('camera-update');
    socket.off('broadcast-camera-update');
    
    socket.on('camera-update', handleCameraUpdate);
    socket.on('broadcast-camera-update', handleCameraUpdate);
    
    isSubscribed.current = true;

    return () => {
      if (socket && isSubscribed.current) {
        socket.off('camera-update', handleCameraUpdate);
        socket.off('broadcast-camera-update', handleCameraUpdate);
        isSubscribed.current = false;
      }
    };
  }, [socket, role, enabled, isUnlinked, effectiveViewType, updateCamera]);

  // Broadcast camera updates (spectator/participant only)
  useEffect(() => {
    if (!socket || role !== 'spectator' || !enabled || effectiveViewType !== 'participant') {
      return;
    }

    const handleCameraChange = () => {
      if (!socket) return;
      
      const state: CameraState = {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
      };
      
      // Use a different event name for broadcasting to avoid echo
      socket.emit('broadcast-camera-update', state);
    };

    // Throttle camera updates
    const throttledUpdate = throttle(handleCameraChange, throttleMs);
    
    // Initial update
    handleCameraChange();
    
    // Update on pointer move
    gl.domElement.addEventListener('pointermove', throttledUpdate);
    
    return () => {
      gl.domElement.removeEventListener('pointermove', throttledUpdate);
      throttledUpdate.cancel();
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
  };
}

// Throttle implementation
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;

  const throttled = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        Math.max(0, limit - (Date.now() - lastRan))
      );
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (lastFunc) clearTimeout(lastFunc);
    inThrottle = false;
  };

  return throttled;
}
