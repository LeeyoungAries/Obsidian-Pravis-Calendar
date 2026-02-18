import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { getWeekDays, isSameDay } from "../utils/date";
import { makeEventDraggable, makeDropTarget } from "../components/EventCard";

const SLOT_HEIGHT = 48;
const HOURS = 24;
const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export interface WeekViewCallbacks {
  onEventClick?: (event: Event) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export class WeekView {
  private containerEl: HTMLElement;
  private eventStore: EventStore;
  private calendarStore: CalendarStore;
  private weekStartDay: number;
  private currentDate: Date;
  private callbacks: WeekViewCallbacks;

  constructor(
    containerEl: HTMLElement,
    eventStore: EventStore,
    calendarStore: CalendarStore,
    weekStartDay: number,
    currentDate: Date,
    callbacks: WeekViewCallbacks
  ) {
    this.containerEl = containerEl;
    this.eventStore = eventStore;
    this.calendarStore = calendarStore;
    this.weekStartDay = weekStartDay;
    this.currentDate = currentDate;
    this.callbacks = callbacks;
  }

  setCurrentDate(d: Date): void {
    this.currentDate = d;
  }

  render(): void {
    this.containerEl.empty();
    const days = getWeekDays(this.currentDate, this.weekStartDay);
    const weekStart = days[0];
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const events = this.eventStore.getEvents(weekStart, weekEnd);
    const visibleCalIds = new Set(this.calendarStore.getCalendars().filter((c) => c.visible).map((c) => c.id));
    const filtered = events.filter((e) => visibleCalIds.has(e.calendarId));

    const allDayEvents = filtered.filter((e) => e.allDay);
    const timedEvents = filtered.filter((e) => !e.allDay);

    const wrapper = this.containerEl.createDiv("calendar-week-view");

    if (allDayEvents.length > 0) {
      const allDaySection = wrapper.createDiv("calendar-week-allday");
      allDaySection.createDiv("calendar-week-allday-label").setText("全天");
      const allDayGrid = allDaySection.createDiv("calendar-week-allday-grid");
      days.forEach((dayDate) => {
        const col = allDayGrid.createDiv("calendar-week-allday-col");
        makeDropTarget(col, (eventId) => {
          const evt = this.eventStore.getEvent(eventId);
          if (!evt) return;
          const targetStart = new Date(dayDate);
          targetStart.setHours(0, 0, 0, 0);
          const targetEnd = new Date(dayDate);
          targetEnd.setHours(23, 59, 59, 999);
          if (evt.allDay) {
            this.eventStore.updateEvent(eventId, {
              start: targetStart.toISOString(),
              end: targetEnd.toISOString(),
            });
          } else {
            const origStart = new Date(evt.start);
            const duration = new Date(evt.end).getTime() - new Date(evt.start).getTime();
            const newStart = new Date(dayDate);
            newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);
            this.eventStore.updateEvent(eventId, {
              start: newStart.toISOString(),
              end: newEnd.toISOString(),
            });
          }
        });
        const dayEvents = allDayEvents.filter((e) => {
          const start = new Date(e.start);
          start.setHours(0, 0, 0, 0);
          const end = new Date(e.end);
          end.setHours(23, 59, 59, 999);
          return dayDate >= start && dayDate <= end;
        });
        dayEvents.forEach((e) => {
          const chip = col.createDiv("calendar-week-event-chip");
          if (e.type === "todo") chip.addClass("calendar-event-todo");
          if (e.completed) chip.addClass("calendar-event-completed");
          chip.setText(e.title);
          chip.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
          makeEventDraggable(chip, e);
          chip.addEventListener("click", () => this.callbacks.onEventClick?.(e));
        });
      });
    }

    const timeSection = wrapper.createDiv("calendar-week-timesection");
    const timeAxis = timeSection.createDiv("calendar-week-timeaxis");
    for (let h = 0; h < HOURS; h++) {
      const slot = timeAxis.createDiv("calendar-week-slot");
      slot.createDiv("calendar-week-slot-label").setText(`${h.toString().padStart(2, "0")}:00`);
      slot.style.height = `${SLOT_HEIGHT}px`;
    }

    const grid = timeSection.createDiv("calendar-week-grid");
    days.forEach((dayDate) => {
      const col = grid.createDiv("calendar-week-col");
      col.createDiv("calendar-week-col-header").setText(
        `${WEEKDAY_NAMES[dayDate.getDay()]} ${dayDate.getMonth() + 1}/${dayDate.getDate()}`
      );
      const colBody = col.createDiv("calendar-week-col-body");
      colBody.style.position = "relative";

      const slots = colBody.createDiv("calendar-week-col-slots");
      slots.style.height = `${HOURS * SLOT_HEIGHT}px`;
      for (let h = 0; h < HOURS; h++) {
        const slot = slots.createDiv("calendar-week-cell");
        slot.style.height = `${SLOT_HEIGHT}px`;
        const hour = h;
        makeDropTarget(slot, (eventId) => {
          const evt = this.eventStore.getEvent(eventId);
          if (!evt) return;
          const newStart = new Date(dayDate);
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
          const d = new Date(dayDate);
          d.setHours(hour, 0, 0, 0);
          this.callbacks.onSlotClick?.(d, hour);
        });
      }

      const eventsLayer = colBody.createDiv("calendar-week-events");
      eventsLayer.style.height = `${HOURS * SLOT_HEIGHT}px`;
      const dayEvents = timedEvents.filter((e) => isSameDay(new Date(e.start), dayDate));
      dayEvents.forEach((e) => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        const topPx = (start.getHours() + start.getMinutes() / 60) * SLOT_HEIGHT;
        const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
        const heightPx = Math.max(durationHours * SLOT_HEIGHT, 20);

        const bar = eventsLayer.createDiv("calendar-week-event-bar");
        if (e.type === "todo") bar.addClass("calendar-event-todo");
        if (e.completed) bar.addClass("calendar-event-completed");
        bar.style.top = `${topPx}px`;
        bar.style.height = `${heightPx}px`;
        bar.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
        makeEventDraggable(bar, e);
        bar.createDiv("calendar-week-event-bar-title").setText(e.title);
        bar.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.callbacks.onEventClick?.(e);
        });
      });
    });
  }
}
