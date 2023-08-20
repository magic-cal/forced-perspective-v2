export const socketEvents = {
  "mouse-down": {
    x: 0,
    y: 0,
  },
  "camera-changed": {
    x: 0,
    y: 0,
    z: 0,
  },
} as const;

export type SocketEvent = keyof typeof socketEvents;

export type SocketEventDataType<T extends SocketEvent> =
  (typeof socketEvents)[T];

// export type SocketEvents = {
//   "mouse-down": {
//     x: number;
//     y: number;
//   };
//   "camera-changed": {
//     x: number;
//     y: number;
//     z: number;
//   };
// };

// export type SocketEvent = keyof SocketEvents;
// export type SocketEventCallback<T extends SocketEvent> = (
//   data: SocketEvents[T]
// ) => void;
