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
  SphereRotationSettledEventData,
  SessionStateEventData,
} from "../../shared/socketEvents";

interface SessionState {
  sessionStartTime: number;
  rotationStopTime: number | null;
  sphereRotation: number;
  currentTrickState: string;
  showPhase: string;
  galleryIndex: number;
  galleryEnabled: boolean;
}

function buildSessionPayload(session: SessionState): SessionStateEventData {
  return {
    sessionStartTime: session.sessionStartTime,
    rotationStopTime: session.rotationStopTime,
    sphereRotation: session.sphereRotation,
    currentTrickState: session.currentTrickState,
    showPhase: session.showPhase,
    galleryIndex: session.galleryIndex,
    galleryEnabled: session.galleryEnabled,
  };
}

function makeSessionState(): SessionState {
  return {
    sessionStartTime: Date.now(),
    rotationStopTime: null,
    sphereRotation: 0,
    currentTrickState: "setup",
    showPhase: "landing",
    galleryIndex: 0,
    galleryEnabled: true,
  };
}

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
    const session = makeSessionState();

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
        // Client emits 'trick-state-change' (no trailing 'd') — keep both spellings
        event: "trick-state-change",
        callback: (data: TrickStateChangedEventData, broadcast) => {
          session.currentTrickState = data.state;
          session.showPhase = "trick";
          if (data.state === "forming") {
            // Reset epoch clock so all clients start row rotation from 0 simultaneously
            session.sessionStartTime = Date.now();
            session.rotationStopTime = null;
            broadcast("session-state", buildSessionPayload(session));
          }
          if (data.state === "participant-selection") {
            // Freeze epoch so all clients lock sphere rotation at the same angle
            session.rotationStopTime = Date.now();
            broadcast("session-state", buildSessionPayload(session));
          }
          broadcast("trick-state-change", data);
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
          session.sessionStartTime = Date.now();
          session.rotationStopTime = null;
          session.sphereRotation = 0;
          session.currentTrickState = "setup";
          session.showPhase = "landing";
          session.galleryIndex = 0;
          broadcast("trick-reset", data);
        },
      },
      {
        event: "sphere-rotation-settled",
        callback: (data: SphereRotationSettledEventData, broadcast) => {
          session.sphereRotation = data.rotation;
          broadcast("sphere-rotation-settled", data);
        },
      },
      {
        event: "landmark-index",
        callback: (data: any, broadcast) => {
          session.showPhase = "start-gallery";
          session.galleryIndex = data.index ?? 0;
          broadcast("landmark-index", data);
        },
      },
      {
        event: "landmark-finish",
        callback: (data: any, broadcast) => {
          session.showPhase = "trick";
          broadcast("landmark-finish", data);
        },
      },
      {
        event: "gallery-skip",
        callback: (_data: any, broadcast) => {
          session.showPhase = "trick";
          broadcast("gallery-skip", null);
        },
      },
      {
        event: "pointer-hit",
        callback: (data: any, broadcast) => {
          broadcast("pointer-hit", data);
        },
      },
      {
        event: "show-start",
        callback: (data: any, broadcast) => {
          console.log("[server](show-start)");
          session.galleryEnabled = data.galleryEnabled ?? true;
          session.showPhase = session.galleryEnabled ? "start-gallery" : "trick";
          session.galleryIndex = 0;
          broadcast("show-start", data);
        },
      },
      {
        event: "end-gallery-start",
        callback: (data: any, broadcast) => {
          session.showPhase = "end-gallery";
          session.galleryIndex = 0;
          broadcast("end-gallery-start", data);
        },
      },
      {
        event: "end-landmark-index",
        callback: (data: any, broadcast) => {
          session.galleryIndex = data.index ?? 0;
          broadcast("end-landmark-index", data);
        },
      },
      {
        event: "force-refresh",
        callback: (_data: any, broadcast) => {
          console.log("[server](force-refresh): broadcasting to all clients");
          broadcast("force-refresh", { timestamp: Date.now() });
        },
      },
    ];

    this.socketManager = new SocketManager(
      this.server,
      this.port,
      eventListeners,
      (emit) => {
        emit("session-state", buildSessionPayload(session));
      },
    );
    this.socketManager.startServer();
  }

  public getApp(): express.Application {
    return this.app;
  }
}

new ForcedPerspectiveServer();
