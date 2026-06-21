import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { debug } from "@/config/debug";
import { useSessionStore } from "@/store/sessionStore";
import type { SessionStateEventData, SphereRotationSettledEventData } from "../../../shared/socketEvents";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to same origin so Vite proxy (/socket.io) forwards to the backend service
    const internalSocket = io();

    // Register before connect so we don't miss the server's immediate emit on join
    internalSocket.on("session-state", (data: SessionStateEventData) => {
      debug.socket("Received session-state", data);
      useSessionStore.getState().setSessionState(data);
    });

    internalSocket.on("sphere-rotation-settled", (data: SphereRotationSettledEventData) => {
      useSessionStore.getState().setSphereRotation(data.rotation);
    });

    internalSocket.on("connect", () => {
      debug.socket("Socket connected", internalSocket.id);
    });
    internalSocket.on("disconnect", () => {
      debug.socket("Socket disconnected");
    });

    setSocket(internalSocket);

    return () => {
      internalSocket?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
