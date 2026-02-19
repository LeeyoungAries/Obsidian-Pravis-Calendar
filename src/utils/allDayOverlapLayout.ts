import type { Event } from "../types";
import { isSameDay } from "./date";

export interface AllDayLayoutItem extends Event {
  startCol: number;
  endCol: number;
  row: number;
}

export function computeAllDayLayout(
  events: Event[],
  days: Date[]
): AllDayLayoutItem[] {
  const weekStart = days[0];
  const weekEnd = days[6];

  const withCols: { event: Event; startCol: number; endCol: number }[] = [];
  for (const e of events) {
    const startDay = new Date(e.start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(e.end);
    endDay.setHours(23, 59, 59, 999);

    let startCol = days.findIndex((d) => isSameDay(d, startDay));
    if (startCol < 0) startCol = 0;
    let endCol = days.findIndex((d) => isSameDay(d, endDay));
    if (endCol < 0) endCol = 6;

    if (startCol > 6 || endCol < 0) continue;
    startCol = Math.max(0, startCol);
    endCol = Math.min(6, endCol);
    if (startCol > endCol) continue;

    withCols.push({ event: e, startCol, endCol });
  }

  const sorted = [...withCols].sort(
    (a, b) => a.startCol - b.startCol || a.endCol - b.endCol
  );
  const rowEnds: number[] = [];
  const result: AllDayLayoutItem[] = [];

  for (const { event, startCol, endCol } of sorted) {
    let row = 0;
    while (row < rowEnds.length && rowEnds[row] >= startCol) {
      row++;
    }
    if (row >= rowEnds.length) {
      rowEnds.push(endCol);
    } else {
      rowEnds[row] = Math.max(rowEnds[row], endCol);
    }
    result.push({ ...event, startCol, endCol, row });
  }

  return result;
}
