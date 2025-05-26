import { useThree } from "@react-three/fiber";
import { useEffect, useState, useCallback } from "react";
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

      // Convert degrees to radians
      const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
      const beta = THREE.MathUtils.degToRad(event.beta || 0);
      const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

      // Create a rotation matrix that maps device orientation to camera rotation
      const rotationMatrix = new THREE.Matrix4();

      // Apply rotations in the correct order:
      // 1. Yaw (alpha) - rotation around Z axis (0-360)
      const yawMatrix = new THREE.Matrix4().makeRotationZ(alpha);

      // 2. Pitch (beta) - rotation around X axis (-180 to 180)
      const pitchMatrix = new THREE.Matrix4().makeRotationX(beta);

      // 3. Roll (gamma) - rotation around Y axis (-90 to 90)
      const rollMatrix = new THREE.Matrix4().makeRotationY(gamma);

      // Combine the rotations in the correct order
      rotationMatrix.multiply(yawMatrix);
      rotationMatrix.multiply(pitchMatrix);
      rotationMatrix.multiply(rollMatrix);

      // Apply the rotation to the camera
      camera.quaternion.setFromRotationMatrix(rotationMatrix);
    },
    [camera, testAxis, initialValues]
  );

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
    if (debugMode) return;

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
