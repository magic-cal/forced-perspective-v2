import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface HeadsetIndicatorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  visible: boolean;
}

export function HeadsetIndicator({ position, rotation, visible }: HeadsetIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/src/objects/headsetModel/scene.gltf');
  
  // Scale to match the old geometric headset size (was scale 10 with 0.4 unit box)
  const headsetScale = 0.01;

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[headsetScale, headsetScale, headsetScale]}>
      {/* Rotate the model 180 degrees on Y axis to match orientation */}
      <group rotation={[0, Math.PI, 0]}>
        <primitive object={scene.clone()} />
      </group>
      {/* Add a subtle point light to ensure visibility */}
      <pointLight position={[0, 50, 0]} intensity={0.3} distance={200} color="#ffffff" />
    </group>
  );
}

// Preload the model
useGLTF.preload('/src/objects/headsetModel/scene.gltf');
