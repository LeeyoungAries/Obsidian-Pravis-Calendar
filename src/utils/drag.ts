export const DRAG_TYPE_EVENT = "application/x-obsidian-calendar-event";

export function setDragEventId(dataTransfer: DataTransfer, eventId: string): void {
  dataTransfer.setData(DRAG_TYPE_EVENT, eventId);
  dataTransfer.effectAllowed = "move";
}

export function getDragEventId(dataTransfer: DataTransfer): string | null {
  return dataTransfer.getData(DRAG_TYPE_EVENT) || null;
}

export function hasDragEvent(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(DRAG_TYPE_EVENT);
}
