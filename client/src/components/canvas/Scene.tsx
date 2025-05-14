import { OrbitControls, Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Deck } from "./Deck";

export function Scene() {
  const { camera } = useThree();

  useEffect(() => {
    // Initial camera setup
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      {/* Environment and Controls */}
      <Environment preset="city" />
      <OrbitControls makeDefault />

      {/* Scene Content */}
      <Deck position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </>
  );
}
