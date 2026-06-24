import { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BackSide } from 'three';
import { LANDMARKS } from '@/config/landmarks';
import { useSocket } from '@/sockets/SocketProvider';


/**
 * LandmarkGallery displays a sequence of panoramas (images/videos) inside a large sphere.
 * Controls (next/prev) are provided via socket for synchronizing between magician/spectator and audience.
 */
export function LandmarkGallery({
  onFinish,
  indexEvent = 'landmark-index',
  finishEvent = 'landmark-finish',
  showProgress = false,
}: {
  onFinish?: () => void;
  indexEvent?: string;
  finishEvent?: string;
  showProgress?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const socket = useSocket();
  const { gl } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

  // Load current texture with graceful error handling
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [displayMode, setDisplayMode] = useState<'spherical' | 'flat'>('spherical');
  // Keep a ref to the last texture so we can dispose it when replacing to free GPU memory
  const lastTextureRef = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();

    const applyTexture = (tex: THREE.Texture) => {
      if (!active) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      // Panoramas don't benefit from mipmaps — disable them and use LinearFilter for
      // sharper sampling. Max anisotropy reduces blurring at oblique viewing angles.
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = maxAnisotropy;
      tex.needsUpdate = true;
      const img = tex.image as HTMLImageElement;
      const ratio = img ? img.naturalWidth / img.naturalHeight : 2;
      setDisplayMode(ratio >= 1.9 && ratio <= 2.1 ? 'spherical' : 'flat');
      const prev = lastTextureRef.current;
      lastTextureRef.current = tex;
      setTexture(tex);
      try { if (prev && prev !== tex) prev.dispose(); } catch (_) {}
    };

    loader.load(
      LANDMARKS[index].src,
      applyTexture,
      undefined,
      (err) => {
        console.error('Landmark image load error:', LANDMARKS[index].src, err);
        loader.load('/src/assets/house.jpg', applyTexture, undefined, () => {
          if (active) setTexture(null);
        });
      },
    );

    return () => { active = false; };
  }, [index, maxAnisotropy]);

  // Receive index updates driven by TrickControls (magician) — pure receiver, never re-emits
  useEffect(() => {
    if (!socket) return undefined;
    const handleSetIndex = (data: { index: number }) => {
      setIndex(Math.max(0, Math.min(LANDMARKS.length - 1, data.index)));
    };
    socket.on(indexEvent, handleSetIndex);
    return () => socket.off(indexEvent, handleSetIndex);
  }, [socket]);

  // Listen for remote finish events
  useEffect(() => {
    if (!socket) return undefined;

    const handleFinish = (data: { senderId?: string }) => {
      if (data.senderId && socket.id && data.senderId === socket.id) return;
      if (onFinish) onFinish();
    };

    socket.on(finishEvent, handleFinish);
    return () => socket.off(finishEvent, handleFinish);
  }, [socket, onFinish]);

  // Cleanup on unmount in case the texture was left allocated
  useEffect(() => {
    return () => {
      try {
        if (lastTextureRef.current) {
          lastTextureRef.current.dispose();
          lastTextureRef.current = null;
        }
      } catch (e) { }
    };
  }, []);

  return (
    <group>
      {displayMode === 'spherical' ? (
        // key forces a new material whenever the texture changes — meshBasicMaterial
        // needs shader recompilation (USE_MAP define) when going from no-map to a map,
        // and R3F doesn't always set needsUpdate automatically for that transition.
        <mesh
          key={texture?.uuid ?? 'loading'}
          position={[0, 0, 0]}
          rotation={[0, (LANDMARKS[index].initialYaw * Math.PI) / 180, 0]}
        >
          <sphereGeometry args={[50, 128, 64]} />
          <meshBasicMaterial map={texture} side={BackSide} />
        </mesh>
      ) : (
        // Flat HTML fallback for non-equirectangular images to prevent distortion
        <mesh visible={false} />
      )}

      {/* Simple HTML overlay for controls (works on all roles) */}
      <Html position={[0, 0, 0]} fullscreen>
        <div>
          {/* If using flat mode show full-screen image */}
          {displayMode === 'flat' && (
            <div style={{
              position: 'fixed',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              pointerEvents: 'none',
            }}>
              <img src={LANDMARKS[index].src} alt="landmark" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
            </div>
          )}

          {showProgress && (<div style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 24,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 8,
            fontWeight: 600,
            pointerEvents: 'none',
          }}>{index + 1} / {LANDMARKS.length}</div>)}
        </div>
      </Html>
    </group>
  );
}

export default LandmarkGallery;
