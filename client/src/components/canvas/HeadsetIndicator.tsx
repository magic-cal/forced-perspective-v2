import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface HeadsetIndicatorProps {
  position: [number, number, number];
  quaternionRef: React.RefObject<THREE.Quaternion>;
}

export function HeadsetIndicator({ position, quaternionRef }: HeadsetIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/src/objects/headsetModel/scene.gltf');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    if (groupRef.current && quaternionRef.current) {
      groupRef.current.quaternion.copy(quaternionRef.current);
    }
  });

  return (
    <group ref={groupRef} position={position} scale={0.01}>
      {/* Model faces +Z by default; rotate 180° on Y so it faces inward toward audience */}
      <group rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
      <pointLight position={[0, 50, 0]} intensity={0.3} distance={200} color="#ffffff" />
    </group>
  );
}

useGLTF.preload('/src/objects/headsetModel/scene.gltf');
