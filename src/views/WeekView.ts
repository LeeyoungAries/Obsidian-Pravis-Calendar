import type { Event } from "../types";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import { getWeekDays, isSameDay } from "../utils/date";
import { makeEventDraggable, makeDropTarget } from "../components/EventCard";
import { computeOverlapLayout } from "../utils/overlapLayout";
import { computeAllDayLayout } from "../utils/allDayOverlapLayout";
import { setupWeekViewDragCreate } from "../utils/dragCreate";
import { setupWeekViewDragMove } from "../utils/dragMove";
import { makeEventResizable } from "../utils/dragResize";

const SLOT_HEIGHT = 48;
const HOURS = 24;
const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export interface WeekViewCallbacks {
  onEventSelect?: (event: Event) => void;
  onEventDblClick?: (event: Event) => void;
  selectedEventId?: string | null;
  onSlotClick?: (date: Date, hour: number) => void;
  onCreate?: (start: Date, end: Date) => void;
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
    const scrollWrapper = wrapper.createDiv("calendar-week-scroll-wrapper");

    const allDaySection = scrollWrapper.createDiv("calendar-week-allday");
    allDaySection.createDiv("calendar-week-allday-label").setText("全天");
    const allDayGrid = allDaySection.createDiv("calendar-week-allday-grid");
    const layoutItems = computeAllDayLayout(allDayEvents, days);
    const rowCount = layoutItems.length > 0 ? Math.max(...layoutItems.map((i) => i.row)) + 1 : 1;
    allDayGrid.style.gridTemplateRows = `repeat(${rowCount}, 22px)`;

    days.forEach((dayDate, colIndex) => {
      const col = allDayGrid.createDiv("calendar-week-allday-col");
      col.style.gridColumn = String(colIndex + 1);
      col.style.gridRow = `1 / ${rowCount + 1}`;
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
    });

    layoutItems.forEach((item) => {
      const bar = allDayGrid.createDiv("calendar-week-allday-bar");
      const span = item.endCol - item.startCol + 1;
      bar.style.gridColumn = `${item.startCol + 1} / span ${span}`;
      bar.style.gridRow = String(item.row + 1);
      if (item.type === "todo") bar.addClass("calendar-event-todo");
      if (item.completed) bar.addClass("calendar-event-completed");
      if (item.id === this.callbacks.selectedEventId) bar.addClass("calendar-event-selected");
      bar.setText(item.title);
      bar.style.setProperty("--event-color", this.calendarStore.getCalendars().find((c) => c.id === item.calendarId)?.color ?? "var(--interactive-accent)");
      makeEventDraggable(bar, item);
      bar.addEventListener("click", (ev) => {
        this.containerEl.querySelector(".calendar-event-selected")?.classList.remove("calendar-event-selected");
        (ev.currentTarget as HTMLElement).classList.add("calendar-event-selected");
        this.callbacks.onEventSelect?.(item);
      });
      bar.addEventListener("dblclick", () => this.callbacks.onEventDblClick?.(item));
    });

    const timeSection = scrollWrapper.createDiv("calendar-week-timesection");
    const timeAxis = timeSection.createDiv("calendar-week-timeaxis");
    const axisHeader = timeAxis.createDiv("calendar-week-timeaxis-header");
    axisHeader.setText("\u00A0");
    for (let h = 0; h < HOURS; h++) {
      const slot = timeAxis.createDiv("calendar-week-slot");
      slot.createDiv("calendar-week-slot-label").setText(`${h.toString().padStart(2, "0")}:00`);
      slot.style.height = `${SLOT_HEIGHT}px`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const grid = timeSection.createDiv("calendar-week-grid");
    days.forEach((dayDate) => {
      const col = grid.createDiv("calendar-week-col");
      const header = col.createDiv("calendar-week-col-header");
      header.setText(
        `${WEEKDAY_NAMES[dayDate.getDay()]} ${dayDate.getMonth() + 1}/${dayDate.getDate()}`
      );
      if (isSameDay(dayDate, today)) header.addClass("calendar-col-today");
      const colBody = col.createDiv("calendar-week-col-body");
      colBody.style.position = "relative";

      const slots = colBody.createDiv("calendar-week-col-slots");
      slots.style.height = `${HOURS * SLOT_HEIGHT}px`;
      for (let h = 0; h < HOURS; h++) {
        const slot = slots.createDiv("calendar-week-cell");
        slot.dataset.hour = String(h);
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
        slot.addEventListener("dblclick", () => {
          const d = new Date(dayDate);
          d.setHours(hour, 0, 0, 0);
          this.callbacks.onSlotClick?.(d, hour);
        });
      }

      const eventsLayer = colBody.createDiv("calendar-week-events");
      eventsLayer.style.height = `${HOURS * SLOT_HEIGHT}px`;
      const dayEvents = computeOverlapLayout(
        timedEvents.filter((e) => isSameDay(new Date(e.start), dayDate))
      );
      const dayIndex = days.indexOf(dayDate);
      dayEvents.forEach((e) => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        const topPx = (start.getHours() + start.getMinutes() / 60) * SLOT_HEIGHT;
        const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
        const heightPx = Math.max(durationHours * SLOT_HEIGHT, 30);

        const bar = eventsLayer.createDiv("calendar-week-event-bar");
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
        setupWeekViewDragMove(bar, e, days, SLOT_HEIGHT, grid, dayIndex, {
          onUpdate: (eventId, newStart, newEnd) => {
            this.eventStore.updateEvent(eventId, {
              start: newStart.toISOString(),
              end: newEnd.toISOString(),
              allDay: false,
            });
          },
        });
        bar.createDiv("calendar-week-event-bar-title").setText(e.title);
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
    });

    setupWeekViewDragCreate(grid, days, SLOT_HEIGHT, {
      onSlotClick: (date) => this.callbacks.onSlotClick?.(date, date.getHours()),
      onCreate:
        this.callbacks.onCreate ??
        ((start) => this.callbacks.onSlotClick?.(start, start.getHours())),
    });

    requestAnimationFrame(() => {
      const allday = scrollWrapper.querySelector(".calendar-week-allday");
      const height = allday instanceof HTMLElement ? allday.offsetHeight : 0;
      scrollWrapper.style.setProperty("--week-allday-height", `${height}px`);
    });

    // #region agent log
    requestAnimationFrame(() => {
      const contentArea = this.containerEl.closest(".calendar-content-area");
      const timeSection = scrollWrapper.querySelector(".calendar-week-timesection");
      const firstHeader = wrapper.querySelector(".calendar-week-col-header");
      const log = (msg: string, data: Record<string, unknown>) => {
        fetch("http://127.0.0.1:7244/ingest/b6a1d460-0ba5-4082-811d-b15c11d2bff7", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "WeekView.ts:render",
            message: msg,
            data,
            timestamp: Date.now(),
            hypothesisId: "A",
          }),
        }).catch(() => {});
      };
      if (contentArea) {
        log("contentArea scroll", {
          scrollHeight: contentArea.scrollHeight,
          clientHeight: contentArea.clientHeight,
          scrollTop: contentArea.scrollTop,
          overflow: getComputedStyle(contentArea).overflow,
        });
      }
      if (timeSection instanceof HTMLElement) {
        log("timeSection scroll", {
          scrollHeight: timeSection.scrollHeight,
          clientHeight: timeSection.clientHeight,
          scrollTop: timeSection.scrollTop,
          overflow: getComputedStyle(timeSection).overflow,
        });
      }
      if (firstHeader instanceof HTMLElement) {
        const cs = getComputedStyle(firstHeader);
        log("header computed", {
          position: cs.position,
          top: cs.top,
          zIndex: cs.zIndex,
        });
        let el: HTMLElement | null = firstHeader.parentElement;
        const overflowChain: string[] = [];
        while (el && el !== contentArea) {
          const o = getComputedStyle(el).overflow;
          if (o !== "visible") overflowChain.push(`${el.className}:${o}`);
          el = el.parentElement;
        }
        log("header ancestor overflow", { overflowChain });
      }
      contentArea?.addEventListener(
        "scroll",
        () => {
          log("scroll contentArea", {
            scrollTop: (contentArea as HTMLElement).scrollTop,
            hypothesisId: "C",
          });
        },
        { once: true }
      );
      if (timeSection instanceof HTMLElement) {
        timeSection.addEventListener(
          "scroll",
          () => {
            log("scroll timeSection", {
              scrollTop: timeSection.scrollTop,
              hypothesisId: "C",
            });
          },
          { once: true }
        );
      }
    });
    // #endregion
  }
}
