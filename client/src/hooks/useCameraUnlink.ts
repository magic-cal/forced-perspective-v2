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

// Stronger ease than quad — more pronounced slow in/out
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface AnimState {
  startTime: number;
  startPosition: THREE.Vector3;
  startRadius: number; // XZ distance from centre at start
  targetRadius: number; // XZ distance from centre at end (sphereRadius * 3)
  startAngle: number;  // XZ angle (atan2) of start position
  orbitY: number;      // Y stays constant throughout
}

// Reusable to avoid per-frame allocations
const _lookTarget = new THREE.Vector3();

export function useCameraUnlink(options: CameraUnlinkOptions = {}) {
  const {
    sphereRadius = TRICK_CONFIG.CAMERA.sphereRadius,
    animationDuration = TRICK_CONFIG.ANIMATION_DURATIONS.cameraUnlink,
    onComplete,
  } = options;

  const { camera } = useThree();
  const [isAnimating, setIsAnimating] = useState(false);
  const animRef = useRef<AnimState | null>(null);

  useFrame(() => {
    if (!isAnimating || !animRef.current) return;

    const { startTime, startRadius, targetRadius, startAngle, orbitY } = animRef.current;
    const elapsed = Date.now() - startTime;
    const rawProgress = Math.min(elapsed / animationDuration, 1);
    const t = easeInOutCubic(rawProgress);

    // Radius and angle interpolate simultaneously over the same eased t —
    // single fluid arc that sweeps outward as it rotates. No phase kink.
    const currentRadius = startRadius + (targetRadius - startRadius) * t;
    const currentAngle  = startAngle + Math.PI * t; // 0 → 180°

    camera.position.set(
      currentRadius * Math.cos(currentAngle),
      orbitY,
      currentRadius * Math.sin(currentAngle),
    );

    // Always face the sphere centre — cards stay in view for the entire sweep
    _lookTarget.set(0, orbitY, 0);
    camera.lookAt(_lookTarget);

    if (rawProgress >= 1) {
      debug.camera(`Unlink complete — pos: ${camera.position.toArray().map(v => v.toFixed(1)).join(', ')}`);
      animRef.current = null;
      setIsAnimating(false);
      onComplete?.();
    }
  });

  const startUnlinkAnimation = useCallback(async () => {
    debug.camera('Starting camera unlink animation');

    const startPosition = camera.position.clone();
    const xzVec = new THREE.Vector2(startPosition.x, startPosition.z);
    const xzDist = xzVec.length();
    const targetDistance = sphereRadius * 3;

    // Start angle: use XZ direction of current position.
    // If near origin (spectator was at centre), fall back to camera's look direction.
    let startAngle: number;
    if (xzDist > 0.1) {
      startAngle = Math.atan2(startPosition.z, startPosition.x);
    } else {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      startAngle = Math.atan2(fwd.z, fwd.x);
    }

    debug.camera(`Unlink — startAngle: ${(startAngle * 180 / Math.PI).toFixed(1)}°  startR: ${xzDist.toFixed(1)}  targetR: ${targetDistance}`);

    animRef.current = {
      startTime: Date.now(),
      startPosition,
      startRadius: xzDist,
      targetRadius: targetDistance,
      startAngle,
      orbitY: startPosition.y,
    };
    setIsAnimating(true);

    return new Promise<void>((resolve) => {
      const poll = () => {
        if (!animRef.current) resolve();
        else requestAnimationFrame(poll);
      };
      poll();
    });
  }, [camera, sphereRadius, onComplete]);

  // Kept for API compatibility — start position is now captured at animation start
  const captureInitialState = useCallback(() => {}, []);

  const resetUnlinkState = useCallback(() => {
    animRef.current = null;
    setIsAnimating(false);
    debug.camera('Camera unlink state reset');
  }, []);

  return { startUnlinkAnimation, captureInitialState, resetUnlinkState, isAnimating };
}
