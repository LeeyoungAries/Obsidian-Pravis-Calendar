export interface TimedEvent {
  start: Date | string;
  end: Date | string;
}

export interface LayoutResult {
  column: number;
  totalColumns: number;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeOverlapLayout<T extends TimedEvent>(
  events: T[]
): (T & LayoutResult)[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const columnEnds: number[] = [];
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
    const overlapCount = sorted.filter(
      (o) => overlaps(start, end, new Date(o.start).getTime(), new Date(o.end).getTime())
    ).length;
    result.push({ ...e, column: col, totalColumns: overlapCount });
  }

  return result;
}
