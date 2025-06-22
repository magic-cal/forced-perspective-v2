import { useEffect, useState } from "react";
import { useUserRole } from "@/store/gameStore";

export function Interface() {
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useUserRole();

  useEffect(() => {
    // Socket connection and room management will be implemented here
  }, []);

  return (
    <div className="interface">
      <div
        className={`interface__status ${
          isConnected ? "interface__status--connected" : ""
        }`}
      >
        Status: {isConnected ? "Connected" : "Disconnected"}
      </div>
      <div className="interface__role-select">
        <span>Role: </span>
        <button
          onClick={() => setRole("audience")}
          disabled={role === "audience"}
        >
          Magician
        </button>
        <button
          onClick={() => setRole("spectator")}
          disabled={role === "spectator"}
        >
          Spectator
        </button>
        <span style={{ marginLeft: 8 }}>
          {role ? `Current: ${role}` : "(not selected)"}
        </span>
      </div>
    </div>
  );
}
