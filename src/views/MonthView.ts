import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { getMonthGrid, isSameDay, toDateKey } from "../utils/date";

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export interface MonthViewCallbacks {
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  onDayEventsClick?: (date: Date, events: Event[]) => void;
}

export class MonthView {
  private containerEl: HTMLElement;
  private eventStore: EventStore;
  private calendarStore: CalendarStore;
  private weekStartDay: number;
  private currentDate: Date;
  private callbacks: MonthViewCallbacks;

  constructor(
    containerEl: HTMLElement,
    eventStore: EventStore,
    calendarStore: CalendarStore,
    weekStartDay: number,
    currentDate: Date,
    callbacks: MonthViewCallbacks
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
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const grid = getMonthGrid(year, month, this.weekStartDay);

    const start = grid[0][0];
    const end = grid[5][6];
    const events = this.eventStore.getEvents(start, end);
    const visibleCalIds = new Set(this.calendarStore.getCalendars().filter((c) => c.visible).map((c) => c.id));
    const filteredEvents = events.filter((e) => visibleCalIds.has(e.calendarId));

    const eventsByDay = new Map<string, Event[]>();
    for (const e of filteredEvents) {
      const startDay = new Date(e.start);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(e.end);
      endDay.setHours(23, 59, 59, 999);
      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        if (!eventsByDay.has(key)) eventsByDay.set(key, []);
        eventsByDay.get(key)!.push(e);
      }
    }

    const weekdays = this.containerEl.createDiv("calendar-month-weekdays");
    const reordered = [...WEEKDAY_NAMES.slice(this.weekStartDay), ...WEEKDAY_NAMES.slice(0, this.weekStartDay)];
    reordered.forEach((name) => {
      weekdays.createDiv("calendar-weekday").setText(name);
    });

    const gridEl = this.containerEl.createDiv("calendar-month-grid");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const week of grid) {
      for (const cellDate of week) {
        const cell = gridEl.createDiv("calendar-month-cell");
        const isCurrentMonth = cellDate.getMonth() === month;
        if (!isCurrentMonth) cell.addClass("calendar-cell-other-month");

        const dayNum = cell.createDiv("calendar-cell-day");
        dayNum.setText(String(cellDate.getDate()));
        if (isSameDay(cellDate, today)) dayNum.addClass("calendar-cell-today");

        cell.addEventListener("click", (ev) => {
          if ((ev.target as HTMLElement).closest(".calendar-event-chip, .calendar-event-more")) return;
          this.callbacks.onDateClick?.(cellDate);
        });

        const dayEvents = eventsByDay.get(toDateKey(cellDate)) ?? [];
        const list = cell.createDiv("calendar-cell-events");
        dayEvents.slice(0, 3).forEach((e) => {
          const chip = list.createDiv("calendar-event-chip");
          chip.setText(e.title);
          chip.style.borderLeftColor = this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "#007AFF";
          chip.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this.callbacks.onEventClick?.(e);
          });
        });
        if (dayEvents.length > 3) {
          const more = list.createDiv("calendar-event-more");
          more.setText(`+${dayEvents.length - 3} 更多`);
          more.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this.callbacks.onDayEventsClick?.(cellDate, dayEvents);
          });
        }
      }
    }
  }
}
