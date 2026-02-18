const DRAG_THRESHOLD = 4;

export interface DragCreateCallbacks {
  onSlotClick: (date: Date, hour: number) => void;
  onCreate: (start: Date, end: Date) => void;
}

export function setupDayViewDragCreate(
  containerEl: HTMLElement,
  baseDate: Date,
  slotHeight: number,
  callbacks: DragCreateCallbacks
): void {
  let startY = 0;
  let startSlot = 0;
  let hasMoved = false;

  const getSlotFromY = (clientY: number): number => {
    const rect = containerEl.getBoundingClientRect();
    const relY = clientY - rect.top;
    return Math.max(0, Math.min(23, Math.floor(relY / slotHeight)));
  };

  const onMouseDown = (ev: MouseEvent): void => {
    if ((ev.target as HTMLElement).closest(".calendar-day-event-bar")) return;
    startY = ev.clientY;
    startSlot = getSlotFromY(ev.clientY);
    hasMoved = false;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent): void => {
    if (Math.abs(ev.clientY - startY) > DRAG_THRESHOLD) hasMoved = true;
  };

  const onMouseUp = (ev: MouseEvent): void => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (hasMoved) {
      const endSlot = getSlotFromY(ev.clientY);
      const slotStart = Math.min(startSlot, endSlot);
      const slotEnd = Math.max(startSlot, endSlot);
      const start = new Date(baseDate);
      start.setHours(slotStart, 0, 0, 0);
      const end = new Date(baseDate);
      end.setHours(slotEnd + 1, 0, 0, 0);
      callbacks.onCreate(start, end);
    } else {
      callbacks.onSlotClick(new Date(baseDate), startSlot);
    }
  };

  containerEl.addEventListener("mousedown", onMouseDown);
}

export function setupWeekViewDragCreate(
  gridEl: HTMLElement,
  days: Date[],
  slotHeight: number,
  callbacks: DragCreateCallbacks
): void {
  let startDayIndex = 0;
  let startHour = 0;
  let startX = 0;
  let startY = 0;
  let hasMoved = false;

  const getSlotAt = (clientX: number, clientY: number): { dayIndex: number; hour: number } | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest(".calendar-week-cell") as HTMLElement | null;
    if (!cell) return null;
    const col = cell.closest(".calendar-week-col");
    if (!col) return null;
    const cols = gridEl.querySelectorAll(".calendar-week-col");
    const dayIndex = Array.from(cols).indexOf(col);
    if (dayIndex < 0 || dayIndex >= days.length) return null;
    const hour = parseInt(cell.dataset.hour ?? "0", 10);
    return { dayIndex, hour };
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
    startHour = parseInt(cell.dataset.hour ?? "0", 10);
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
    const endSlot = getSlotAt(ev.clientX, ev.clientY);
    if (hasMoved) {
      if (!endSlot) {
        const start = new Date(days[startDayIndex]);
        start.setHours(startHour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(startHour + 1, 0, 0, 0);
        callbacks.onCreate(start, end);
      } else {
      const startMs = days[startDayIndex].getTime() + startHour * 3600000;
      const endMs = days[endSlot.dayIndex].getTime() + endSlot.hour * 3600000;
      const [start, end] =
        startMs <= endMs
          ? [
              new Date(days[startDayIndex]),
              new Date(days[endSlot.dayIndex]),
            ]
          : [
              new Date(days[endSlot.dayIndex]),
              new Date(days[startDayIndex]),
            ];
      const [hStart, hEnd] =
        startMs <= endMs ? [startHour, endSlot.hour] : [endSlot.hour, startHour];
      start.setHours(hStart, 0, 0, 0);
      end.setHours(hEnd + 1, 0, 0, 0);
      callbacks.onCreate(start, end);
      }
    } else {
      callbacks.onSlotClick(new Date(days[startDayIndex]), startHour);
    }
  };

  gridEl.addEventListener("mousedown", onMouseDown);
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
