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

// Trick-related event interfaces
export interface TrickStateChangedEventData {
  state: string;
  timestamp: number;
}

export interface CardSelectedEventData {
  cardId: string;
  suit: string;
  value: string;
  timestamp: number;
}

export interface CardForcedEventData {
  cardId: string;
  forcedSuit: string;
  forcedValue: string;
  timestamp: number;
}

export interface UnlinkTriggeredEventData {
  timestamp: number;
}

export interface ParticipantRotationEventData {
  x: number;
  y: number;
  z: number;
}

export interface TrickResetEventData {
  timestamp: number;
}

// Trick event classes
export class TrickStateChangedEvent implements ISocketEvent {
  state: string;
  timestamp: number;
  constructor(data: TrickStateChangedEventData) {
    this.state = data.state;
    this.timestamp = data.timestamp;
  }
}

export class CardSelectedEvent implements ISocketEvent {
  cardId: string;
  suit: string;
  value: string;
  timestamp: number;
  constructor(data: CardSelectedEventData) {
    this.cardId = data.cardId;
    this.suit = data.suit;
    this.value = data.value;
    this.timestamp = data.timestamp;
  }
}

export class CardForcedEvent implements ISocketEvent {
  cardId: string;
  forcedSuit: string;
  forcedValue: string;
  timestamp: number;
  constructor(data: CardForcedEventData) {
    this.cardId = data.cardId;
    this.forcedSuit = data.forcedSuit;
    this.forcedValue = data.forcedValue;
    this.timestamp = data.timestamp;
  }
}

export class UnlinkTriggeredEvent implements ISocketEvent {
  timestamp: number;
  constructor(data: UnlinkTriggeredEventData) {
    this.timestamp = data.timestamp;
  }
}

export class ParticipantRotationEvent implements ISocketEvent {
  x: number;
  y: number;
  z: number;
  constructor(data: ParticipantRotationEventData) {
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
  }
}

export class TrickResetEvent implements ISocketEvent {
  timestamp: number;
  constructor(data: TrickResetEventData) {
    this.timestamp = data.timestamp;
  }
}

export const socketEvents = {
  "mouse-down": MouseDownEvent,
  "camera-changed": CameraChangedEvent,
  "camera-update": CameraChangedEvent,
  // client emits 'trick-state-change' (no 'd') — registered under that name
  "trick-state-change": TrickStateChangedEvent,
  "card-selected": CardSelectedEvent,
  "card-forced": CardForcedEvent,
  "unlink-triggered": UnlinkTriggeredEvent,
  "participant-rotation": ParticipantRotationEvent,
  "trick-reset": TrickResetEvent,
  "landmark-index": MouseDownEvent,   // reuse generic shape: { index, senderId }
  "landmark-finish": MouseDownEvent,
  "gallery-skip": MouseDownEvent,
  "pointer-hit": MouseDownEvent,
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
    case "trick-state-change":
      return new TrickStateChangedEvent(data);
    case "card-selected":
      return new CardSelectedEvent(data);
    case "card-forced":
      return new CardForcedEvent(data);
    case "unlink-triggered":
      return new UnlinkTriggeredEvent(data);
    case "participant-rotation":
      return new ParticipantRotationEvent(data);
    case "trick-reset":
      return new TrickResetEvent(data);
    default:
      throw new Error(`Unknown socket event ${socketEvent}`);
  }
}
