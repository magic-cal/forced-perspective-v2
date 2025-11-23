import { useCallback, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TRICK_CONFIG } from '@/config/trick';
import { debug } from '@/config/debug';

interface CameraUnlinkOptions {
  sphereRadius?: number;
  animationDuration?: number;
  onComplete?: () => void;
  useCircularArc?: boolean; // Enable circular arc movement
}

// Easing function: easeInOutQuad
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Calculate camera position along circular arc
function calculateCameraArcMovement(
  progress: number,
  startPosition: THREE.Vector3,
  targetPosition: THREE.Vector3,
  sphereRadius: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  // Define fulcrum point at the center (where the sphere is)
  const fulcrumPoint = new THREE.Vector3(0, startPosition.y, 0);
  
  // Calculate arc center and radius based on start and target positions
  const arcCenter = fulcrumPoint.clone();
  const startRadius = startPosition.distanceTo(arcCenter);
  const targetRadius = targetPosition.distanceTo(arcCenter);
  
  // Interpolate radius to move away from center
  const currentRadius = startRadius + (targetRadius - startRadius) * progress;
  
  // Calculate start and end angles in the XZ plane
  const startAngle = Math.atan2(
    startPosition.z - arcCenter.z,
    startPosition.x - arcCenter.x
  );
  const endAngle = startAngle + Math.PI; // 180° rotation
  
  // Interpolate angle based on progress
  const currentAngle = startAngle + (endAngle - startAngle) * progress;
  
  // Calculate new camera position on arc with interpolated radius
  const newPosition = new THREE.Vector3(
    arcCenter.x + currentRadius * Math.cos(currentAngle),
    startPosition.y, // Maintain Y position
    arcCenter.z + currentRadius * Math.sin(currentAngle)
  );
  
  return { position: newPosition, lookAt: fulcrumPoint };
}

export function useCameraUnlink(options: CameraUnlinkOptions = {}) {
  const {
    sphereRadius = TRICK_CONFIG.CAMERA.sphereRadius,
    animationDuration = TRICK_CONFIG.ANIMATION_DURATIONS.cameraUnlink,
    onComplete,
    useCircularArc = true, // Default to circular arc movement
  } = options;

  const { camera } = useThree();
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<{
    startTime: number;
    startPosition: THREE.Vector3;
    startRotation: THREE.Euler;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Euler;
    useCircularArc: boolean;
  } | null>(null);
  
  // Store the initial camera state to prevent jumping
  const initialCameraState = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
  } | null>(null);

  // Animation frame handler
  useFrame(() => {
    if (!isAnimating || !animationRef.current) return;

    const elapsed = Date.now() - animationRef.current.startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easedProgress = easeInOutQuad(progress);

    if (animationRef.current.useCircularArc) {
      // Use circular arc movement with distance interpolation
      const { position, lookAt } = calculateCameraArcMovement(
        easedProgress,
        animationRef.current.startPosition,
        animationRef.current.targetPosition,
        sphereRadius
      );
      
      camera.position.copy(position);
      camera.lookAt(lookAt);
    } else {
      // Use linear interpolation (legacy behavior)
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
    }

    // Check if animation is complete
    if (progress >= 1) {
      // Ensure final position is set exactly to prevent any drift
      if (animationRef.current.useCircularArc) {
        const finalPosition = animationRef.current.targetPosition.clone();
        const finalLookAt = new THREE.Vector3(0, animationRef.current.targetPosition.y, 0);
        
        camera.position.copy(finalPosition);
        camera.lookAt(finalLookAt);
        
        debug.camera(`Final camera position: ${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)}`);
      } else {
        camera.position.copy(animationRef.current.targetPosition);
        camera.quaternion.setFromEuler(animationRef.current.targetRotation);
      }
      
      setIsAnimating(false);
      animationRef.current = null;
      initialCameraState.current = null; // Reset for next animation
      debug.camera('Camera unlink animation complete');
      onComplete?.();
    }
  });

  const captureInitialState = useCallback(() => {
    // Capture the camera state before any animation starts
    initialCameraState.current = {
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
    };
    debug.camera(`Captured initial camera state: pos(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
  }, [camera]);

  const startUnlinkAnimation = useCallback(async () => {
    debug.camera('Starting camera unlink animation');

    // If initial state wasn't captured, capture it now
    if (!initialCameraState.current) {
      captureInitialState();
    }

    // Use the frozen initial state as the starting point
    const startPosition = initialCameraState.current!.position.clone();
    const startRotation = initialCameraState.current!.rotation.clone();

    // Calculate target position on the HORIZONTAL plane (XZ plane, Y stays constant)
    // Move camera further back for better view - use 2x the sphere radius
    const targetDistance = sphereRadius * 2;
    const xzPosition = new THREE.Vector2(startPosition.x, startPosition.z);
    const xzDistance = xzPosition.length();
    
    // If we're at the center, pick a random point on the sphere
    const targetXZ = xzDistance > 0.1 
      ? xzPosition.normalize().multiplyScalar(targetDistance)
      : new THREE.Vector2(
          targetDistance * Math.cos(Math.random() * Math.PI * 2),
          targetDistance * Math.sin(Math.random() * Math.PI * 2)
        );
    
    // Keep Y position constant (horizontal plane)
    const targetY = startPosition.y;
    
    const targetPosition = new THREE.Vector3(targetXZ.x, targetY, targetXZ.y);
    
    debug.camera(`Unlink start position: ${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)}`);
    debug.camera(`Unlink target position: ${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}`);

    // Calculate target rotation: looking at the center of the sphere
    const targetRotation = new THREE.Euler();
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(targetPosition, new THREE.Vector3(0, targetY, 0), new THREE.Vector3(0, 1, 0));
    targetRotation.setFromRotationMatrix(lookAtMatrix);

    // Set up animation
    animationRef.current = {
      startTime: Date.now(),
      startPosition,
      startRotation,
      targetPosition,
      targetRotation,
      useCircularArc,
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

  const resetUnlinkState = useCallback(() => {
    initialCameraState.current = null;
    animationRef.current = null;
    setIsAnimating(false);
    debug.camera('Camera unlink state reset');
  }, []);

  return {
    startUnlinkAnimation,
    captureInitialState,
    resetUnlinkState,
    isAnimating,
  };
}
