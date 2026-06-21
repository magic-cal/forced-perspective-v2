import { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BackSide } from 'three';
import { LANDMARKS } from '@/config/landmarks';
import { useSocket } from '@/sockets/SocketProvider';

/**
 * LandmarkGallery displays a sequence of panoramas (images/videos) inside a large sphere.
 * Controls (next/prev) are provided via socket for synchronizing between magician/spectator and audience.
 */
export function LandmarkGallery({ onFinish }: { onFinish?: () => void }) {
  const [index, setIndex] = useState(0);
  const socket = useSocket();

  // Load current texture (images only for now) with graceful error handling
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [displayMode, setDisplayMode] = useState<'spherical' | 'flat'>('spherical');
  // Keep a ref to the last texture so we can dispose it when replacing to free GPU memory
  const lastTextureRef = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    let createdTexture: THREE.Texture | null = null;

    const url = LANDMARKS[index];

    const img = new Image();
    img.src = url;

    img.onload = () => {
      if (!active) return;
      // detect equirectangular aspect ratio; default to flat if not 2:1
      const ratio = img.naturalWidth / img.naturalHeight;
      setDisplayMode(ratio >= 1.9 && ratio <= 2.1 ? 'spherical' : 'flat');

      // Normalize to a 2:1 equirectangular canvas to avoid stretching on the sphere.
      const targetHeight = 1024; // fixed render height for texture
      const targetWidth = targetHeight * 2;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Scale factor to match targetHeight
        const scale = targetHeight / img.height;
        const scaledWidth = img.width * scale;

        if (scaledWidth >= targetWidth) {
          // Image is wider than needed at the target height -> crop center horizontally
          const sourceWidth = targetWidth / scale; // width in source image to sample
          const sx = Math.max(0, (img.width - sourceWidth) / 2);
          ctx.drawImage(img, sx, 0, sourceWidth, img.height, 0, 0, targetWidth, targetHeight);
        } else {
          // Image is narrower than target -> draw centered with black bars on sides
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          const dx = Math.round((targetWidth - scaledWidth) / 2);
          ctx.drawImage(img, 0, 0, img.width, img.height, dx, 0, Math.round(scaledWidth), targetHeight);
        }

        createdTexture = new THREE.CanvasTexture(canvas);
      } else {
        createdTexture = new THREE.Texture(img);
      }

      createdTexture.needsUpdate = true;
      // Try to set correct color space/encoding
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (THREE && (THREE as any).SRGBColorSpace) {
        // @ts-ignore
        createdTexture.colorSpace = (THREE as any).SRGBColorSpace;
      } else if ((THREE as any).sRGBEncoding) {
        createdTexture.encoding = (THREE as any).sRGBEncoding;
      }

      // Replace texture and dispose previous to free GPU memory
      const prev = lastTextureRef.current;
      lastTextureRef.current = createdTexture;
      setTexture(createdTexture);
      try {
        if (prev && prev !== createdTexture) prev.dispose();
      } catch (e) {
        // ignore dispose errors
      }
    };

    img.onerror = (err) => {
      // If image fails to load, fall back to first local asset if available
      console.error('Landmark image load error:', url, err);
      if (!active) return;
      // Try fallback local image
      const fallbackUrl = '/src/assets/house.jpg';
      const fallbackImg = new Image();
      fallbackImg.src = fallbackUrl;
      fallbackImg.onload = () => {
        if (!active) return;

        // Create canvas-normalized texture for fallback as well
        const targetHeight = 1024;
        const targetWidth = targetHeight * 2;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scale = targetHeight / fallbackImg.height;
          const scaledWidth = fallbackImg.width * scale;
          if (scaledWidth >= targetWidth) {
            const sourceWidth = targetWidth / scale;
            const sx = Math.max(0, (fallbackImg.width - sourceWidth) / 2);
            ctx.drawImage(fallbackImg, sx, 0, sourceWidth, fallbackImg.height, 0, 0, targetWidth, targetHeight);
          } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            const dx = Math.round((targetWidth - scaledWidth) / 2);
            ctx.drawImage(fallbackImg, 0, 0, fallbackImg.width, fallbackImg.height, dx, 0, Math.round(scaledWidth), targetHeight);
          }
          createdTexture = new THREE.CanvasTexture(canvas);
        } else {
          createdTexture = new THREE.Texture(fallbackImg);
        }

        createdTexture.needsUpdate = true;
        const prev = lastTextureRef.current;
        lastTextureRef.current = createdTexture;
        setTexture(createdTexture);
        try {
          if (prev && prev !== createdTexture) prev.dispose();
        } catch (e) {}
      };
      fallbackImg.onerror = () => {
        // Give up and clear texture (material will render fallback color)
        setTexture(null);
      };
    };

    return () => {
      // mark inactive; do not dispose the texture here because it may still be
      // referenced by the material. Allow garbage collection when the component
      // unmounts or when the texture is no longer referenced.
      active = false;
    };
  }, [index]);

  // Receive index updates driven by TrickControls (magician) — pure receiver, never re-emits
  useEffect(() => {
    if (!socket) return undefined;
    const handleSetIndex = (data: { index: number }) => {
      setIndex(Math.max(0, Math.min(LANDMARKS.length - 1, data.index)));
    };
    socket.on('landmark-index', handleSetIndex);
    return () => socket.off('landmark-index', handleSetIndex);
  }, [socket]);

  // Listen for remote finish events
  useEffect(() => {
    if (!socket) return undefined;

    const handleFinish = (data: { senderId?: string }) => {
      if (data.senderId && socket.id && data.senderId === socket.id) return;
      if (onFinish) onFinish();
    };

    socket.on('landmark-finish', handleFinish);
    return () => socket.off('landmark-finish', handleFinish);
  }, [socket, onFinish]);

  // Cleanup on unmount in case the texture was left allocated
  useEffect(() => {
    return () => {
      try {
        if (lastTextureRef.current) {
          lastTextureRef.current.dispose();
          lastTextureRef.current = null;
        }
      } catch (e) {}
    };
  }, []);

  return (
    <group>
      <ambientLight intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} />

      {displayMode === 'spherical' ? (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[50, 60, 40]} />
          <meshStandardMaterial map={texture} side={BackSide} color={0xffffff} />
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
              <img src={LANDMARKS[index]} alt="landmark" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
            </div>
          )}

          {/* Slide counter — visible to everyone */}
          <div style={{
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
          }}>{index + 1} / {LANDMARKS.length}</div>
        </div>
      </Html>
    </group>
  );
}

export default LandmarkGallery;
