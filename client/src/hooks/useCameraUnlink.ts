import { useCallback, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TRICK_CONFIG } from '@/config/trick';
import { debug } from '@/config/debug';

interface CameraUnlinkOptions {
  sphereRadius?: number;
  animationDuration?: number;
  onComplete?: () => void;
}

// Easing function: easeInOutQuad
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function useCameraUnlink(options: CameraUnlinkOptions = {}) {
  const {
    sphereRadius = TRICK_CONFIG.CAMERA.sphereRadius,
    animationDuration = TRICK_CONFIG.ANIMATION_DURATIONS.cameraUnlink,
    onComplete,
  } = options;

  const { camera } = useThree();
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<{
    startTime: number;
    startPosition: THREE.Vector3;
    startRotation: THREE.Euler;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Euler;
  } | null>(null);

  // Animation frame handler
  useFrame(() => {
    if (!isAnimating || !animationRef.current) return;

    const elapsed = Date.now() - animationRef.current.startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easedProgress = easeInOutQuad(progress);

    // Interpolate position
    camera.position.lerpVectors(
      animationRef.current.startPosition,
      animationRef.current.targetPosition,
      easedProgress
    );

    // Interpolate rotation
    const startQuat = new THREE.Quaternion().setFromEuler(animationRef.current.startRotation);
    const targetQuat = new THREE.Quaternion().setFromEuler(animationRef.current.targetRotation);
    const currentQuat = new THREE.Quaternion().slerpQuaternions(startQuat, targetQuat, easedProgress);
    camera.quaternion.copy(currentQuat);

    // Check if animation is complete
    if (progress >= 1) {
      setIsAnimating(false);
      animationRef.current = null;
      debug.camera('Camera unlink animation complete');
      onComplete?.();
    }
  });

  const startUnlinkAnimation = useCallback(async () => {
    debug.camera('Starting camera unlink animation');

    // Store current camera state
    const startPosition = camera.position.clone();
    const startRotation = camera.rotation.clone();

    // Calculate target position on XY plane at sphere edge
    // Project current position onto XY plane
    const xyPosition = new THREE.Vector2(startPosition.x, startPosition.y);
    const xyDistance = xyPosition.length();
    
    // If we're at the center, use a default direction
    const targetXY = xyDistance > 0.1 
      ? xyPosition.normalize().multiplyScalar(-sphereRadius)
      : new THREE.Vector2(sphereRadius, 0);
    
    // Maintain similar Z height to avoid going through sphere
    // Use a small offset to ensure we're outside the sphere
    const targetZ = Math.abs(startPosition.z) < 1 ? 1 : startPosition.z;
    
    const targetPosition = new THREE.Vector3(targetXY.x, targetXY.y, targetZ);
    
    debug.camera(`Unlink target position: ${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}`);

    // Calculate target rotation: looking at the center of the sphere
    const targetRotation = new THREE.Euler();
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(targetPosition, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    targetRotation.setFromRotationMatrix(lookAtMatrix);

    // Set up animation
    animationRef.current = {
      startTime: Date.now(),
      startPosition,
      startRotation,
      targetPosition,
      targetRotation,
    };

    setIsAnimating(true);

    // Return a promise that resolves when animation completes
    return new Promise<void>((resolve) => {
      const checkComplete = () => {
        if (!isAnimating) {
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };
      checkComplete();
    });
  }, [camera, sphereRadius, isAnimating, onComplete]);

  return {
    startUnlinkAnimation,
    isAnimating,
  };
}
