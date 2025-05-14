import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Scene } from "./Scene";
import { Loader } from "@react-three/drei";

interface CanvasWrapperProps {
  className?: string;
}

export function Canvas({ className }: CanvasWrapperProps) {
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
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </R3FCanvas>
      <Loader />
    </>
  );
}
