import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

interface DeviceOrientationControlsProps {
  enabled: boolean;
}

export function DeviceOrientationControls({
  enabled,
}: DeviceOrientationControlsProps) {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Convert degrees to radians
      const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
      const beta = THREE.MathUtils.degToRad(event.beta || 0);
      const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

      // Create a rotation matrix that maps device orientation to camera rotation
      // We use ZYX order to properly handle device orientation
      const rotationMatrix = new THREE.Matrix4();

      // First apply the yaw (alpha) rotation around the Y axis
      const yawMatrix = new THREE.Matrix4().makeRotationY(alpha);

      // Then apply the pitch (beta) rotation around the X axis
      const pitchMatrix = new THREE.Matrix4().makeRotationX(beta);

      // Finally apply the roll (gamma) rotation around the Z axis
      const rollMatrix = new THREE.Matrix4().makeRotationZ(-gamma);

      // Combine the rotations in the correct order
      rotationMatrix.multiply(yawMatrix);
      rotationMatrix.multiply(pitchMatrix); // Up/Down
      rotationMatrix.multiply(rollMatrix);

      // Apply the rotation to the camera
      camera.quaternion.setFromRotationMatrix(rotationMatrix);
    };

    // Request permission for device orientation (required for iOS)
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      // For non-iOS devices
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [enabled, camera]);

  return null;
}
