import { Modal, App } from "obsidian";
import type { Event } from "../types";

export class DayEventsModal extends Modal {
  constructor(app: App, private date: Date, private events: Event[], private onEventClick: (e: Event) => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const dateStr = `${this.date.getFullYear()}年${this.date.getMonth() + 1}月${this.date.getDate()}日`;
    this.titleEl.setText(dateStr);

    const list = contentEl.createDiv("calendar-day-events-list");
    this.events.forEach((e) => {
      const row = list.createDiv("calendar-day-event-row");
      if (e.type === "todo") row.addClass("calendar-event-todo");
      if (e.completed) row.addClass("calendar-event-completed");
      if (e.type === "todo") {
        row.createSpan("calendar-event-todo-icon").setText(e.completed ? "✅" : "⭕");
      }
      row.createSpan().setText(e.title);
      if (e.allDay) row.createSpan("calendar-event-badge").setText("全天");
      else {
        const start = new Date(e.start);
        const end = new Date(e.end);
        row.createSpan("calendar-event-time").setText(
          `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}-${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`
        );
      }
      row.style.cursor = "pointer";
      row.addEventListener("click", () => {
        this.close();
        this.onEventClick(e);
      });
    });
  }
}
