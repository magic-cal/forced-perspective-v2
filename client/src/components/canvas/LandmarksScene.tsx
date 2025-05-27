import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function LandmarksScene() {
  const { camera } = useThree();
  const sceneRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Position camera in the center
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
  }, [camera]);

  return (
    <>
      {/* Skybox/Environment */}
      <mesh>
        <sphereGeometry args={[500, 60, 40]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          color={"red"}

          //   map={new THREE.TextureLoader().load(
          //     "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/2294472375_24a3b8ef46_o.jpg"
          //   )}
        />
      </mesh>

      {/* Ground plane for reference */}
      {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh> */}

      {/* Ambient light for basic illumination */}
      <ambientLight intensity={0.5} />

      {/* Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  );
}
