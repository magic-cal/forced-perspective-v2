import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useSocket } from "@/sockets/SocketProvider";
import { useGameStore } from "@/store/gameStore";

export function useCameraSync() {
  const { camera, gl } = useThree();
  const socket = useSocket();
  const role = useGameStore((s) => s.role);

  useEffect(() => {
    if (role !== "spectator" || !socket) {
      console.log("Not spectator or no socket", { role, socket });
      return;
    }
    const handle = () => {
      socket.emit("camera-changed", {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
      });
    };
    gl.domElement.addEventListener("pointermove", handle);
    return () => gl.domElement.removeEventListener("pointermove", handle);
  }, [role, camera, gl, socket]);

  useEffect(() => {
    if (role !== "audience" || !socket) {
      console.log("Not audience or no socket handle", { role, socket });
      return;
    }
    const handler = (data: any) => {
      console.log("Received camera-changed", data);
      camera.position.set(data.position.x, data.position.y, data.position.z);
      camera.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    };
    socket.on("camera-changed", handler);
    return () => {
      socket.off("camera-changed", handler);
    };
  }, [role, camera, socket]);
}
