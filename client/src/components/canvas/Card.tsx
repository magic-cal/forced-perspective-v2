import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Card: THREE.Mesh;
  };
  materials: {
    CardMaterial: THREE.MeshStandardMaterial;
  };
};

interface CardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  suit?: "hearts" | "diamonds" | "clubs" | "spades";
  value?: string;
  isFlipped?: boolean;
  onClick?: () => void;
}

export function Card({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  suit = "hearts",
  value = "A",
  isFlipped = false,
  onClick,
}: CardProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Temporary box geometry until we have the card model
  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[2.5, 3.5, 0.01]} />{" "}
        {/* Standard card proportions */}
        <meshStandardMaterial
          // color={hovered ? "#888888" : ""}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}
