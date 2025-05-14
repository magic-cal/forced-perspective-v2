import { OrbitControls, Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

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

      {/* Scene Content - Will be populated with cards and other 3D elements */}
      <group>
        {/* Temporary mesh to visualize the scene */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </group>
    </>
  );
}
