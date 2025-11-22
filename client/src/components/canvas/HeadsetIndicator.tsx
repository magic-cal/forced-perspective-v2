import { useRef } from 'react';
import * as THREE from 'three';

interface HeadsetIndicatorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  visible: boolean;
}

export function HeadsetIndicator({ position, rotation, visible }: HeadsetIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - a box representing the headset */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Forward indicator - a cone pointing forward */}
      <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.5} />
      </mesh>

      {/* Side indicators - small spheres for the "lenses" */}
      <mesh position={[-0.12, 0, -0.08]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[0.12, 0, -0.08]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Top strap indicator */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#555555" />
      </mesh>

      {/* Ambient light to make it visible */}
      <pointLight position={[0, 0, 0]} intensity={0.5} distance={2} color="#ffffff" />
    </group>
  );
}
