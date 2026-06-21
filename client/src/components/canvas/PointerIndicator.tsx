import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PointerIndicatorProps {
  position: THREE.Vector3
}

const _n = new THREE.Vector3()

export function PointerIndicator({ position }: PointerIndicatorProps) {
  const innerRef = useRef<THREE.Group>(null)
  const outerRef = useRef<THREE.Group>(null)
  const innerPulse = useRef<THREE.Mesh>(null)
  const outerPulse = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!innerRef.current || !outerRef.current) return
    _n.copy(position).normalize()
    // Pull toward centre → sits on the front face the spectator sees
    innerRef.current.position.copy(position).addScaledVector(_n, -0.3)
    // Push past the card back → visible to audience looking in
    outerRef.current.position.copy(position).addScaledVector(_n, 0.5)
  }, [position])

  useFrame(({ clock }) => {
    const s = 1 + 0.28 * Math.sin(clock.getElapsedTime() * 6)
    if (innerPulse.current) innerPulse.current.scale.setScalar(s)
    if (outerPulse.current) outerPulse.current.scale.setScalar(s)
  })

  return (
    <>
      {/* Spectator-facing: on the inner (front-face) side of the card */}
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

      {/* Audience-facing: on the outer (back-face) side of the card */}
      <group ref={outerRef}>
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={6} toneMapped={false} />
        </mesh>
        <mesh ref={outerPulse}>
          <sphereGeometry args={[0.44, 16, 16]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.28} />
        </mesh>
      </group>
    </>
  )
}
