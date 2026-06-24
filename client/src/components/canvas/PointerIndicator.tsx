import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PointerIndicatorProps {
  position: THREE.Vector3
  viewType?: 'participant' | 'spectator' | 'audience'
}

const _n = new THREE.Vector3()
const _toCamera = new THREE.Vector3()
const _Z = new THREE.Vector3(0, 0, 1)
const _q = new THREE.Quaternion()

export function PointerIndicator({ position, viewType }: PointerIndicatorProps) {
  const { camera } = useThree()
  const innerRef = useRef<THREE.Group>(null)
  const outerRef = useRef<THREE.Group>(null)
  const innerPulse = useRef<THREE.Mesh>(null)
  const outerPulse = useRef<THREE.Mesh>(null)
  const isAudience = viewType === 'audience'

  useEffect(() => {
    if (!outerRef.current) return
    _n.copy(position).normalize()

    if (innerRef.current) {
      // Pull toward centre → sits on the front face the spectator sees
      innerRef.current.position.copy(position).addScaledVector(_n, -0.3)
    }

    if (isAudience) {
      // Flat disc flush on card back surface (card is only 0.012 thick, 0.02 clears it)
      outerRef.current.position.copy(position).addScaledVector(_n, 0.02)
      // Rotate disc so its face aligns with the card outward normal
      _q.setFromUnitVectors(_Z, _n)
      outerRef.current.quaternion.copy(_q)
    } else {
      // Push past the card back → visible to audience looking in
      outerRef.current.position.copy(position).addScaledVector(_n, 0.5)
      outerRef.current.quaternion.identity()
    }
  }, [position, isAudience])

  useFrame(({ clock }) => {
    const s = 1 + 0.28 * Math.sin(clock.getElapsedTime() * 6)
    if (innerPulse.current) innerPulse.current.scale.setScalar(s)
    if (outerPulse.current) outerPulse.current.scale.setScalar(s)

    // For audience: hide indicator when pointed card's back faces away from camera.
    // Card materials are transparent so depth testing can't occlude far-side cards —
    // instead we check the dot product of the outward sphere normal vs camera direction.
    // Negative dot = card back is pointing away = far side of sphere = hide.
    if (isAudience && outerRef.current) {
      _n.copy(position).normalize()
      _toCamera.subVectors(camera.position, position).normalize()
      outerRef.current.visible = _n.dot(_toCamera) > 0
    }
  })

  return (
    <>
      {/* Spectator-facing: inner (front-face) side of the card — not rendered for audience */}
      {!isAudience && (
        <group ref={innerRef}>
          <mesh>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={6} toneMapped={false} />
          </mesh>
          <mesh ref={innerPulse}>
            <sphereGeometry args={[0.44, 16, 16]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.28} />
          </mesh>
        </group>
      )}

      {/* Card-back-facing indicator */}
      <group ref={outerRef}>
        {isAudience ? (
          // Flat pulsing ring flush on card back — cannot wrap around card edges.
          // Visibility is controlled by the dot-product check in useFrame above.
          <mesh ref={outerPulse}>
            <ringGeometry args={[0.12, 0.32, 32]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} depthTest={false} side={THREE.DoubleSide} />
          </mesh>
        ) : (
          <>
            <mesh>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={6} toneMapped={false} />
            </mesh>
            <mesh ref={outerPulse}>
              <sphereGeometry args={[0.44, 16, 16]} />
              <meshBasicMaterial color="#ffaa00" transparent opacity={0.28} />
            </mesh>
          </>
        )}
      </group>
    </>
  )
}
