import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { debug } from "@/config/debug";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const internalSocket = io("http://localhost:8080");

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
