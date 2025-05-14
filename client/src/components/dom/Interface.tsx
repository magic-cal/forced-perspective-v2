import { useEffect, useState } from "react";

export function Interface() {
  const [isConnected, setIsConnected] = useState(false);

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
    </div>
  );
}
