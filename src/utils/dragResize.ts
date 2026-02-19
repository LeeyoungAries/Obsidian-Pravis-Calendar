import type { Event } from "../types";
import { SLOTS_PER_HOUR } from "./timeSlot";

const MIN_DURATION_MINUTES = 15;

function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type ResizeUpdateCallback = (eventId: string, newStart: Date, newEnd: Date) => void;

export function makeEventResizable(
  barEl: HTMLElement,
  event: Event,
  slotHeight: number,
  onUpdate: ResizeUpdateCallback
): void {
  const timeEl = barEl.querySelector(".calendar-day-event-bar-time") as HTMLElement | null;

  const topHandle = barEl.createDiv("calendar-event-resize-handle calendar-event-resize-handle-top");
  const bottomHandle = barEl.createDiv("calendar-event-resize-handle");

  const slotPx = slotHeight / SLOTS_PER_HOUR;

  const setupBottomResize = (): void => {
    let startY = 0;
    let startEnd = new Date(0);

    const onMouseDown = (ev: MouseEvent): void => {
      ev.stopPropagation();
      ev.preventDefault();
      startY = ev.clientY;
      startEnd = new Date(event.end);
      const doc = barEl.ownerDocument;
      doc.addEventListener("mousemove", onMouseMove);
      doc.addEventListener("mouseup", onMouseUp);
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
      const slotDelta = Math.round((clientY - startY) / slotPx);
      const newEnd = new Date(startEnd);
      newEnd.setMinutes(newEnd.getMinutes() + slotDelta * 15);
      const start = new Date(event.start);
      const minEnd = new Date(start);
      minEnd.setMinutes(minEnd.getMinutes() + MIN_DURATION_MINUTES);
      return newEnd > minEnd ? newEnd : null;
    };

    const onMouseUp = (ev: MouseEvent): void => {
      const doc = barEl.ownerDocument;
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
      const newEnd = computeNewEnd(ev.clientY);
      if (newEnd) onUpdate(event.id, new Date(event.start), newEnd);
    };

    bottomHandle.addEventListener("mousedown", onMouseDown);
  };

  const setupTopResize = (): void => {
    let startY = 0;
    let startStart = new Date(0);

    const onMouseDown = (ev: MouseEvent): void => {
      ev.stopPropagation();
      ev.preventDefault();
      startY = ev.clientY;
      startStart = new Date(event.start);
      const doc = barEl.ownerDocument;
      doc.addEventListener("mousemove", onMouseMove);
      doc.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (ev: MouseEvent): void => {
      const newStart = computeNewStart(ev.clientY);
      if (!newStart) return;
      const end = new Date(event.end);
      const durationHours = (end.getTime() - newStart.getTime()) / (60 * 60 * 1000);
      const topPx = ((newStart.getHours() * 60 + newStart.getMinutes()) / 60) * slotHeight;
      barEl.style.top = `${topPx}px`;
      barEl.style.height = `${Math.max(durationHours * slotHeight, 30)}px`;
      if (timeEl) timeEl.setText(`${formatTime(newStart)}-${formatTime(end)}`);
    };

    const computeNewStart = (clientY: number): Date | null => {
      const slotDelta = Math.round((clientY - startY) / slotPx);
      const startMinutes = startStart.getHours() * 60 + startStart.getMinutes();
      const endMinutes = new Date(event.end).getHours() * 60 + new Date(event.end).getMinutes();
      const newStartMinutes = Math.max(0, Math.min(endMinutes - MIN_DURATION_MINUTES, startMinutes + slotDelta * 15));
      const newStart = new Date(startStart);
      newStart.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);
      return newStart;
    };

    const onMouseUp = (ev: MouseEvent): void => {
      const doc = barEl.ownerDocument;
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
      const newStart = computeNewStart(ev.clientY);
      if (newStart) onUpdate(event.id, newStart, new Date(event.end));
    };

    topHandle.addEventListener("mousedown", onMouseDown);
  };

  setupBottomResize();
  setupTopResize();

  bottomHandle.addEventListener("click", (ev) => ev.stopPropagation());
  topHandle.addEventListener("click", (ev) => ev.stopPropagation());
}
