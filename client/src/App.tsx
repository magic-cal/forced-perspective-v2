import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "@/components/canvas/Scene";
import { Interface } from "@/components/dom/Interface";

export default function App() {
  return (
    <>
      {/* R3F Canvas - 3D Content */}
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 200,
          position: [0, 2, 6],
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* DOM Content - UI Overlay */}
      <Interface />
    </>
  );
}
