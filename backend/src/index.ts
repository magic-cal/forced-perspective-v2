import express from "express";
import SocketManager, { EventListener } from "./socketManager";
import { createServer, Server as HttpServer } from "http";

export class ForcedPerspectiveServer {
  public static readonly PORT: number = 8080;
  private app!: express.Application;
  private server!: HttpServer;
  private port!: string | number;
  private socketManager!: SocketManager;

  constructor() {
    this.createApp();
    this.config();
    this.createServer();
    this.sockets();
  }

  private createApp(): void {
    this.app = express();
  }

  private createServer(): void {
    this.server = createServer(this.app);
  }

  private config(): void {
    this.port = process.env.PORT || ForcedPerspectiveServer.PORT;
  }

  private sockets(): void {
    const eventListeners: EventListener[] = [
      {
        event: "mouse-down",
        callback: (data, broadcast) => {
          console.log("[server](mouse-down): %s", JSON.stringify(data));
          broadcast("mouse-down", data);
        },
      },
      {
        event: "camera-changed",
        callback: (data, broadcast) => {
          console.log("[server](camera-changed): %s", JSON.stringify(data));
          broadcast("camera-changed", data);
        },
      },
    ];

    this.socketManager = new SocketManager(
      this.server,
      this.port,
      eventListeners
    );
    this.socketManager.startServer();
  }

  public getApp(): express.Application {
    return this.app;
  }
}

new ForcedPerspectiveServer();
