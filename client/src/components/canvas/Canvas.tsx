import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { Scene } from "./Scene";
import { Loader } from "@react-three/drei";
import { useVisibility } from "@/hooks/useVisibility";

interface CanvasWrapperProps {
  className?: string;
}

export function Canvas({ className }: CanvasWrapperProps) {
  const { isVisible, requestAnimationFrame, cancelAnimationFrame } =
    useVisibility();
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!isVisible && glRef.current) {
      // Pause rendering when not visible
      glRef.current.setAnimationLoop(null);
    }
  }, [isVisible]);

  return (
    <>
      <R3FCanvas
        className={className}
        shadows
        dpr={[1, 2]} // Responsive pixel ratio
        camera={{
          fov: 45,
          near: 0.1,
          far: 200,
          position: [0, 2, 6],
        }}
        gl={{
          antialias: true,
          toneMapping: 3, // ACESFilmicToneMapping
          outputColorSpace: "srgb",
        }}
        onCreated={({ gl, camera }) => {
          glRef.current = gl;
          // Point camera at the horizon
          camera.lookAt(0, camera.position.y, 0);
        }}
      >
        <color attach="background" args={["#1a1a1a"]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </R3FCanvas>
      <Loader />
    </>
  );
}
