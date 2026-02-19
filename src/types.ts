export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  notes: string;
  calendarId: string;
  notePaths: string[];
  type: "event" | "todo";
  completed: boolean;
}

export interface Calendar {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface CalendarData {
  events: Event[];
  calendars: Record<string, Calendar>;
}

export type ViewMode = "day" | "week" | "month";

export interface PluginSettings {
  weekStartDay: number;
  defaultView: ViewMode;
  openOnStartup: boolean;
}
