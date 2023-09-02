export interface ISocketEvent {}

export class CameraChangedEvent implements ISocketEvent {
  x: number;
  y: number;
  z: number;
  constructor(data: { x: number; y: number; z: number }) {
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
  }
}

export class MouseDownEvent implements ISocketEvent {
  x: number;
  y: number;
  constructor(data: { x: number; y: number }) {
    this.x = data.x;
    this.y = data.y;
  }
}

export interface CameraChangedEventData {
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
}
export interface MouseDownEventData {
  x: number;
  y: number;
  itemId?: string;
}

export const socketEvents = {
  "mouse-down": MouseDownEvent,
  "camera-changed": CameraChangedEvent,
} as const;

export type SocketEvent = keyof typeof socketEvents;
export type SocketEventDataType<T extends SocketEvent> =
  (typeof socketEvents)[T];

export function createResponseFromEvent(socketEvent: SocketEvent, data: any) {
  switch (socketEvent) {
    case "camera-changed":
      return new CameraChangedEvent(data);
    case "mouse-down":
      return new MouseDownEvent(data);
    default:
      throw new Error(`Unknown socket event ${socketEvent}`);
  }
}
