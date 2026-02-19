import { yToMinutes, minutesToY } from "./timeSlot";

const DRAG_THRESHOLD = 4;

export interface DragCreateCallbacks {
  onSlotClick: (date: Date) => void;
  onCreate: (start: Date, end: Date) => void;
}

function createOverlay(containerEl: HTMLElement): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "calendar-drag-create-preview";
  overlay.style.position = "absolute";
  overlay.style.left = "4px";
  overlay.style.right = "4px";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "20";
  return overlay;
}

export function setupDayViewDragCreate(
  containerEl: HTMLElement,
  baseDate: Date,
  slotHeight: number,
  callbacks: DragCreateCallbacks
): void {
  let startY = 0;
  let startMinutes = 0;
  let overlay: HTMLElement | null = null;
  let hasMoved = false;

  const getMinutesFromY = (clientY: number): number => {
    const rect = containerEl.getBoundingClientRect();
    const relY = clientY - rect.top;
    return yToMinutes(relY, slotHeight);
  };

  const onMouseDown = (ev: MouseEvent): void => {
    if ((ev.target as HTMLElement).closest(".calendar-day-event-bar")) return;
    startY = ev.clientY;
    startMinutes = getMinutesFromY(ev.clientY);
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (Math.abs(ev.clientY - startY) > DRAG_THRESHOLD) hasMoved = true;
    if (!hasMoved) return;
    const endMinutes = getMinutesFromY(ev.clientY);
    const slotStart = Math.min(startMinutes, endMinutes);
    const slotEnd = Math.max(startMinutes, endMinutes);
    const durationMinutes = Math.max(15, slotEnd - slotStart);
    const topPx = minutesToY(slotStart, slotHeight);
    const heightPx = Math.max((durationMinutes / 60) * slotHeight, 30);

    if (!overlay) {
      overlay = createOverlay(containerEl);
      containerEl.appendChild(overlay);
    }
    overlay.style.top = `${topPx}px`;
    overlay.style.height = `${heightPx}px`;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (hasMoved) {
      const endMinutes = getMinutesFromY(ev.clientY);
      const slotStart = Math.min(startMinutes, endMinutes);
      const slotEnd = Math.max(startMinutes, endMinutes);
      const start = new Date(baseDate);
      start.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
      const end = new Date(baseDate);
      end.setHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);
      if (slotStart === slotEnd) end.setMinutes(end.getMinutes() + 15, 0, 0);
      callbacks.onCreate(start, end);
    }
  };

  const onDblClick = (ev: MouseEvent): void => {
    if ((ev.target as HTMLElement).closest(".calendar-day-event-bar")) return;
    const minutes = getMinutesFromY(ev.clientY);
    const d = new Date(baseDate);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    callbacks.onSlotClick(d);
  };

  containerEl.addEventListener("mousedown", onMouseDown);
  containerEl.addEventListener("dblclick", onDblClick);
}

export function setupWeekViewDragCreate(
  gridEl: HTMLElement,
  days: Date[],
  slotHeight: number,
  callbacks: DragCreateCallbacks
): void {
  let startDayIndex = 0;
  let startMinutes = 0;
  let startX = 0;
  let startY = 0;
  let overlay: HTMLElement | null = null;
  let hasMoved = false;

  const getSlotAt = (clientX: number, clientY: number): { dayIndex: number; minutes: number } | null => {
    const cols = gridEl.querySelectorAll(".calendar-week-col");
    let dayIndex = -1;
    for (let i = 0; i < cols.length; i++) {
      const rect = cols[i].getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        dayIndex = i;
        break;
      }
    }
    if (dayIndex < 0 || dayIndex >= days.length) return null;
    const col = cols[dayIndex];
    const eventsLayer = col.querySelector(".calendar-week-events") as HTMLElement | null;
    if (!eventsLayer) return { dayIndex, minutes: 0 };
    const rect = eventsLayer.getBoundingClientRect();
    const relY = clientY - rect.top;
    const minutes = yToMinutes(relY, slotHeight);
    return { dayIndex, minutes };
  };

  const onMouseDown = (ev: MouseEvent): void => {
    const target = ev.target as HTMLElement;
    if (target.closest(".calendar-week-event-bar")) return;
    const cell = target.closest(".calendar-week-cell") as HTMLElement | null;
    if (!cell) return;
    const col = cell.closest(".calendar-week-col");
    if (!col) return;
    const cols = gridEl.querySelectorAll(".calendar-week-col");
    startDayIndex = Array.from(cols).indexOf(col);
    const slot = getSlotAt(ev.clientX, ev.clientY);
    startMinutes = slot?.minutes ?? parseInt(cell.dataset.hour ?? "0", 10) * 60;
    startX = ev.clientX;
    startY = ev.clientY;
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (
      Math.abs(ev.clientX - startX) > DRAG_THRESHOLD ||
      Math.abs(ev.clientY - startY) > DRAG_THRESHOLD
    ) {
      hasMoved = true;
    }
    if (!hasMoved) return;
    const endSlot = getSlotAt(ev.clientX, ev.clientY);
    if (!endSlot) return;
    const slotStart = Math.min(startMinutes, endSlot.minutes);
    const slotEnd = Math.max(startMinutes, endSlot.minutes);
    const durationMinutes = Math.max(15, slotEnd - slotStart);
    const targetCol = gridEl.querySelectorAll(".calendar-week-col")[endSlot.dayIndex];
    const eventsLayer = targetCol?.querySelector(".calendar-week-events") as HTMLElement | null;
    if (!eventsLayer) return;
    const rect = eventsLayer.getBoundingClientRect();
    const topPx = minutesToY(slotStart, slotHeight);
    const heightPx = Math.max((durationMinutes / 60) * slotHeight, 30);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "calendar-drag-create-preview";
      overlay.style.position = "absolute";
      overlay.style.left = "2px";
      overlay.style.right = "2px";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "20";
    }
    if (overlay.parentElement !== eventsLayer) {
      overlay.remove();
      eventsLayer.appendChild(overlay);
    }
    overlay.style.top = `${topPx}px`;
    overlay.style.height = `${heightPx}px`;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    const endSlot = getSlotAt(ev.clientX, ev.clientY);
    if (hasMoved) {
      if (!endSlot) {
        const start = new Date(days[startDayIndex]);
        start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 15, 0, 0);
        callbacks.onCreate(start, end);
      } else {
        const slotStart = Math.min(startMinutes, endSlot.minutes);
        const slotEnd = Math.max(startMinutes, endSlot.minutes);
        const start = new Date(days[startDayIndex]);
        start.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
        const end = new Date(days[endSlot.dayIndex]);
        end.setHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);
        if (slotStart === slotEnd) end.setMinutes(end.getMinutes() + 15, 0, 0);
        callbacks.onCreate(start, end);
      }
    }
  };

  const onDblClick = (ev: MouseEvent): void => {
    const target = ev.target as HTMLElement;
    if (target.closest(".calendar-week-event-bar")) return;
    const slot = getSlotAt(ev.clientX, ev.clientY);
    if (!slot) return;
    const d = new Date(days[slot.dayIndex]);
    d.setHours(Math.floor(slot.minutes / 60), slot.minutes % 60, 0, 0);
    callbacks.onSlotClick(d);
  };

  gridEl.addEventListener("mousedown", onMouseDown);
  gridEl.addEventListener("dblclick", onDblClick);
}

export interface MonthDragCreateCallbacks {
  onDateClick: (date: Date) => void;
  onCreate: (start: Date, end: Date) => void;
}

export function setupMonthViewDragCreate(
  gridEl: HTMLElement,
  callbacks: MonthDragCreateCallbacks
): void {
  let startX = 0;
  let startY = 0;
  let startDate: Date | null = null;
  let hasMoved = false;

  const getCellDate = (el: HTMLElement | null): Date | null => {
    const cell = el?.closest(".calendar-month-cell") as HTMLElement | null;
    if (!cell?.dataset.date) return null;
    const t = parseInt(cell.dataset.date, 10);
    return isNaN(t) ? null : new Date(t);
  };

  const onMouseDown = (ev: MouseEvent): void => {
    const target = ev.target as HTMLElement;
    if (target.closest(".calendar-event-chip, .calendar-event-more")) return;
    const cell = target.closest(".calendar-month-cell") as HTMLElement | null;
    if (!cell?.dataset.date) return;
    startDate = getCellDate(cell);
    startX = ev.clientX;
    startY = ev.clientY;
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (
      Math.abs(ev.clientX - startX) > DRAG_THRESHOLD ||
      Math.abs(ev.clientY - startY) > DRAG_THRESHOLD
    ) {
      hasMoved = true;
    }
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const endDate = getCellDate(
      document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
    );
    if (hasMoved && startDate) {
      const end = endDate ?? startDate;
      const [start, endFinal] =
        startDate <= end ? [startDate, end] : [end, startDate];
      const s = new Date(start);
      const e = new Date(endFinal);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      callbacks.onCreate(s, e);
    } else if (!hasMoved && startDate) {
      callbacks.onDateClick(startDate);
    }
  };

  gridEl.addEventListener("mousedown", onMouseDown);
}
