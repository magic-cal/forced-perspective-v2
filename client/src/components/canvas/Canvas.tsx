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
        onCreated={({ gl }) => {
          glRef.current = gl;
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </R3FCanvas>
      <Loader />
    </>
  );
}
