import type { App } from "obsidian";
import type { Event, Calendar, CalendarData } from "../types";
import { generateEventId, generateCalendarId } from "../utils/id";
import { DEFAULT_CALENDAR_COLOR } from "../constants/colors";

const DATA_PATH = ".obsidian/pravis-calendar-events.json";
const SAVE_DEBOUNCE_MS = 300;
const HISTORY_MAX_SIZE = 30;

type HistoryEntry = { undo: () => void; redo: () => void };

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
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  constructor(app: App) {
    this.app = app;
  }

  async load(): Promise<void> {
    try {
      const content = await this.app.vault.adapter.read(DATA_PATH);
      const parsed = JSON.parse(content) as Partial<CalendarData>;
      const rawEvents = (parsed.events ?? []) as Array<Record<string, unknown>>;
      const events = rawEvents.filter((e) => e?.id && e?.start && e?.end).map((e) => {
        const notePaths = Array.isArray(e.notePaths)
          ? (e.notePaths as string[]).filter((p) => typeof p === "string" && p.trim())
          : (e.notePath && String(e.notePath).trim() ? [String(e.notePath).trim()] : []);
        const rest = { ...e };
        delete rest.notePath;
        return { ...rest, notePaths } as Event;
      });
      const calendars = { ...DEFAULT_DATA.calendars, ...parsed.calendars };
      this.data = { events, calendars };
    } catch {
      this.data = { ...DEFAULT_DATA, calendars: { ...DEFAULT_DATA.calendars } };
    }
    this.undoStack = [];
    this.redoStack = [];
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
    this.redoStack = [];
    this.undoStack.push({
      undo: () => this._deleteEventDirect(id),
      redo: () => this._addEventDirect(full),
    });
    this.trimHistory();
    this.scheduleSave();
    this.emit();
    return full;
  }

  updateEvent(id: string, partial: Partial<Event>): Event | null {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    const prev = { ...this.data.events[idx] };
    this.data.events[idx] = { ...prev, ...partial };
    const next = this.data.events[idx];
    this.redoStack = [];
    this.undoStack.push({
      undo: () => this._updateEventDirect(id, prev),
      redo: () => this._updateEventDirect(id, next),
    });
    this.trimHistory();
    this.scheduleSave();
    this.emit();
    return next;
  }

  deleteEvent(id: string): boolean {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx < 0) return false;
    const removed = { ...this.data.events[idx] };
    this.data.events.splice(idx, 1);
    this.redoStack = [];
    this.undoStack.push({
      undo: () => this._addEventDirect(removed),
      redo: () => this._deleteEventDirect(id),
    });
    this.trimHistory();
    this.scheduleSave();
    this.emit();
    return true;
  }

  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    entry.undo();
    this.redoStack.push(entry);
    this.scheduleSave();
    this.emit();
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    entry.redo();
    this.undoStack.push(entry);
    this.scheduleSave();
    this.emit();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private _addEventDirect(event: Event): void {
    this.data.events.push({ ...event });
  }

  private _updateEventDirect(id: string, full: Event): void {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx >= 0) this.data.events[idx] = { ...full };
  }

  private _deleteEventDirect(id: string): void {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx >= 0) this.data.events.splice(idx, 1);
  }

  private trimHistory(): void {
    if (this.undoStack.length > HISTORY_MAX_SIZE) {
      this.undoStack = this.undoStack.slice(-HISTORY_MAX_SIZE);
    }
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
