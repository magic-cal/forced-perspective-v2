import {
  Environment as EnvironmentImpl,
  Lightformer,
  SoftShadows,
  BakeShadows,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface EnvironmentProps {
  preset?:
    | "sunset"
    | "dawn"
    | "night"
    | "warehouse"
    | "forest"
    | "apartment"
    | "studio"
    | "city"
    | "park"
    | "lobby";
  intensity?: number;
  blur?: number;
  enableShadows?: boolean;
}

export function Environment({
  preset = "city",
  intensity = 1,
  blur = 0.65,
  enableShadows = true,
}: EnvironmentProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  // Animate the main light to create subtle movement
  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.position.x = Math.sin(time * 0.2) * 4;
      lightRef.current.position.z = Math.cos(time * 0.2) * 4;
    }
  });

  return (
    <>
      {enableShadows && <SoftShadows size={25} samples={16} focus={0.5} />}
      {enableShadows && <BakeShadows />}

      {/* Main Omni-directional Light */}
      <pointLight
        ref={lightRef}
        position={[0, 5, 0]}
        intensity={intensity * 2}
        distance={20}
        decay={2}
        castShadow={enableShadows}
        shadow-mapSize-width={enableShadows ? 2048 : 512}
        shadow-mapSize-height={enableShadows ? 2048 : 512}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Ambient Light for general illumination */}
      <ambientLight intensity={0.4} />

      {/* Environment Setup */}
      <EnvironmentImpl preset={preset} background blur={blur}>
        <Lightformer
          position={[-5, 2, -1]}
          scale={[10, 2, 1]}
          intensity={4}
          color="white"
        />
        <Lightformer
          position={[5, 0, -5]}
          scale={[10, 2, 1]}
          intensity={4}
          color="white"
          rotation-y={Math.PI / 2}
        />
      </EnvironmentImpl>
    </>
  );
}
