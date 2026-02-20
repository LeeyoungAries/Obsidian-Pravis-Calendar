import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { getMonthGrid, isSameDay, toDateKey } from "../utils/date";
import { getLunarString } from "../utils/lunar";
import { makeEventDraggable, makeDropTarget } from "../components/EventCard";
import { setupMonthViewDragCreate } from "../utils/dragCreate";

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export interface MonthViewCallbacks {
  onDateClick?: (date: Date) => void;
  onEventSelect?: (event: Event) => void;
  onEventDblClick?: (event: Event) => void;
  onNoteLinkClick?: (event: Event, ev?: MouseEvent) => void;
  selectedEventId?: string | null;
  onDayEventsClick?: (date: Date, events: Event[]) => void;
  onCreate?: (start: Date, end: Date) => void;
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
        cell.dataset.date = String(new Date(cellDate).setHours(0, 0, 0, 0));
        const isCurrentMonth = cellDate.getMonth() === month;
        if (!isCurrentMonth) cell.addClass("calendar-cell-other-month");

        const dayNum = cell.createDiv("calendar-cell-day");
        dayNum.setText(String(cellDate.getDate()));
        if (isSameDay(cellDate, today)) dayNum.addClass("calendar-cell-today");
        const lunarStr = getLunarString(cellDate);
        if (lunarStr) {
          const lunarEl = cell.createDiv("calendar-cell-lunar");
          lunarEl.setText(lunarStr);
        }

        makeDropTarget(cell, (eventId) => {
          const evt = this.eventStore.getEvent(eventId);
          if (!evt) return;
          const targetStart = new Date(cellDate);
          targetStart.setHours(0, 0, 0, 0);
          const targetEnd = new Date(cellDate);
          targetEnd.setHours(23, 59, 59, 999);
          if (evt.allDay) {
            this.eventStore.updateEvent(eventId, {
              start: targetStart.toISOString(),
              end: targetEnd.toISOString(),
            });
          } else {
            const origStart = new Date(evt.start);
            const origEnd = new Date(evt.end);
            const duration = origEnd.getTime() - origStart.getTime();
            const newStart = new Date(cellDate);
            newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);
            this.eventStore.updateEvent(eventId, {
              start: newStart.toISOString(),
              end: newEnd.toISOString(),
            });
          }
        });

        const dayEvents = eventsByDay.get(toDateKey(cellDate)) ?? [];
        const list = cell.createDiv("calendar-cell-events");
        const maxVisible = 6;
        dayEvents.slice(0, maxVisible).forEach((e) => {
          const chip = list.createDiv("calendar-event-chip");
          if (e.type === "todo") chip.addClass("calendar-event-todo");
          if (e.completed) chip.addClass("calendar-event-completed");
          if (e.id === this.callbacks.selectedEventId) chip.addClass("calendar-event-selected");
          if (e.type === "todo") {
            chip.createSpan("calendar-event-todo-icon").setText(e.completed ? "✅" : "⭕");
          }
          chip.createSpan().setText(e.title);
          if ((e.notePaths ?? []).length > 0) {
            chip.style.display = "flex";
            chip.style.alignItems = "center";
            chip.style.gap = "2px";
            const linkIcon = chip.createSpan("calendar-event-note-link");
            linkIcon.setAttribute("aria-label", "打开关联笔记");
            linkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
            linkIcon.addEventListener("click", (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              this.callbacks.onNoteLinkClick?.(e, ev);
            });
          }
          chip.style.setProperty("--event-color", this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "var(--interactive-accent)");
          makeEventDraggable(chip, e);
          chip.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this.callbacks.onEventSelect?.(e);
          });
          chip.addEventListener("dblclick", (ev) => {
            ev.stopPropagation();
            this.callbacks.onEventDblClick?.(e);
          });
        });
        if (dayEvents.length > maxVisible) {
          const more = list.createDiv("calendar-event-more");
          more.setText(`+${dayEvents.length - maxVisible} 更多`);
          more.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this.callbacks.onDayEventsClick?.(cellDate, dayEvents);
          });
        }
      }
    }

    setupMonthViewDragCreate(gridEl, {
      onDateClick: (date) => this.callbacks.onDateClick?.(date),
      onCreate:
        this.callbacks.onCreate ??
        ((start) => this.callbacks.onDateClick?.(start)),
    });
  }
}
