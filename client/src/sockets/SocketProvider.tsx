import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const internalSocket = io("http://localhost:8080");

    internalSocket.on("connect", () => {
      console.log("Socket connected", internalSocket);
    });
    internalSocket.on("disconnect", () => {
      console.log("Socket disconnected");
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
