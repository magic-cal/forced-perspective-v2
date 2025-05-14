import {
  Environment as EnvironmentImpl,
  Lightformer,
  AccumulativeShadows,
  RandomizedLight,
  ContactShadows,
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
}

export function Environment({
  preset = "city",
  intensity = 1,
  blur = 0.65,
}: EnvironmentProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

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
      {/* Performance Optimizations */}
      <SoftShadows size={25} samples={16} focus={0.5} />
      <BakeShadows />

      {/* Main Directional Light */}
      <directionalLight
        ref={lightRef}
        position={[5, 5, 5]}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Fill Lights */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.2} />

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

      {/* Ground Shadows */}
      <AccumulativeShadows
        temporal
        frames={60}
        alphaTest={0.85}
        scale={20}
        position={[0, -0.5, 0]}
        color="black"
        opacity={0.8}
      >
        <RandomizedLight
          amount={8}
          radius={4}
          ambient={0.5}
          intensity={1}
          position={[5, 5, -10]}
          bias={0.001}
        />
      </AccumulativeShadows>

      {/* Contact Shadows for Objects */}
      <ContactShadows
        opacity={1}
        scale={20}
        blur={2}
        far={10}
        resolution={512}
        color="#000000"
      />
    </>
  );
}
