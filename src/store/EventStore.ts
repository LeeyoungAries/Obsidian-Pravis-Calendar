import type { App } from "obsidian";
import type { Event, Calendar, CalendarData } from "../types";
import { generateEventId, generateCalendarId } from "../utils/id";
import { DEFAULT_CALENDAR_COLOR } from "../constants/colors";

const DATA_PATH = ".obsidian/calendar-events.json";
const SAVE_DEBOUNCE_MS = 300;

const DEFAULT_CALENDAR: Calendar = {
  id: "cal_default",
  name: "默认",
  color: DEFAULT_CALENDAR_COLOR,
  visible: true,
};

const DEFAULT_DATA: CalendarData = {
  events: [],
  calendars: { cal_default: DEFAULT_CALENDAR },
};

type ChangeHandler = () => void;

export class EventStore {
  private app: App;
  private data: CalendarData = { ...DEFAULT_DATA, calendars: { ...DEFAULT_DATA.calendars } };
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: Set<ChangeHandler> = new Set();

  constructor(app: App) {
    this.app = app;
  }

  async load(): Promise<void> {
    try {
      const content = await this.app.vault.adapter.read(DATA_PATH);
      const parsed = JSON.parse(content) as Partial<CalendarData>;
      const events = (parsed.events ?? DEFAULT_DATA.events).filter((e) => e?.id && e?.start && e?.end);
      const calendars = { ...DEFAULT_DATA.calendars, ...parsed.calendars };
      this.data = { events, calendars };
    } catch {
      this.data = { ...DEFAULT_DATA, calendars: { ...DEFAULT_DATA.calendars } };
    }
    this.emit();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), SAVE_DEBOUNCE_MS);
  }

  async save(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      const content = JSON.stringify(this.data, null, 2);
      await this.app.vault.adapter.write(DATA_PATH, content);
      this.emit();
    } catch (err) {
      console.error("Calendar plugin: save failed", err);
    }
  }

  on(ev: "change", handler: ChangeHandler): void {
    if (ev === "change") this.handlers.add(handler);
  }

  off(ev: "change", handler: ChangeHandler): void {
    if (ev === "change") this.handlers.delete(handler);
  }

  private emit(): void {
    this.handlers.forEach((h) => h());
  }

  getEvents(start: Date, end: Date): Event[] {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return this.data.events.filter((e) => {
      const eStart = new Date(e.start).getTime();
      const eEnd = new Date(e.end).getTime();
      return eEnd >= startMs && eStart <= endMs;
    });
  }

  addEvent(event: Omit<Event, "id">): Event {
    const id = generateEventId();
    const full: Event = { ...event, id };
    this.data.events.push(full);
    this.scheduleSave();
    this.emit();
    return full;
  }

  updateEvent(id: string, partial: Partial<Event>): Event | null {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    this.data.events[idx] = { ...this.data.events[idx], ...partial };
    this.scheduleSave();
    this.emit();
    return this.data.events[idx];
  }

  deleteEvent(id: string): boolean {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx < 0) return false;
    this.data.events.splice(idx, 1);
    this.scheduleSave();
    this.emit();
    return true;
  }

  getCalendars(): Calendar[] {
    return Object.values(this.data.calendars);
  }

  updateCalendar(id: string, partial: Partial<Calendar>): void {
    const cal = this.data.calendars[id];
    if (!cal) return;
    this.data.calendars[id] = { ...cal, ...partial };
    this.scheduleSave();
    this.emit();
  }

  toggleVisible(id: string): void {
    const cal = this.data.calendars[id];
    if (!cal) return;
    cal.visible = !cal.visible;
    this.scheduleSave();
    this.emit();
  }

  addCalendar(cal: Omit<Calendar, "id">): Calendar {
    const id = generateCalendarId();
    const full: Calendar = { ...cal, id };
    this.data.calendars[id] = full;
    this.scheduleSave();
    this.emit();
    return full;
  }

  getEvent(id: string): Event | null {
    return this.data.events.find((e) => e.id === id) ?? null;
  }
}
