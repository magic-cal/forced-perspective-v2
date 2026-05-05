import { Canvas } from "@/components/canvas/Canvas";
import { Interface } from "@/components/dom/Interface";
import { Menu } from "@/components/dom/Menu";
import { TrickControls } from "@/components/dom/TrickControls";
import { SHOW_DEBUG_UI } from "@/config/debug";
import { useGameStore } from "@/store/gameStore";
import { useTrickSync } from "@/hooks/useTrickSync";

export default function App() {
  const role = useGameStore((s) => s.role);
  
  // Synchronize trick state across all clients
  useTrickSync();
  
  return (
    <main className="app-container">
      {/* R3F Canvas - 3D Content (skip for magician) */}
      {role !== 'magician' && <Canvas className="canvas" />}

      {/* DOM Content - UI Overlay */}
      <Interface />
      {SHOW_DEBUG_UI && <Menu />}

      {/* Trick Controls - shown only in dev/debug UI */}
      {SHOW_DEBUG_UI && <TrickControls />}

      <style>{`
        .app-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: ${role === 'magician' ? '#808080' : 'transparent'};
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
