import { SocketEvent } from "../../../shared/SocketEvents";
import { SocketEventService } from "./SocketEventService";

export class TypedSocketEventService<T> {
  eventService: SocketEventService;
  event: SocketEvent;

  constructor(eventService: SocketEventService, event: SocketEvent) {
    this.eventService = eventService;
    this.event = event;
  }

  addEventListener(callback: (data: T) => void) {
    this.eventService.addEventListener<T>(this.event, callback);
  }

  emit(data: T) {
    this.eventService.emit(this.event, data);
  }
}
