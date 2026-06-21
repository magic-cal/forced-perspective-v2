import { useMemo, useRef, useEffect } from 'react';
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

  const opacityRef = useRef(0);
  const materialsRef = useRef<THREE.Material[]>([]);

  // Collect all materials and set them transparent so opacity can be animated
  useEffect(() => {
    const mats: THREE.Material[] = [];
    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const ms: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        ms.forEach((m) => {
          m.transparent = true;
          m.opacity = 0;
          mats.push(m);
        });
      }
    });
    materialsRef.current = mats;
    opacityRef.current = 0;
  }, [clonedScene]);

  useFrame((_, delta) => {
    if (groupRef.current && quaternionRef.current) {
      groupRef.current.quaternion.copy(quaternionRef.current);
    }

    // Fade in over ~2 seconds from first mount
    if (opacityRef.current < 1) {
      opacityRef.current = Math.min(1, opacityRef.current + delta / 2);
      const o = opacityRef.current;
      materialsRef.current.forEach((m) => { m.opacity = o; });
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
