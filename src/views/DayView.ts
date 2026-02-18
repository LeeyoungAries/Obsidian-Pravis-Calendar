import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";

const SLOT_HEIGHT = 48;
const HOURS = 24;

export interface DayViewCallbacks {
  onEventClick?: (event: Event) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export class DayView {
  private containerEl: HTMLElement;
  private eventStore: EventStore;
  private calendarStore: CalendarStore;
  private currentDate: Date;
  private callbacks: DayViewCallbacks;

  constructor(
    containerEl: HTMLElement,
    eventStore: EventStore,
    calendarStore: CalendarStore,
    currentDate: Date,
    callbacks: DayViewCallbacks
  ) {
    this.containerEl = containerEl;
    this.eventStore = eventStore;
    this.calendarStore = calendarStore;
    this.currentDate = currentDate;
    this.callbacks = callbacks;
  }

  setCurrentDate(d: Date): void {
    this.currentDate = d;
  }

  render(): void {
    this.containerEl.empty();
    const dayStart = new Date(this.currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(this.currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const events = this.eventStore.getEvents(dayStart, dayEnd);
    const visibleCalIds = new Set(this.calendarStore.getCalendars().filter((c) => c.visible).map((c) => c.id));
    const filtered = events.filter((e) => visibleCalIds.has(e.calendarId));

    const allDayEvents = filtered.filter((e) => e.allDay);
    const timedEvents = filtered.filter((e) => !e.allDay).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const wrapper = this.containerEl.createDiv("calendar-day-view");

    if (allDayEvents.length > 0) {
      const allDaySection = wrapper.createDiv("calendar-allday-section");
      allDaySection.createDiv("calendar-allday-label").setText("全天");
      const allDayList = allDaySection.createDiv("calendar-allday-list");
      allDayEvents.forEach((e) => {
        const chip = allDayList.createDiv("calendar-day-event-chip");
        chip.setText(e.title);
        chip.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
        chip.addEventListener("click", () => this.callbacks.onEventClick?.(e));
      });
    }

    const timeSection = wrapper.createDiv("calendar-day-timesection");
    const timeAxis = timeSection.createDiv("calendar-day-timeaxis");
    for (let h = 0; h < HOURS; h++) {
      const slot = timeAxis.createDiv("calendar-day-slot");
      slot.createDiv("calendar-day-slot-label").setText(`${h.toString().padStart(2, "0")}:00`);
      slot.style.height = `${SLOT_HEIGHT}px`;
      slot.addEventListener("click", () => {
        const d = new Date(this.currentDate);
        d.setHours(h, 0, 0, 0);
        this.callbacks.onSlotClick?.(d, h);
      });
    }

    const eventsArea = timeSection.createDiv("calendar-day-events");
    const eventsAreaInner = eventsArea.createDiv("calendar-day-events-inner");
    eventsAreaInner.style.height = `${HOURS * SLOT_HEIGHT}px`;

    timedEvents.forEach((e) => {
      let start = new Date(e.start);
      let end = new Date(e.end);
      if (start < dayStart) start = dayStart;
      if (end > dayEnd) end = dayEnd;
      const topPx = (start.getHours() + start.getMinutes() / 60) * SLOT_HEIGHT;
      const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
      const heightPx = Math.max(durationHours * SLOT_HEIGHT, 24);

      const bar = eventsAreaInner.createDiv("calendar-day-event-bar");
      bar.style.top = `${topPx}px`;
      bar.style.height = `${heightPx}px`;
      bar.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
      bar.createDiv("calendar-day-event-bar-title").setText(e.title);
      const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      bar.createDiv("calendar-day-event-bar-time").setText(timeStr);
      bar.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.callbacks.onEventClick?.(e);
      });
    });
  }
}
