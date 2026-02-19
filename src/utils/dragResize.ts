import type { Event } from "../types";
import { SLOTS_PER_HOUR } from "./timeSlot";

const MIN_DURATION_MINUTES = 15;

function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function makeEventResizable(
  barEl: HTMLElement,
  event: Event,
  slotHeight: number,
  onUpdate: (eventId: string, newEnd: Date) => void
): void {
  const handle = barEl.createDiv("calendar-event-resize-handle");
  const timeEl = barEl.querySelector(".calendar-day-event-bar-time") as HTMLElement | null;

  let startY = 0;
  let startEnd = new Date(0);

  const onMouseDown = (ev: MouseEvent): void => {
    ev.stopPropagation();
    ev.preventDefault();
    startY = ev.clientY;
    startEnd = new Date(event.end);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    const newEnd = computeNewEnd(ev.clientY);
    if (!newEnd) return;
    const start = new Date(event.start);
    const durationHours = (newEnd.getTime() - start.getTime()) / (60 * 60 * 1000);
    barEl.style.height = `${Math.max(durationHours * slotHeight, 30)}px`;
    if (timeEl) timeEl.setText(`${formatTime(start)}-${formatTime(newEnd)}`);
  };

  const computeNewEnd = (clientY: number): Date | null => {
    const slotDelta = Math.round((clientY - startY) / (slotHeight / SLOTS_PER_HOUR));
    const newEnd = new Date(startEnd);
    newEnd.setMinutes(newEnd.getMinutes() + slotDelta * 15);
    const start = new Date(event.start);
    const minEnd = new Date(start);
    minEnd.setMinutes(minEnd.getMinutes() + MIN_DURATION_MINUTES);
    return newEnd > minEnd ? newEnd : null;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const newEnd = computeNewEnd(ev.clientY);
    if (newEnd) onUpdate(event.id, newEnd);
  };

  handle.addEventListener("mousedown", onMouseDown);
  handle.addEventListener("click", (ev) => ev.stopPropagation());
}
