import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraAnimationConfig = {
  /** Duration of the animation in ms */
  duration?: number;
  /** Radius of the arc */
  radius?: number;
  /** Height of the arc */
  height?: number;
  /** Target position to look at */
  target?: [number, number, number];
  /** Easing function */
  easing?: (t: number) => number;
};

const DEFAULT_CONFIG = {
  duration: 3000,
  radius: 5,
  height: 2,
  target: [0, 0, 0] as [number, number, number],
  easing: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
} as const;

export function useCameraAnimation() {
  const { camera } = useThree();
  const animationRef = useRef<number>();
  const startTime = useRef<number>();
  const startPosition = useRef<THREE.Vector3>();
  const startQuaternion = useRef<THREE.Quaternion>();
  const targetQuaternion = useRef<THREE.Quaternion>();
  const onCompleteCallback = useRef<() => void>();

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  const startAnimation = useCallback((config: CameraAnimationConfig = {}) => {
    stopAnimation(); // Stop any existing animation
    
    const {
      duration,
      radius,
      height,
      target,
      easing,
    } = { ...DEFAULT_CONFIG, ...config };

    return new Promise<void>((resolve) => {
      startTime.current = performance.now();
      startPosition.current = camera.position.clone();
      startQuaternion.current = camera.quaternion.clone();
      onCompleteCallback.current = resolve;
      
      // Calculate target orientation
      const targetLookAt = new THREE.Vector3(...target);
      camera.lookAt(targetLookAt);
      targetQuaternion.current = camera.quaternion.clone();
      camera.quaternion.copy(startQuaternion.current); // Reset to original
      
      const animate = (currentTime: number) => {
        if (!startTime.current || !startPosition.current) return;
        
        const elapsed = currentTime - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easing(progress);
        
        // Calculate arc position
        const angle = easeProgress * Math.PI;
        const x = Math.sin(angle) * radius;
        const z = (Math.cos(angle) - 1) * radius;
        const y = Math.sin(angle) * height;
        
        // Apply position
        camera.position.set(
          startPosition.current.x + x,
          startPosition.current.y + y,
          startPosition.current.z + z
        );
        
        // Slerp between start and target rotation
        if (startQuaternion.current && targetQuaternion.current) {
          camera.quaternion.slerpQuaternions(
            startQuaternion.current,
            targetQuaternion.current,
            easeProgress
          );
        }
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (onCompleteCallback.current) {
          onCompleteCallback.current();
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    });
  }, [camera, stopAnimation]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return useMemo(() => ({
    startAnimation,
    stopAnimation,
    isAnimating: () => animationRef.current !== undefined,
  }), [startAnimation, stopAnimation]);
}
