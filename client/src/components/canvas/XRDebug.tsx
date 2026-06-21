import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const _euler = new THREE.Euler();
const R2D = 180 / Math.PI;

/**
 * Visual debug overlay for head-tracking orientation.
 * Shows an XYZ axis gizmo rotated by the received quaternion so it's immediately
 * obvious which direction "forward" points and whether pitch/yaw/roll respond correctly.
 *
 * Red  = +X (right)
 * Green = +Y (up)
 * Blue cone = -Z (forward, where the headset is looking)
 *
 * Renders in audience view alongside HeadsetIndicator. Remove once issue is resolved.
 */
export function XRDebug({ quaternionRef }: { quaternionRef: React.RefObject<THREE.Quaternion> }) {
  const axisGroupRef = useRef<THREE.Group>(null);
  const lastLogRef = useRef(0);
  const [angleText, setAngleText] = useState('Waiting for headset...');
  const [quatText, setQuatText] = useState('');

  useFrame(() => {
    const q = quaternionRef.current;
    if (!axisGroupRef.current || !q) return;

    axisGroupRef.current.quaternion.copy(q);

    const now = Date.now();
    if (now - lastLogRef.current > 1000) {
      lastLogRef.current = now;
      _euler.setFromQuaternion(q, 'YXZ');
      const pitch = (_euler.x * R2D).toFixed(1);
      const yaw   = (_euler.y * R2D).toFixed(1);
      const roll  = (_euler.z * R2D).toFixed(1);

      // Positive pitch = looking UP. If spectator looks up and pitch goes negative, axes are inverted.
      console.log(`[XRDebug] Pitch: ${pitch}° (+ = up)  Yaw: ${yaw}°  Roll: ${roll}°`);
      console.log(`[XRDebug] quat  x:${q.x.toFixed(3)}  y:${q.y.toFixed(3)}  z:${q.z.toFixed(3)}  w:${q.w.toFixed(3)}`);

      setAngleText(`Pitch ${pitch}°   Yaw ${yaw}°   Roll ${roll}°`);
      setQuatText(`x:${q.x.toFixed(2)}  y:${q.y.toFixed(2)}  z:${q.z.toFixed(2)}  w:${q.w.toFixed(2)}`);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Axis gizmo — rotates with the received quaternion */}
      <group ref={axisGroupRef}>
        {/* +X axis — red */}
        <mesh position={[3, 0, 0]}>
          <boxGeometry args={[5, 0.25, 0.25]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>
        {/* +Y axis — green (should stay pointing up when upright) */}
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.25, 5, 0.25]} />
          <meshBasicMaterial color="#33ff33" />
        </mesh>
        {/* -Z axis — blue cone (where the headset is looking) */}
        <mesh position={[0, 0, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.7, 2.5, 8]} />
          <meshBasicMaterial color="#3399ff" />
        </mesh>
        {/* Centre sphere */}
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>

      {/* Static labels — fixed in world space, do not rotate */}
      <Text position={[0, 7.5, 0]} fontSize={0.75} color="white" anchorX="center" outlineWidth={0.04} outlineColor="black">
        {angleText}
      </Text>
      <Text position={[0, 6.5, 0]} fontSize={0.5} color="#aaaaaa" anchorX="center" outlineWidth={0.03} outlineColor="black">
        {quatText}
      </Text>
      <Text position={[0, 5.5, 0]} fontSize={0.45} color="yellow" anchorX="center" outlineWidth={0.03} outlineColor="black">
        Blue cone = headset forward   Green = UP   Red = RIGHT
      </Text>
    </group>
  );
}
