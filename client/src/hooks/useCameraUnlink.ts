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
  sphereRadius: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  // Define fulcrum point on sphere edge (at spectator's eye level, Y=0)
  const fulcrumPoint = new THREE.Vector3(sphereRadius, 0, 0);
  
  // Calculate arc center and radius
  const arcCenter = fulcrumPoint.clone();
  const arcRadius = startPosition.distanceTo(arcCenter);
  
  // Calculate start and end angles in the XZ plane
  const startAngle = Math.atan2(
    startPosition.z - arcCenter.z,
    startPosition.x - arcCenter.x
  );
  const endAngle = startAngle + Math.PI; // 180° rotation
  
  // Interpolate angle based on progress
  const currentAngle = startAngle + (endAngle - startAngle) * progress;
  
  // Calculate new camera position on arc
  const newPosition = new THREE.Vector3(
    arcCenter.x + arcRadius * Math.cos(currentAngle),
    startPosition.y, // Maintain Y position
    arcCenter.z + arcRadius * Math.sin(currentAngle)
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

  // Animation frame handler
  useFrame(() => {
    if (!isAnimating || !animationRef.current) return;

    const elapsed = Date.now() - animationRef.current.startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easedProgress = easeInOutQuad(progress);

    if (animationRef.current.useCircularArc) {
      // Use circular arc movement
      const { position, lookAt } = calculateCameraArcMovement(
        easedProgress,
        animationRef.current.startPosition,
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

    // Calculate target position on the HORIZONTAL plane (XZ plane, Y stays constant)
    // This keeps the camera at the same height and moves it to the sphere edge
    const xzPosition = new THREE.Vector2(startPosition.x, startPosition.z);
    const xzDistance = xzPosition.length();
    
    // If we're at the center, pick a random point on the sphere
    const targetXZ = xzDistance > 0.1 
      ? xzPosition.normalize().multiplyScalar(sphereRadius)
      : new THREE.Vector2(
          sphereRadius * Math.cos(Math.random() * Math.PI * 2),
          sphereRadius * Math.sin(Math.random() * Math.PI * 2)
        );
    
    // Keep Y position constant (horizontal plane)
    const targetY = startPosition.y;
    
    const targetPosition = new THREE.Vector3(targetXZ.x, targetY, targetXZ.y);
    
    debug.camera(`Unlink target position: ${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}`);

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

  return {
    startUnlinkAnimation,
    isAnimating,
  };
}
