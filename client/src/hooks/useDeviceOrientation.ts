import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export const useDeviceOrientation = (enabled: boolean) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Convert degrees to radians
      const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
      const beta = THREE.MathUtils.degToRad(event.beta || 0);
      const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

      // Create a rotation matrix from the device orientation
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationFromEuler(
        new THREE.Euler(beta, alpha, -gamma, "YXZ")
      );

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
};
