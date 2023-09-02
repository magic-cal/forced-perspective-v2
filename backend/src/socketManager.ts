import { Server as HttpServer } from "http";
import { Socket, Server as SocketIOServer } from "socket.io";
import { SocketEvent } from "../../shared/socketEvents";

export interface EventListener<T = any> {
  event: SocketEvent;
  callback: (data: T, broadcast: (ev: SocketEvent, args: T) => boolean) => void;
}

type Port = string | number;

export default class SocketManager {
  private server: HttpServer;
  private port: Port;
  private io: SocketIOServer;
  private listeners: EventListener[] = [];
  constructor(server: HttpServer, port: Port, events: EventListener[]) {
    this.port = port;
    this.server = server;
    this.io = this.createServer();
    this.listeners = events;
  }
  createServer() {
    const io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    return io;
  }

  public startServer() {
    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });

    this.io.on("connect", (socket) => {
      console.log("Connected client on port %s.", this.port);

      socket.on("message", (m) => {
        console.log("[server](message): %s", JSON.stringify(m));
        this.io.emit("message", m);
      });

      socket.broadcast.emit("new-user");

      this.registerSocketListeners(socket, this.listeners);

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }

  private registerSocketListeners(socket: Socket, listeners: EventListener[]) {
    const broadcast = (ev: SocketEvent, ...args: any[]) => {
      return socket.broadcast.emit(ev, ...args);
    };

    listeners.forEach((listener) => {
      console.log("Registering listener for event: ", listener.event);
      socket.on(listener.event, (data) => {
        listener.callback(data, broadcast);
      });
    });
  }

  public sendMessage(event: SocketEvent, ...args: any[]) {
    this.io.sockets.emit(event, ...args);
  }

  public addEventListeners(listeners: EventListener[]) {
    this.listeners.push(...listeners);
  }
}
