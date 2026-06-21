import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { xrStore } from '@/store/xrStore'

export function VRButton() {
  const role = useGameStore((s) => s.role)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if ('xr' in navigator) {
      (navigator as any).xr
        ?.isSessionSupported('immersive-vr')
        .then((supported: boolean) => setIsSupported(supported))
        .catch(() => setIsSupported(false))
    }
  }, [])

  if (!(isSupported && role === 'spectator')) { return null }

  return (
    <button
      onClick={() => xrStore.enterVR()}
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '14px 32px',
        fontSize: '16px',
        fontWeight: '700',
        letterSpacing: '0.05em',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '40px',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.5)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      Enter VR
    </button>
  )
}
