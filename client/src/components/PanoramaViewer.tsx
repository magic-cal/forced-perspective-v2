import { useTexture } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { BackSide, Mesh } from 'three';

export default function PanoramaViewer() {
  const meshRef = useRef<Mesh>(null);
  const [texture] = useTexture(['/src/assets/Trafalgar_Square.jpg']);

  useEffect(() => {
    console.log('Texture loaded:', texture);
  }, [texture]);

  return (
    <group>
      <ambientLight intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[50, 60, 40]} />
        <meshStandardMaterial 
          map={texture} 
          side={BackSide} 
          color={0xffffff}
          opacity={1}
          transparent={false}
        />
      </mesh>
    </group>
  );
}
