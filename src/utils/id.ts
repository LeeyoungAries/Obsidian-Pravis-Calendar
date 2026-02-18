export function generateEventId(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `evt_${yyyymmdd}_${random}`;
}

export function generateCalendarId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `cal_${random}`;
}
