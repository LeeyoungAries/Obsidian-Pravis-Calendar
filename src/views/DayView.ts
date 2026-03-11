import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { makeEventDraggable, makeDropTarget } from "../components/EventCard";
import { computeOverlapLayout } from "../utils/overlapLayout";
import { setupDayViewDragCreate } from "../utils/dragCreate";
import { setupDayViewDragMove } from "../utils/dragMove";
import { makeEventResizable } from "../utils/dragResize";

const SLOT_HEIGHT = 48;
const HOURS = 24;

export interface DayViewCallbacks {
  onEventSelect?: (event: Event) => void;
  onEventDblClick?: (event: Event) => void;
  onNoteLinkClick?: (event: Event, ev?: MouseEvent) => void;
  selectedEventId?: string | null;
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
        if (e.id === this.callbacks.selectedEventId) chip.addClass("calendar-event-selected");
        if (e.type === "todo") {
          chip.createSpan("calendar-event-todo-icon").setText(e.completed ? "✅" : "⭕");
        }
        const titleSpan = chip.createSpan();
        titleSpan.setText(e.title);
        if ((e.notePaths ?? []).length > 0) {
          chip.style.display = "flex";
          chip.style.alignItems = "center";
          chip.style.gap = "2px";
          const linkIcon = chip.createSpan("calendar-event-note-link");
          linkIcon.setAttribute("aria-label", "打开关联笔记");
          linkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
          linkIcon.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            this.callbacks.onNoteLinkClick?.(e, ev);
          });
        }
        chip.style.setProperty("--event-color", this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "var(--interactive-accent)");
        makeEventDraggable(chip, e);
        chip.addEventListener("click", (ev) => {
          this.containerEl.querySelector(".calendar-event-selected")?.classList.remove("calendar-event-selected");
          (ev.currentTarget as HTMLElement).classList.add("calendar-event-selected");
          this.callbacks.onEventSelect?.(e);
        });
        chip.addEventListener("dblclick", () => this.callbacks.onEventDblClick?.(e));
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
      slot.addEventListener("dblclick", () => {
        const d = new Date(this.currentDate);
        d.setHours(hour, 0, 0, 0);
        this.callbacks.onSlotClick?.(d, hour);
      });
    }

    const eventsArea = timeSection.createDiv("calendar-day-events");
    const eventsAreaInner = eventsArea.createDiv("calendar-day-events-inner");
    eventsAreaInner.style.height = `${HOURS * SLOT_HEIGHT}px`;

    setupDayViewDragCreate(eventsAreaInner, this.currentDate, SLOT_HEIGHT, {
      onSlotClick: (date) => this.callbacks.onSlotClick?.(date, date.getHours()),
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
      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (60 * 60 * 1000);
      const durationMin = durationMs / (60 * 1000);
      const heightPx = Math.max(durationHours * SLOT_HEIGHT, 20);

      const bar = eventsAreaInner.createDiv("calendar-day-event-bar");
      if (durationMin <= 45) bar.addClass("calendar-event-compact");
      if (e.type === "todo") bar.addClass("calendar-event-todo");
      if (e.completed) bar.addClass("calendar-event-completed");
      if (e.id === this.callbacks.selectedEventId) bar.addClass("calendar-event-selected");
      bar.style.top = `${topPx}px`;
      bar.style.height = `${heightPx}px`;
      const n = e.totalColumns || 1;
      const gap = 2;
      bar.style.width = `calc(${100 / n}% - ${gap}px)`;
      bar.style.left =
        e.column === 0 ? "2px" : `calc(${(e.column * 100) / n}% + ${gap}px)`;
      bar.style.right = "auto";
      bar.style.setProperty("--event-color", this.calendarStore.getCalendars().find((c) => c.id === e.calendarId)?.color ?? "var(--interactive-accent)");
      setupDayViewDragMove(bar, e, this.currentDate, SLOT_HEIGHT, eventsAreaInner, {
        onUpdate: (eventId, newStart, newEnd) => {
          this.eventStore.updateEvent(eventId, {
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
            allDay: false,
          });
        },
      });
      const titleWrap = bar.createDiv("calendar-day-event-bar-title");
      titleWrap.style.display = "flex";
      titleWrap.style.alignItems = "center";
      titleWrap.style.gap = "2px";
      titleWrap.style.minWidth = "0";
      if (e.type === "todo") {
        titleWrap.createSpan("calendar-event-todo-icon").setText(e.completed ? "✅" : "⭕");
      }
      if ((e.notePaths ?? []).length > 0) {
        const linkIcon = titleWrap.createSpan("calendar-event-note-link");
        linkIcon.setAttribute("aria-label", "打开关联笔记");
        linkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
        linkIcon.addEventListener("click", (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          this.callbacks.onNoteLinkClick?.(e, ev);
        });
      }
      const titleText = titleWrap.createSpan("calendar-event-bar-title-text");
      titleText.setText(e.title);
      const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      bar.createDiv("calendar-day-event-bar-time").setText(timeStr);
      bar.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.containerEl.querySelector(".calendar-event-selected")?.classList.remove("calendar-event-selected");
        (ev.currentTarget as HTMLElement).classList.add("calendar-event-selected");
        this.callbacks.onEventSelect?.(e);
      });
      bar.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        this.callbacks.onEventDblClick?.(e);
      });
      makeEventResizable(bar, e, SLOT_HEIGHT, (eventId, newStart, newEnd) => {
        this.eventStore.updateEvent(eventId, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        });
      });
    });
  }
}
