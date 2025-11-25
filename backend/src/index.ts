import express from "express";
import { createServer, Server as HttpServer } from "http";
import SocketManager, { EventListener } from "./socketManager";
import {
  MouseDownEventData,
  CameraChangedEventData,
  TrickStateChangedEventData,
  CardSelectedEventData,
  CardForcedEventData,
  UnlinkTriggeredEventData,
  ParticipantRotationEventData,
  TrickResetEventData,
} from "../../shared/socketEvents";

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
        callback: (data: MouseDownEventData, broadcast) => {
          console.log("[server](mouse-down): %s", JSON.stringify(data));
          broadcast("mouse-down", data);
        },
      },
      {
        event: "camera-changed",
        callback: (data: CameraChangedEventData, broadcast) => {
          console.log("[server](camera-changed): %s", JSON.stringify(data));
          broadcast("camera-changed", data);
        },
      },
      {
        event: "camera-update",
        callback: (data: any, broadcast) => {
          // High frequency event - don't log
          broadcast("camera-update", data);
        },
      },
      {
        event: "trick-state-changed",
        callback: (data: TrickStateChangedEventData, broadcast) => {
          console.log("[server](trick-state-changed) RECEIVED: %s", JSON.stringify(data));
          const result = broadcast("trick-state-changed", data);
          console.log("[server](trick-state-changed) BROADCASTED to other clients:", result);
        },
      },
      {
        event: "card-selected",
        callback: (data: CardSelectedEventData, broadcast) => {
          console.log("[server](card-selected): %s", JSON.stringify(data));
          broadcast("card-selected", data);
        },
      },
      {
        event: "card-forced",
        callback: (data: CardForcedEventData, broadcast) => {
          console.log("[server](card-forced): %s", JSON.stringify(data));
          broadcast("card-forced", data);
        },
      },
      {
        event: "unlink-triggered",
        callback: (data: UnlinkTriggeredEventData, broadcast) => {
          console.log("[server](unlink-triggered): %s", JSON.stringify(data));
          broadcast("unlink-triggered", data);
        },
      },
      {
        event: "participant-rotation",
        callback: (data: ParticipantRotationEventData, broadcast) => {
          // Don't log this one as it's high frequency
          broadcast("participant-rotation", data);
        },
      },
      {
        event: "trick-reset",
        callback: (data: TrickResetEventData, broadcast) => {
          console.log("[server](trick-reset): %s", JSON.stringify(data));
          broadcast("trick-reset", data);
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
