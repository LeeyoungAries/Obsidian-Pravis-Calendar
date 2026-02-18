import type { Event } from "../types";

const MIN_DURATION_MINUTES = 15;

export function makeEventResizable(
  barEl: HTMLElement,
  event: Event,
  slotHeight: number,
  onUpdate: (eventId: string, newEnd: Date) => void
): void {
  const handle = barEl.createDiv("calendar-event-resize-handle");

  let startY = 0;
  let startEnd = new Date(0);

  const onMouseDown = (ev: MouseEvent): void => {
    ev.stopPropagation();
    ev.preventDefault();
    startY = ev.clientY;
    startEnd = new Date(event.end);
    document.addEventListener("mouseup", onMouseUp);
  };

  const computeNewEnd = (clientY: number): Date | null => {
    const slotDelta = Math.round((clientY - startY) / slotHeight);
    const newEnd = new Date(startEnd);
    newEnd.setMinutes(newEnd.getMinutes() + slotDelta * 60);
    const start = new Date(event.start);
    const minEnd = new Date(start);
    minEnd.setMinutes(minEnd.getMinutes() + MIN_DURATION_MINUTES);
    return newEnd > minEnd ? newEnd : null;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mouseup", onMouseUp);
    const newEnd = computeNewEnd(ev.clientY);
    if (newEnd) onUpdate(event.id, newEnd);
  };

  handle.addEventListener("mousedown", onMouseDown);
  handle.addEventListener("click", (ev) => ev.stopPropagation());
}
