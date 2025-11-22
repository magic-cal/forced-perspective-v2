import { Canvas } from "@/components/canvas/Canvas";
import { Interface } from "@/components/dom/Interface";
import { Menu } from "@/components/dom/Menu";
import { TrickControls } from "@/components/dom/TrickControls";
import { useGameStore } from "@/store/gameStore";

export default function App() {
  const role = useGameStore((s) => s.role);
  
  return (
    <main className="app-container">
      {/* R3F Canvas - 3D Content */}
      <Canvas className="canvas" />

      {/* DOM Content - UI Overlay */}
      <Interface />
      <Menu />
      
      {/* Trick Controls - Only visible to magician */}
      {role === 'magician' && <TrickControls />}

      <style>{`
        .app-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .canvas {
          position: fixed !important;
          top: 0;
          left: 0;
          width: 100% !important;
          height: 100% !important;
          background: transparent;
        }
      `}</style>
    </main>
  );
}
