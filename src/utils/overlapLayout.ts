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
  type IndexedEvent = {
    event: T;
    index: number;
    start: number;
    end: number;
  };

  if (events.length === 0) return [];

  const sorted: IndexedEvent[] = events
    .map((event, index) => ({
      event,
      index,
      start: new Date(event.start).getTime(),
      end: new Date(event.end).getTime(),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const layoutByIndex = new Map<number, LayoutResult>();

  const finalizeGroup = (group: IndexedEvent[]): void => {
    if (group.length === 0) return;
    const columnEnds: number[] = [];
    const columnByIndex = new Map<number, number>();

    group.forEach((item) => {
      let col = 0;
      while (col < columnEnds.length && columnEnds[col] > item.start) col++;
      if (col >= columnEnds.length) columnEnds.push(item.end);
      else columnEnds[col] = item.end;
      columnByIndex.set(item.index, col);
    });

    const totalColumns = Math.max(columnEnds.length, 1);
    group.forEach((item) => {
      const column = columnByIndex.get(item.index) ?? 0;
      layoutByIndex.set(item.index, { column, totalColumns });
    });
  };

  let currentGroup: IndexedEvent[] = [];
  let currentGroupMaxEnd = -Infinity;

  for (const item of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      currentGroupMaxEnd = item.end;
      continue;
    }

    if (item.start < currentGroupMaxEnd) {
      currentGroup.push(item);
      currentGroupMaxEnd = Math.max(currentGroupMaxEnd, item.end);
      continue;
    }

    finalizeGroup(currentGroup);
    currentGroup = [item];
    currentGroupMaxEnd = item.end;
  }

  finalizeGroup(currentGroup);

  return sorted.map((item) => {
    const layout = layoutByIndex.get(item.index) ?? { column: 0, totalColumns: 1 };
    return { ...item.event, ...layout };
  });
}
