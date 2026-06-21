import { debug, SHOW_DEBUG_UI } from "@/config/debug";
import { useSocket } from "@/sockets/SocketProvider";
import { useUserRole } from "@/store/gameStore";
import { useTrickStore } from "@/store/useTrickStore";
import { useEffect, useState } from "react";

export function Interface() {
  const [role, setRole] = useUserRole();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState<boolean>(socket?.connected ?? false);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    // Keep local connected state in sync with socket events
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // initialize from current socket state
    setIsConnected(socket.connected ?? false);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);
  const currentState = useTrickStore((s) => s.currentState);
  const selectedCardId = useTrickStore((s) => s.selectedCardId);
  const isUnlinked = useTrickStore((s) => s.isUnlinked);
  const isSelectionLocked = useTrickStore((s) => s.isSelectionLocked);

  useEffect(() => {
    // Read role from URL parameter on mount
    const url = new URLSearchParams(window.location.search);
    const urlRole = url.get("role") as "magician" | "spectator" | "audience" | null;
    if (urlRole) {
      debug.store("Setting role from URL:", urlRole);
      setRole(urlRole);
    }
  }, [setRole]);

  return (
    <div className="interface">
      {SHOW_DEBUG_UI && (
        <div
          className={`interface__status ${
            isConnected ? "interface__status--connected" : ""
          }`}
        >
          Status: {isConnected ? "Connected" : "Disconnected"}
        </div>
      )}

      {/* subtle connection indicator */}
      <div
        className={`connection-indicator ${isConnected ? "connected" : "disconnected"}`}
        aria-hidden="true"
      />
      {SHOW_DEBUG_UI && (
        <div className="interface__role-select">
        <span>Role: </span>
        <button
          onClick={() => setRole("magician")}
          disabled={role === "magician"}
        >
          Magician
        </button>
        <button
          onClick={() => setRole("spectator")}
          disabled={role === "spectator"}
        >
          Spectator
        </button>
        <button
          onClick={() => setRole("audience")}
          disabled={role === "audience"}
        >
          Audience
        </button>
        <span style={{ marginLeft: 8 }}>
          {role ? `Current: ${role}` : "(not selected)"}
        </span>
      </div>
      )}

      {/* Debug Panel (hidden by default) */}
      {SHOW_DEBUG_UI && (
        <div className="interface__debug">
          <div className="interface__debug-title">Debug Info</div>
          <div className="interface__debug-item">
            <span className="interface__debug-label">State:</span>
            <span className="interface__debug-value">{currentState}</span>
          </div>
          <div className="interface__debug-item">
            <span className="interface__debug-label">Unlinked:</span>
            <span className="interface__debug-value">{isUnlinked ? 'Yes' : 'No'}</span>
          </div>
          <div className="interface__debug-item">
            <span className="interface__debug-label">Selected Card:</span>
            <span className="interface__debug-value">{selectedCardId || 'None'}</span>
          </div>
          <div className="interface__debug-item">
            <span className="interface__debug-label">Selection Locked:</span>
            <span className="interface__debug-value">{isSelectionLocked ? 'Yes' : 'No'}</span>
          </div>
        </div>
      )}

      <style>{`
        .interface {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .interface__status {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 8px 16px;
          color: #ff6b6b;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid rgba(255, 107, 107, 0.3);
        }

        .interface__status--connected {
          color: #51cf66;
          border-color: rgba(81, 207, 102, 0.3);
        }

        .interface__role-select {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .interface__role-select span {
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        .interface__role-select button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .interface__role-select button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .interface__role-select button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.2);
        }

        .interface__debug {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 250px;
        }

        .interface__debug-title {
          color: #4fc3f7;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .interface__debug-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .interface__debug-item:last-child {
          border-bottom: none;
        }

        .interface__debug-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 500;
        }

        .interface__debug-value {
          color: white;
          font-size: 12px;
          font-weight: 600;
          font-family: monospace;
        }
        .connection-indicator {
          position: fixed;
          left: 10px;
          top: 10px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(81, 207, 102, 0.18);
          box-shadow: 0 0 6px rgba(81, 207, 102, 0.08);
          z-index: 1100;
          pointer-events: none;
          transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        .connection-indicator.disconnected {
          background: rgba(255, 107, 107, 0.9);
          box-shadow: 0 0 6px rgba(255, 107, 107, 0.35);
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
