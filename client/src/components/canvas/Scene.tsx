import { OrbitControls, Preload } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Deck } from "./Deck";
import { Environment } from "./Environment";

export function Scene() {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Initial camera setup
    camera.lookAt(0, 0, 0);

    // Enable shadow mapping
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  // Subtle rotation animation for the entire scene
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <>
      {/* Performance Optimizations */}
      <Preload all />

      {/* Environment and Lighting */}
      <Environment preset="city" intensity={1} blur={0.65} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={20}
      />

      {/* Scene Content */}
      <group ref={groupRef}>
        <Deck position={[0, 0, 0]} rotation={[0, 0, 0]} />
      </group>
    </>
  );
}
