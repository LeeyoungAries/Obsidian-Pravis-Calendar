import type { Event } from "../types";
import { yToMinutes, minutesToY } from "./timeSlot";

const DRAG_THRESHOLD = 4;

function createGhost(variant: "day" | "week", title: string, timeStr: string, color: string): HTMLElement {
  const ghost = document.createElement("div");
  ghost.className = variant === "day"
    ? "calendar-drag-ghost calendar-day-event-bar"
    : "calendar-drag-ghost calendar-week-event-bar";
  ghost.style.setProperty("--event-color", color);
  ghost.createDiv(variant === "day" ? "calendar-day-event-bar-title" : "calendar-week-event-bar-title").setText(title);
  if (variant === "day") ghost.createDiv("calendar-day-event-bar-time").setText(timeStr);
  return ghost;
}

export interface DayViewDragMoveCallbacks {
  onUpdate: (eventId: string, newStart: Date, newEnd: Date) => void;
}

export function setupDayViewDragMove(
  barEl: HTMLElement,
  event: Event,
  baseDate: Date,
  slotHeight: number,
  containerEl: HTMLElement,
  callbacks: DayViewDragMoveCallbacks
): void {
  let ghost: HTMLElement | null = null;
  let startY = 0;
  let startMinutes = 0;
  let durationMinutes = 0;
  let hasMoved = false;

  const onMouseDown = (ev: MouseEvent): void => {
    ev.stopPropagation();
    const rect = containerEl.getBoundingClientRect();
    startY = ev.clientY;
    const start = new Date(event.start);
    startMinutes = start.getHours() * 60 + start.getMinutes();
    durationMinutes = (new Date(event.end).getTime() - start.getTime()) / 60000;
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (Math.abs(ev.clientY - startY) > DRAG_THRESHOLD) hasMoved = true;
    if (!hasMoved) return;
    const rect = containerEl.getBoundingClientRect();
    const relY = ev.clientY - rect.top;
    const newMinutes = yToMinutes(relY, slotHeight);
    const snappedMinutes = Math.max(0, Math.min(1439 - durationMinutes, newMinutes));
    const topPx = minutesToY(snappedMinutes, slotHeight);
    const heightPx = (durationMinutes / 60) * slotHeight;

    if (!ghost) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      const color = barEl.style.getPropertyValue("--event-color") || "var(--interactive-accent)";
      ghost = createGhost("day", event.title, timeStr, color);
      Object.assign(ghost.style, {
        position: "absolute",
        left: barEl.style.left,
        right: barEl.style.right,
        width: barEl.style.width,
        zIndex: "10",
      });
      containerEl.appendChild(ghost);
    }
    ghost.style.top = `${topPx}px`;
    ghost.style.height = `${Math.max(heightPx, 30)}px`;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    if (!hasMoved) return;
    const rect = containerEl.getBoundingClientRect();
    const relY = ev.clientY - rect.top;
    const newMinutes = yToMinutes(relY, slotHeight);
    const snappedMinutes = Math.max(0, Math.min(1439 - durationMinutes, newMinutes));
    const newStart = new Date(baseDate);
    newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    callbacks.onUpdate(event.id, newStart, newEnd);
  };

  barEl.addEventListener("mousedown", onMouseDown);
}

export interface WeekViewDragMoveCallbacks {
  onUpdate: (eventId: string, newStart: Date, newEnd: Date) => void;
}

function getDayIndexFromClientX(gridEl: HTMLElement, clientX: number): number {
  const cols = gridEl.querySelectorAll(".calendar-week-col");
  for (let i = 0; i < cols.length; i++) {
    const rect = cols[i].getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) return i;
  }
  return -1;
}

export function setupWeekViewDragMove(
  barEl: HTMLElement,
  event: Event,
  days: Date[],
  slotHeight: number,
  gridEl: HTMLElement,
  initialDayIndex: number,
  callbacks: WeekViewDragMoveCallbacks
): void {
  let ghost: HTMLElement | null = null;
  let ghostParent: HTMLElement | null = null;
  let startY = 0;
  let startMinutes = 0;
  let durationMinutes = 0;
  let hasMoved = false;

  const onMouseDown = (ev: MouseEvent): void => {
    ev.stopPropagation();
    startY = ev.clientY;
    const start = new Date(event.start);
    startMinutes = start.getHours() * 60 + start.getMinutes();
    durationMinutes = (new Date(event.end).getTime() - start.getTime()) / 60000;
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (Math.abs(ev.clientY - startY) > DRAG_THRESHOLD) hasMoved = true;
    if (!hasMoved) return;
    const dayIndex = getDayIndexFromClientX(gridEl, ev.clientX);
    const targetDayIndex = dayIndex >= 0 ? dayIndex : initialDayIndex;
    const targetCol = gridEl.querySelectorAll(".calendar-week-col")[targetDayIndex];
    const eventsLayer = targetCol?.querySelector(".calendar-week-events") as HTMLElement | null;
    if (!eventsLayer) return;

    const rect = eventsLayer.getBoundingClientRect();
    const relY = ev.clientY - rect.top;
    const newMinutes = yToMinutes(relY, slotHeight);
    const snappedMinutes = Math.max(0, Math.min(1439 - durationMinutes, newMinutes));
    const topPx = minutesToY(snappedMinutes, slotHeight);
    const heightPx = (durationMinutes / 60) * slotHeight;

    if (!ghost) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      const color = barEl.style.getPropertyValue("--event-color") || "var(--interactive-accent)";
      ghost = createGhost("week", event.title, timeStr, color);
      Object.assign(ghost.style, {
        position: "absolute",
        left: barEl.style.left,
        right: barEl.style.right,
        width: barEl.style.width,
        zIndex: "10",
      });
      ghostParent = eventsLayer;
      eventsLayer.appendChild(ghost);
    } else if (ghostParent !== eventsLayer) {
      ghost.remove();
      ghostParent = eventsLayer;
      eventsLayer.appendChild(ghost);
    }
    ghost.style.top = `${topPx}px`;
    ghost.style.height = `${Math.max(heightPx, 30)}px`;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    if (!hasMoved) return;
    const dayIndex = getDayIndexFromClientX(gridEl, ev.clientX);
    const targetDayIndex = dayIndex >= 0 ? dayIndex : initialDayIndex;
    const targetDate = days[targetDayIndex];
    const eventsLayer = gridEl.querySelectorAll(".calendar-week-col")[targetDayIndex]?.querySelector(".calendar-week-events");
    const rect = eventsLayer?.getBoundingClientRect();
    const relY = rect ? ev.clientY - rect.top : 0;
    const newMinutes = yToMinutes(relY, slotHeight);
    const snappedMinutes = Math.max(0, Math.min(1439 - durationMinutes, newMinutes));
    const newStart = new Date(targetDate);
    newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    callbacks.onUpdate(event.id, newStart, newEnd);
  };

  barEl.addEventListener("mousedown", onMouseDown);
}
