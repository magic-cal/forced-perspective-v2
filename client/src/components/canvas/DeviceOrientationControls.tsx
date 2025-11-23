import { useThree } from "@react-three/fiber";
import { useEffect, useState, useCallback, useRef } from "react";
import * as THREE from "three";

interface DeviceOrientationControlsProps {
  enabled: boolean;
}

export function DeviceOrientationControls({
  enabled,
}: DeviceOrientationControlsProps) {
  const { camera } = useThree();
  const [debugMode, setDebugMode] = useState(false);
  const [currentValues, setCurrentValues] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
    absolute: false,
  });
  const [testAxis, setTestAxis] = useState<"alpha" | "beta" | "gamma" | null>(
    null
  );
  const [initialValues, setInitialValues] = useState<{
    alpha: number;
    beta: number;
    gamma: number;
    absolute: boolean;
  } | null>(null);

  // Store initial camera orientation and device orientation
  const initialCameraQuaternion = useRef<THREE.Quaternion>();
  const initialDeviceOrientation = useRef<{
    alpha: number;
    beta: number;
    gamma: number;
  }>();

  // Store target quaternion for smooth interpolation
  const targetQuaternion = useRef(new THREE.Quaternion());
  const currentQuaternion = useRef(new THREE.Quaternion());
  
  // Performance optimization: reuse objects to avoid garbage collection
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const yawMatrix = useRef(new THREE.Matrix4());
  const pitchMatrix = useRef(new THREE.Matrix4());
  const rollMatrix = useRef(new THREE.Matrix4());

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const newValues = {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
        absolute: event.absolute || false,
      };

      // Update debug values
      setCurrentValues(newValues);

      // Store initial values when testing an axis
      if (testAxis && !initialValues) {
        setInitialValues(newValues);
      }

      // Store initial device orientation on first event
      if (!initialDeviceOrientation.current) {
        initialDeviceOrientation.current = {
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0,
        };
      }

      // Calculate relative rotation from initial orientation
      const alpha = THREE.MathUtils.degToRad(
        (event.alpha || 0) - initialDeviceOrientation.current.alpha
      );
      const beta = THREE.MathUtils.degToRad(
        (event.beta || 0) - initialDeviceOrientation.current.beta
      );
      const gamma = THREE.MathUtils.degToRad(
        (event.gamma || 0) - initialDeviceOrientation.current.gamma
      );

      // Reuse matrix objects to avoid garbage collection
      // Apply rotations in the correct order:
      // 1. Yaw (alpha) - rotation around Z axis
      yawMatrix.current.makeRotationZ(alpha);

      // 2. Pitch (beta) - rotation around X axis
      pitchMatrix.current.makeRotationX(beta);

      // 3. Roll (gamma) - rotation around Y axis
      rollMatrix.current.makeRotationY(gamma);

      // Combine the rotations in the correct order
      tempMatrix.current.identity();
      tempMatrix.current.multiply(yawMatrix.current);
      tempMatrix.current.multiply(pitchMatrix.current);
      tempMatrix.current.multiply(rollMatrix.current);

      // Calculate target quaternion
      if (initialCameraQuaternion.current) {
        tempQuaternion.current.setFromRotationMatrix(tempMatrix.current);
        targetQuaternion.current.copy(initialCameraQuaternion.current);
        targetQuaternion.current.multiply(tempQuaternion.current);
      }
    },
    [testAxis, initialValues]
  );

  // Handle enabling/disabling the controls
  useEffect(() => {
    if (enabled) {
      // Store the current camera orientation when enabling
      initialCameraQuaternion.current = camera.quaternion.clone();
      currentQuaternion.current.copy(camera.quaternion);
      targetQuaternion.current.copy(camera.quaternion);
      initialDeviceOrientation.current = undefined; // Reset device orientation
    } else {
      // Keep the current camera orientation when disabling
      // No need to do anything as the camera will maintain its current rotation
    }
  }, [enabled, camera]);

  // Smooth camera movement with adaptive lerp factor
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateCamera = (currentTime: number) => {
      // Calculate delta time for frame-rate independent smoothing
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Adaptive lerp factor: faster on larger differences, smoother on smaller ones
      const angleDiff = currentQuaternion.current.angleTo(targetQuaternion.current);
      const lerpFactor = Math.min(0.15 + angleDiff * 0.5, 0.3) * Math.min(deltaTime * 60, 1);

      currentQuaternion.current.slerp(targetQuaternion.current, lerpFactor);
      camera.quaternion.copy(currentQuaternion.current);

      animationFrameId = requestAnimationFrame(updateCamera);
    };

    animationFrameId = requestAnimationFrame(updateCamera);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, camera]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [enabled, handleOrientation]);

  // Reset test state when changing test axis
  useEffect(() => {
    setInitialValues(null);
  }, [testAxis]);

  // Create debug overlay using HTML elements
  useEffect(() => {
    if (!debugMode) {
      const existingOverlay = document.getElementById(
        "device-orientation-debug"
      );
      if (existingOverlay) {
        existingOverlay.remove();
      }
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "device-orientation-debug";
    overlay.style.position = "fixed";
    overlay.style.bottom = "20px";
    overlay.style.right = "20px";
    overlay.style.zIndex = "1000";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.padding = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.color = "white";
    overlay.style.fontFamily = "monospace";
    overlay.style.maxWidth = "300px";

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close Debug";
    closeButton.style.padding = "5px 10px";
    closeButton.style.marginBottom = "10px";
    closeButton.style.background = "#444";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "3px";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = () => {
      setDebugMode(false);
      setTestAxis(null);
      setInitialValues(null);
    };
    overlay.appendChild(closeButton);

    // Create test buttons container
    const testButtonsContainer = document.createElement("div");
    testButtonsContainer.style.marginBottom = "15px";

    const testButtonsTitle = document.createElement("h3");
    testButtonsTitle.textContent = "Test Rotation Axes";
    testButtonsTitle.style.margin = "0 0 10px 0";
    testButtonsContainer.appendChild(testButtonsTitle);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.gap = "10px";
    buttonsDiv.style.marginBottom = "10px";

    // Create test buttons
    ["alpha", "beta", "gamma"].forEach((axis) => {
      const button = document.createElement("button");
      button.textContent = `Test ${
        axis === "alpha"
          ? "Yaw (α) [0-360°]"
          : axis === "beta"
          ? "Pitch (β) [-180-180°]"
          : "Roll (γ) [-90-90°]"
      }`;
      button.style.padding = "5px 10px";
      button.style.background = testAxis === axis ? "#4CAF50" : "#444";
      button.style.color = "white";
      button.style.border = "none";
      button.style.borderRadius = "3px";
      button.style.cursor = "pointer";
      button.onclick = () => {
        setTestAxis(axis as "alpha" | "beta" | "gamma");
        setInitialValues(null);
      };
      buttonsDiv.appendChild(button);
    });

    testButtonsContainer.appendChild(buttonsDiv);

    // Create instruction text
    if (testAxis) {
      const instruction = document.createElement("div");
      instruction.textContent = `Rotate your device around the ${testAxis} axis`;
      instruction.style.fontSize = "14px";
      instruction.style.color = "#aaa";
      testButtonsContainer.appendChild(instruction);

      // Show initial values if available
      if (initialValues) {
        const initialValueText = document.createElement("div");
        initialValueText.textContent = `Initial ${testAxis}: ${initialValues[
          testAxis
        ].toFixed(2)}°`;
        initialValueText.style.fontSize = "14px";
        initialValueText.style.color = "#4CAF50";
        testButtonsContainer.appendChild(initialValueText);
      }
    }

    overlay.appendChild(testButtonsContainer);

    // Create values display
    const valuesContainer = document.createElement("div");
    const valuesTitle = document.createElement("h3");
    valuesTitle.textContent = "Current Values";
    valuesTitle.style.margin = "0 0 10px 0";
    valuesContainer.appendChild(valuesTitle);

    const valuesDiv = document.createElement("div");
    valuesDiv.style.fontSize = "14px";
    valuesDiv.innerHTML = `
      <div>Yaw (α): ${currentValues.alpha.toFixed(2)}° [0-360]</div>
      <div>Pitch (β): ${currentValues.beta.toFixed(2)}° [-180-180]</div>
      <div>Roll (γ): ${currentValues.gamma.toFixed(2)}° [-90-90]</div>
      <div>Absolute: ${currentValues.absolute ? "Yes" : "No"}</div>
    `;
    valuesContainer.appendChild(valuesDiv);
    overlay.appendChild(valuesContainer);

    // Add overlay to document
    document.body.appendChild(overlay);

    // Update values periodically
    const updateInterval = setInterval(() => {
      if (valuesDiv) {
        valuesDiv.innerHTML = `
          <div>Yaw (α): ${currentValues.alpha.toFixed(2)}° [0-360]</div>
          <div>Pitch (β): ${currentValues.beta.toFixed(2)}° [-180-180]</div>
          <div>Roll (γ): ${currentValues.gamma.toFixed(2)}° [-90-90]</div>
          <div>Absolute: ${currentValues.absolute ? "Yes" : "No"}</div>
        `;

        // Update initial values display if testing
        if (testAxis && initialValues) {
          const initialValueText =
            testButtonsContainer.querySelector("div:last-child");
          if (initialValueText) {
            initialValueText.textContent = `Initial ${testAxis}: ${initialValues[
              testAxis
            ].toFixed(2)}°`;
          }
        }
      }
    }, 100);

    return () => {
      clearInterval(updateInterval);
      overlay.remove();
    };
  }, [debugMode, testAxis, currentValues, initialValues]);

  // Create debug button
  useEffect(() => {
    if (debugMode) {
      return;
    }

    const button = document.createElement("button");
    button.textContent = "Debug Controls";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "1000";
    button.style.padding = "10px";
    button.style.background = "rgba(0,0,0,0.7)";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.onclick = () => setDebugMode(true);

    document.body.appendChild(button);

    return () => {
      button.remove();
    };
  }, [debugMode]);

  return null;
}
