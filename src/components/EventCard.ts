import type { Event } from "../types";
import { setDragEventId, getDragEventId } from "../utils/drag";

export function makeEventDraggable(el: HTMLElement, event: Event): void {
  el.setAttribute("draggable", "true");
  el.addEventListener("dragstart", (ev) => {
    if (ev.dataTransfer) {
      setDragEventId(ev.dataTransfer, event.id);
      el.addClass("calendar-dragging");
    }
  });
  el.addEventListener("dragend", () => el.removeClass("calendar-dragging"));
}

export function makeDropTarget(
  el: HTMLElement,
  onDrop: (eventId: string) => void,
  checkAccept?: (eventId: string) => boolean
): void {
  el.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    el.addClass("calendar-drop-over");
  });
  el.addEventListener("dragleave", () => el.removeClass("calendar-drop-over"));
  el.addEventListener("drop", (ev) => {
    ev.preventDefault();
    el.removeClass("calendar-drop-over");
    const eventId = ev.dataTransfer ? getDragEventId(ev.dataTransfer) : null;
    if (eventId && (!checkAccept || checkAccept(eventId))) onDrop(eventId);
  });
}
