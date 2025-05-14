import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CardAnimationProps {
  flipDuration?: number;
  hoverHeight?: number;
}

export function useCardAnimation({
  flipDuration = 0.5,
  hoverHeight = 0.5,
}: CardAnimationProps = {}) {
  const animationRef = useRef({
    isFlipping: false,
    flipProgress: 0,
    targetRotation: new THREE.Euler(),
    initialRotation: new THREE.Euler(),
    isHovering: false,
    hoverProgress: 0,
  });

  useFrame((_, delta) => {
    const anim = animationRef.current;

    // Update flip animation
    if (anim.isFlipping) {
      anim.flipProgress += delta / flipDuration;
      if (anim.flipProgress >= 1) {
        anim.isFlipping = false;
        anim.flipProgress = 1;
      }
    }

    // Update hover animation
    if (anim.isHovering && anim.hoverProgress < 1) {
      anim.hoverProgress = Math.min(1, anim.hoverProgress + delta * 4);
    } else if (!anim.isHovering && anim.hoverProgress > 0) {
      anim.hoverProgress = Math.max(0, anim.hoverProgress - delta * 4);
    }
  });

  const startFlip = (group: THREE.Group) => {
    const anim = animationRef.current;
    anim.isFlipping = true;
    anim.flipProgress = 0;
    anim.initialRotation.copy(group.rotation);
    anim.targetRotation.set(
      group.rotation.x,
      group.rotation.y + Math.PI,
      group.rotation.z
    );
  };

  const setHovering = (hovering: boolean) => {
    animationRef.current.isHovering = hovering;
  };

  return {
    startFlip,
    setHovering,
    animationRef,
  };
}
