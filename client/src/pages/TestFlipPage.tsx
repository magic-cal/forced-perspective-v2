import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CardSphere } from "@/components/canvas/CardSphere";
import { TrickState } from "@/types/trick";

export function TestFlipPage() {
  const [trickState, setTrickState] = useState<TrickState>('setup');

  const handleTriggerFlip = () => {
    setTrickState('cards-flipping');
  };

  const handleReset = () => {
    setTrickState('setup');
    // Force a re-render by briefly unmounting
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75 }}
        style={{ background: '#1a1a2e' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Card Sphere */}
        <CardSphere 
          trickState={trickState}
          rotationSpeed={0.02}
          viewType="participant"
        />
        
        {/* Camera Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
        />
      </Canvas>

      {/* UI Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 1000,
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Card Flip Test</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Current State:</strong> {trickState}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button
            onClick={handleTriggerFlip}
            disabled={trickState !== 'setup'}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: trickState === 'setup' ? 'pointer' : 'not-allowed',
              background: trickState === 'setup' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Trigger Flip
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.8 }}>
          <p style={{ margin: '5px 0' }}>• Use mouse to orbit camera</p>
          <p style={{ margin: '5px 0' }}>• Scroll to zoom</p>
          <p style={{ margin: '5px 0' }}>• Initial: cards face inward (backs visible)</p>
          <p style={{ margin: '5px 0' }}>• After flip: cards face outward (faces visible)</p>
        </div>
      </div>
    </div>
  );
}
