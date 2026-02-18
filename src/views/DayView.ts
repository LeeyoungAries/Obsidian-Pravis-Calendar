import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { makeEventDraggable, makeDropTarget } from "../components/EventCard";
import { computeOverlapLayout } from "../utils/overlapLayout";
import { setupDayViewDragCreate } from "../utils/dragCreate";
import { makeEventResizable } from "../utils/dragResize";

const SLOT_HEIGHT = 48;
const HOURS = 24;

export interface DayViewCallbacks {
  onEventClick?: (event: Event) => void;
  onSlotClick?: (date: Date, hour: number) => void;
  onCreate?: (start: Date, end: Date) => void;
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
    const timedEvents = computeOverlapLayout(
      filtered.filter((e) => !e.allDay)
    );

    const wrapper = this.containerEl.createDiv("calendar-day-view");

    const allDaySection = wrapper.createDiv("calendar-allday-section");
    allDaySection.createDiv("calendar-allday-label").setText("全天");
    const allDayList = allDaySection.createDiv("calendar-allday-list");
    makeDropTarget(allDaySection, (eventId) => {
      const evt = this.eventStore.getEvent(eventId);
      if (!evt) return;
      const targetStart = new Date(this.currentDate);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(this.currentDate);
      targetEnd.setHours(23, 59, 59, 999);
      this.eventStore.updateEvent(eventId, {
        start: targetStart.toISOString(),
        end: targetEnd.toISOString(),
        allDay: true,
      });
    });
    if (allDayEvents.length > 0) {
      allDayEvents.forEach((e) => {
        const chip = allDayList.createDiv("calendar-day-event-chip");
        if (e.type === "todo") chip.addClass("calendar-event-todo");
        if (e.completed) chip.addClass("calendar-event-completed");
        chip.setText(e.title);
        chip.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
        makeEventDraggable(chip, e);
        chip.addEventListener("click", () => this.callbacks.onEventClick?.(e));
      });
    }

    const timeSection = wrapper.createDiv("calendar-day-timesection");
    const timeAxis = timeSection.createDiv("calendar-day-timeaxis");
    for (let h = 0; h < HOURS; h++) {
      const slot = timeAxis.createDiv("calendar-day-slot");
      slot.createDiv("calendar-day-slot-label").setText(`${h.toString().padStart(2, "0")}:00`);
      slot.style.height = `${SLOT_HEIGHT}px`;
      const hour = h;
      makeDropTarget(slot, (eventId) => {
        const evt = this.eventStore.getEvent(eventId);
        if (!evt) return;
        const newStart = new Date(this.currentDate);
        newStart.setHours(hour, 0, 0, 0);
        const duration = new Date(evt.end).getTime() - new Date(evt.start).getTime();
        const newEnd = new Date(newStart.getTime() + duration);
        this.eventStore.updateEvent(eventId, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          allDay: false,
        });
      });
      slot.addEventListener("click", () => {
        const d = new Date(this.currentDate);
        d.setHours(hour, 0, 0, 0);
        this.callbacks.onSlotClick?.(d, hour);
      });
    }

    const eventsArea = timeSection.createDiv("calendar-day-events");
    const eventsAreaInner = eventsArea.createDiv("calendar-day-events-inner");
    eventsAreaInner.style.height = `${HOURS * SLOT_HEIGHT}px`;

    setupDayViewDragCreate(eventsAreaInner, this.currentDate, SLOT_HEIGHT, {
      onSlotClick: (date, hour) => {
        const d = new Date(date);
        d.setHours(hour, 0, 0, 0);
        this.callbacks.onSlotClick?.(d, hour);
      },
      onCreate:
        this.callbacks.onCreate ??
        ((start) => this.callbacks.onSlotClick?.(start, start.getHours())),
    });

    timedEvents.forEach((e) => {
      let start = new Date(e.start);
      let end = new Date(e.end);
      if (start < dayStart) start = dayStart;
      if (end > dayEnd) end = dayEnd;
      const topPx = (start.getHours() + start.getMinutes() / 60) * SLOT_HEIGHT;
      const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
      const heightPx = Math.max(durationHours * SLOT_HEIGHT, 30);

      const bar = eventsAreaInner.createDiv("calendar-day-event-bar");
      if (e.type === "todo") bar.addClass("calendar-event-todo");
      if (e.completed) bar.addClass("calendar-event-completed");
      bar.style.top = `${topPx}px`;
      bar.style.height = `${heightPx}px`;
      const n = e.totalColumns || 1;
      const gap = 2;
      bar.style.width = `calc(${100 / n}% - ${gap}px)`;
      bar.style.left =
        e.column === 0 ? "2px" : `calc(${(e.column * 100) / n}% + ${gap}px)`;
      bar.style.right = "auto";
      bar.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
      makeEventDraggable(bar, e);
      bar.createDiv("calendar-day-event-bar-title").setText(e.title);
      const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      bar.createDiv("calendar-day-event-bar-time").setText(timeStr);
      bar.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.callbacks.onEventClick?.(e);
      });
      makeEventResizable(bar, e, SLOT_HEIGHT, (eventId, newEnd) => {
        this.eventStore.updateEvent(eventId, { end: newEnd.toISOString() });
      });
    });
  }
}
