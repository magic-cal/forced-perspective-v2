import io, { Socket } from "socket.io-client";
import { SocketEvent } from "../../shared/SocketEvents";

export interface SocketEventsOptions {
  debug: boolean;
  url: string;
}

const defaultOptions: SocketEventsOptions = {
  debug: false,
  url: "http://localhost:8080",
};

export interface SocketEventCallback<T> {
  (data: T): void;
}

export interface SocketListener<T> {
  event: SocketEvent;
  callback: SocketEventCallback<T>;
}

export class SocketEventService {
  socket: Socket;
  options: SocketEventsOptions;

  constructor(options: SocketEventsOptions = defaultOptions) {
    this.options = options;
    this.socket = io(options.url, { secure: true });

    this.setupDebug();
  }

  setupDebug() {
    if (!this.options.debug) {
      return;
    }
    this.socket.on("connect", () => {
      console.log("socket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("socket disconnected");
    });
  }

  addEventListener<T>(event: SocketEvent, callback: SocketEventCallback<T>) {
    this.socket.on(event, (data: any) => callback(data));
    return () => this.socket.off(event, callback);
  }

  emit(event: SocketEvent, data: any) {
    this.socket.emit(event, data);
  }
}
