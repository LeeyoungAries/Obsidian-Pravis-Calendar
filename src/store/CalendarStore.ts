import type { Calendar } from "../types";
import type { EventStore } from "./EventStore";

export class CalendarStore {
  constructor(private eventStore: EventStore) {}

  getCalendars(): Calendar[] {
    return this.eventStore.getCalendars();
  }

  updateCalendar(id: string, partial: Partial<Calendar>): void {
    this.eventStore.updateCalendar(id, partial);
  }

  toggleVisible(id: string): void {
    this.eventStore.toggleVisible(id);
  }
}
