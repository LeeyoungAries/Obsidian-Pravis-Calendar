export interface TimedEvent {
  start: Date | string;
  end: Date | string;
}

export interface LayoutResult {
  column: number;
  totalColumns: number;
}

export function computeOverlapLayout<T extends TimedEvent>(
  events: T[]
): (T & LayoutResult)[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const columnEnds: number[] = [];
  let maxCol = 0;
  const result: (T & LayoutResult)[] = [];

  for (const e of sorted) {
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();

    let col = 0;
    while (col < columnEnds.length && columnEnds[col] > start) {
      col++;
    }
    if (col >= columnEnds.length) {
      columnEnds.push(end);
    } else {
      columnEnds[col] = end;
    }
    maxCol = Math.max(maxCol, col);
    result.push({ ...e, column: col, totalColumns: 0 });
  }

  const totalColumns = maxCol + 1;
  return result.map((r) => ({ ...r, totalColumns }));
}
