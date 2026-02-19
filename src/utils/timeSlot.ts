export const SLOTS_PER_HOUR = 4;
const MINUTES_PER_SLOT = 15;

export function yToMinutes(relY: number, slotHeight: number): number {
  const slotIndex = Math.round(relY / (slotHeight / SLOTS_PER_HOUR));
  return Math.max(0, Math.min(1439, slotIndex * MINUTES_PER_SLOT));
}

export function minutesToY(minutes: number, slotHeight: number): number {
  const slotIndex = Math.round(minutes / MINUTES_PER_SLOT);
  return slotIndex * (slotHeight / SLOTS_PER_HOUR);
}

export function snapToSlot(date: Date): Date {
  const d = new Date(date);
  const m = d.getMinutes();
  const snapped = Math.round(m / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
  d.setMinutes(snapped, 0, 0);
  return d;
}
