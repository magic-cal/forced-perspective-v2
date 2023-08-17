import { Server as HttpServer } from "http";
import socketIo, { Server as SocketIOServer } from "socket.io";

export interface EventListener {
  event: string;
  callback: (data: any) => void;
}

type Port = string | number;

export default class SocketManager {
  private server: HttpServer;
  private port: Port;
  private io: SocketIOServer;

  constructor(server: HttpServer, port: Port, events: EventListener[]) {
    // this.options = {
    //   key: fs.readFileSync("example.key", "utf8"),
    //   cert: fs.readFileSync("example.crt", "utf8"),
    //   // passphrase: process.env.HTTPS_PASSPHRASE || "",
    // };
    this.port = port;
    this.server = server;
    this.io = new SocketIOServer(this.server);
    this.startServer(events);
  }

  startServer(events: EventListener[]) {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });

    this.io.on("connect", (socket) => {
      console.log("Connected client on port %s.", this.port);

      socket.on("message", (m) => {
        console.log("[server](message): %s", JSON.stringify(m));
        this.io.emit("message", m);
      });

      this.registerSocketListeners(socket, events);

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }

  private registerSocketListeners(
    socket: socketIo.Socket,
    listeners: EventListener[]
  ) {
    listeners.forEach((listener) => {
      socket.on(listener.event, listener.callback);
    });
  }
}
