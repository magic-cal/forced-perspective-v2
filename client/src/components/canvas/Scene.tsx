import { useDeviceOrientationStore } from "@/store/deviceOrientationStore";
import { OrbitControls, Preload } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import PanoramaViewer from "../PanoramaViewer";
import { CardDeck } from "./CardDeck";
import { CardSphere } from "./CardSphere";
import { DeviceOrientationControls } from "./DeviceOrientationControls";
import { Environment } from "./Environment";
import { useCameraSync } from "@/hooks/useCameraSync";
import { useCameraAnimation } from "@/hooks/useCameraAnimation";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/sockets/SocketProvider";

export function Scene() {
  const { camera, gl } = useThree();
  const [isSpread, setIsSpread] = useState(false);
  const [currentScene, setCurrentScene] = useState<
    "cards" | "landmarks" | "card-deck"
  >("cards");
  const isDeviceMovementEnabled = useDeviceOrientationStore(
    (state) => state.isEnabled
  );

  const role = useGameStore((s) => s.role);
  const socket = useSocket();

  // Initialize camera sync - always enabled
  useCameraSync({ enabled: true });

  // Initialize camera animation
  const { startAnimation } = useCameraAnimation();

  // Start animation for audience after a delay
  useEffect(() => {
    if (!socket || role !== "audience") return;

    const handleStartAnimation = () => {
      console.log("Starting camera animation for audience");
      startAnimation({
        duration: 3000,
        radius: 5,
        height: 2,
        target: [0, 0, 0],
      }).catch(console.error);
    };

    // Start animation after 5 seconds
    const timer = setTimeout(handleStartAnimation, 5000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      socket.off("start-animation", handleStartAnimation);
    };
  }, [role, socket, startAnimation]);

  // Initialize scene
  useEffect(() => {
    camera.position.set(0, 0, 0);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [camera, gl]);

  const handleDeckClick = () => {
    setIsSpread(!isSpread);
  };

  return (
    <>
      <Preload all />
      {currentScene === "landmarks" ? null : (
        <Environment preset="sunset" intensity={1} blur={0.65} />
      )}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={10}
        maxDistance={50}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.1}
        enabled={!isDeviceMovementEnabled}
      />
      <DeviceOrientationControls enabled={isDeviceMovementEnabled} />

      {currentScene === "card-deck" ? (
        <CardDeck isSpread={isSpread} onDeckClick={handleDeckClick} />
      ) : currentScene === "cards" ? (
        <CardSphere radius={15} maxCardsPerRow={48} rotationSpeed={0.02} />
      ) : (
        <PanoramaViewer />
      )}

      {/* Scene switcher button */}
      {/* <mesh
        position={[0, -10, 0]}
        onClick={() =>
          setCurrentScene(currentScene === "cards" ? "landmarks" : "cards")
        }
      >
        <boxGeometry args={[2, 0.5, 0.5]} />
        <meshStandardMaterial
          color={currentScene === "cards" ? "#ff4444" : "#44ff44"}
        />
      </mesh> */}
    </>
  );
}
