import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { Scene } from "./Scene";
import { Loader } from "@react-three/drei";
import { useVisibility } from "@/hooks/useVisibility";
import { XR } from "@react-three/xr";
import { xrStore } from "@/store/xrStore";

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
        dpr={[1, 2]}
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
          // Log WebGL context lost/restored events to help diagnose GPU/context issues
          try {
            const canvasEl = (gl as any).domElement as HTMLCanvasElement | undefined;
            if (canvasEl && canvasEl.addEventListener) {
              canvasEl.addEventListener('webglcontextlost', (ev) => {
                console.error('[Canvas] WebGL context lost', ev);
                // prevent default to allow restoring later
                try { ev.preventDefault(); } catch (e) {}
              });
              canvasEl.addEventListener('webglcontextrestored', () => {
                console.info('[Canvas] WebGL context restored');
              });
            }
          } catch (e) {
            // ignore environment without DOM
          }
        }}
      >
        <color attach="background" args={["#1a1a1a"]} />
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </XR>
      </R3FCanvas>
      <Loader />
    </>
  );
}
