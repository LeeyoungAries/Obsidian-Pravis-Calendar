import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import type { PluginSettings } from "../types";
import type { ViewMode } from "../types";
import { MonthView } from "./MonthView";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { EventModal } from "../components/EventModal";
import { DayEventsModal } from "../components/DayEventsModal";
import { addMonths, addDays, getWeekDays } from "../utils/date";

const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export const VIEW_TYPE_CALENDAR = "calendar-view";

export class CalendarView extends ItemView {
  private eventStore: EventStore;
  private calendarStore: CalendarStore;
  private settings: PluginSettings;
  private containerEl: HTMLElement;
  private monthView: MonthView | null = null;
  private dayView: DayView | null = null;
  private weekView: WeekView | null = null;
  private currentDate: Date;
  private viewMode: ViewMode;
  private selectedEventId: string | null = null;
  private changeHandler = () => this.render();

  constructor(
    leaf: WorkspaceLeaf,
    eventStore: EventStore,
    calendarStore: CalendarStore,
    settings: PluginSettings
  ) {
    super(leaf);
    this.eventStore = eventStore;
    this.calendarStore = calendarStore;
    this.settings = settings;
    this.currentDate = new Date();
    this.viewMode = settings.defaultView;
    this.containerEl = this.contentEl.createDiv("obsidian-calendar-container");
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "日历";
  }

  getIcon(): string {
    return "calendar";
  }

  async onOpen(): Promise<void> {
    this.render();
    this.eventStore.on("change", this.changeHandler);
  }

  async onClose(): Promise<void> {
    this.eventStore.off("change", this.changeHandler);
  }

  private openEventModal(mode: "create" | "edit", initialDate?: Date, event?: Parameters<typeof EventModal>[2]["event"]): void {
    const modal = new EventModal(this.app, this.eventStore, this.calendarStore, { mode, initialDate, event });
    modal.afterClose = () => this.render();
    modal.open();
  }

  private render(): void {
    const oldContentArea = this.containerEl.querySelector(".calendar-content-area");
    const scrollWrapper = oldContentArea?.querySelector(".calendar-week-scroll-wrapper");
    const savedScrollTop = (oldContentArea as HTMLElement)?.scrollTop ?? 0;
    const savedScrollLeft = (oldContentArea as HTMLElement)?.scrollLeft ?? 0;
    const savedScrollWrapperTop = (scrollWrapper as HTMLElement)?.scrollTop ?? 0;
    const savedScrollWrapperLeft = (scrollWrapper as HTMLElement)?.scrollLeft ?? 0;

    this.containerEl.empty();

    const toolbar = this.containerEl.createDiv("obsidian-calendar-toolbar");

    const viewGroup = toolbar.createDiv("calendar-view-group");
    (["day", "week", "month"] as ViewMode[]).forEach((mode) => {
      const btn = viewGroup.createEl("button", {
        text: mode === "day" ? "日" : mode === "week" ? "周" : "月",
      });
      if (this.viewMode === mode) btn.addClass("is-active");
      btn.addEventListener("click", () => {
        this.viewMode = mode;
        this.render();
      });
    });

    const navGroup = toolbar.createDiv("calendar-nav-group");
    const prevBtn = navGroup.createEl("button", { text: "<" });
    prevBtn.addEventListener("click", () => this.nav(-1));

    const navTitle = navGroup.createSpan("calendar-nav-title");

    const nextBtn = navGroup.createEl("button", { text: ">" });
    nextBtn.addEventListener("click", () => this.nav(1));

    const todayBtn = toolbar.createEl("button", { text: "今天" });
    todayBtn.addEventListener("click", () => {
      this.currentDate = new Date();
      this.render();
    });

    const createBtn = toolbar.createEl("button", { text: "创建事件" });
    createBtn.addEventListener("click", () => this.openEventModal("create", this.currentDate));

    const calFilter = toolbar.createDiv("calendar-filter");
    this.calendarStore.getCalendars().forEach((cal) => {
      const btn = calFilter.createEl("button");
      btn.style.borderLeft = `3px solid ${cal.color}`;
      btn.style.paddingLeft = "0.5rem";
      btn.setText(cal.name);
      if (!cal.visible) btn.addClass("calendar-filter-hidden");
      btn.addEventListener("click", () => {
        this.calendarStore.toggleVisible(cal.id);
        this.render();
      });
    });

    this.updateNavTitle(navTitle);

    const contentArea = this.containerEl.createDiv("calendar-content-area");

    if (this.viewMode === "month") {
      const monthContainer = contentArea.createDiv("calendar-month-wrapper");
      this.monthView = new MonthView(
        monthContainer,
        this.eventStore,
        this.calendarStore,
        this.settings.weekStartDay,
        this.currentDate,
        {
          onDateClick: (date) => this.openEventModal("create", date),
          onEventSelect: (e) => { this.selectedEventId = e.id; },
          onEventDblClick: (e) => this.openEventModal("edit", undefined, e),
          selectedEventId: this.selectedEventId,
          onDayEventsClick: (date, events) => {
            const dayModal = new DayEventsModal(this.app, date, events, (e) => {
              dayModal.close();
              this.openEventModal("edit", undefined, e);
            });
            dayModal.open();
          },
          onCreate: (start, end) => {
            const cal = this.calendarStore.getCalendars().find((c) => c.visible) ?? this.calendarStore.getCalendars()[0];
            this.eventStore.addEvent({
              title: "新事件",
              start: start.toISOString(),
              end: end.toISOString(),
              allDay: true,
              location: "",
              notes: "",
              calendarId: cal?.id ?? "cal_default",
              notePath: "",
              type: "event",
              completed: false,
            });
          },
        }
      );
      this.monthView.render();
    } else if (this.viewMode === "day") {
      const dayContainer = contentArea.createDiv("calendar-day-wrapper");
      this.dayView = new DayView(
        dayContainer,
        this.eventStore,
        this.calendarStore,
        this.currentDate,
        {
          onEventSelect: (e) => { this.selectedEventId = e.id; },
          onEventDblClick: (e) => this.openEventModal("edit", undefined, e),
          selectedEventId: this.selectedEventId,
          onSlotClick: (date) => this.openEventModal("create", date),
          onCreate: (start, end) => {
            const cal = this.calendarStore.getCalendars().find((c) => c.visible) ?? this.calendarStore.getCalendars()[0];
            this.eventStore.addEvent({
              title: "新事件",
              start: start.toISOString(),
              end: end.toISOString(),
              allDay: false,
              location: "",
              notes: "",
              calendarId: cal?.id ?? "cal_default",
              notePath: "",
              type: "event",
              completed: false,
            });
          },
        }
      );
      this.dayView.render();
    } else {
      const weekContainer = contentArea.createDiv("calendar-week-wrapper");
      this.weekView = new WeekView(
        weekContainer,
        this.eventStore,
        this.calendarStore,
        this.settings.weekStartDay,
        this.currentDate,
        {
          onEventSelect: (e) => { this.selectedEventId = e.id; },
          onEventDblClick: (e) => this.openEventModal("edit", undefined, e),
          selectedEventId: this.selectedEventId,
          onSlotClick: (date) => this.openEventModal("create", date),
          onCreate: (start, end) => {
            const cal = this.calendarStore.getCalendars().find((c) => c.visible) ?? this.calendarStore.getCalendars()[0];
            this.eventStore.addEvent({
              title: "新事件",
              start: start.toISOString(),
              end: end.toISOString(),
              allDay: false,
              location: "",
              notes: "",
              calendarId: cal?.id ?? "cal_default",
              notePath: "",
              type: "event",
              completed: false,
            });
          },
        }
      );
      this.weekView.render();
    }

    requestAnimationFrame(() => {
      const newContentArea = this.containerEl.querySelector(".calendar-content-area");
      const newScrollWrapper = newContentArea?.querySelector(".calendar-week-scroll-wrapper");
      if (newContentArea instanceof HTMLElement) {
        newContentArea.scrollTop = savedScrollTop;
        newContentArea.scrollLeft = savedScrollLeft;
      }
      if (newScrollWrapper instanceof HTMLElement) {
        newScrollWrapper.scrollTop = savedScrollWrapperTop;
        newScrollWrapper.scrollLeft = savedScrollWrapperLeft;
      }
    });
  }

  private nav(delta: number): void {
    if (this.viewMode === "month") {
      this.currentDate = addMonths(this.currentDate, delta);
    } else if (this.viewMode === "week") {
      this.currentDate = addDays(this.currentDate, delta * 7);
    } else {
      this.currentDate = addDays(this.currentDate, delta);
    }
    this.render();
  }

  navigateToEvent(eventId: string): void {
    const ev = this.eventStore.getEvent(eventId);
    if (!ev) return;
    this.currentDate = new Date(ev.start);
    this.viewMode = "day";
    this.render();
  }

  private updateNavTitle(el: HTMLElement): void {
    if (this.viewMode === "month") {
      el.setText(`${this.currentDate.getFullYear()}年 ${MONTH_NAMES[this.currentDate.getMonth()]}`);
    } else if (this.viewMode === "week") {
      const days = getWeekDays(this.currentDate, this.settings.weekStartDay);
      const start = days[0];
      const end = days[6];
      el.setText(`${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`);
    } else {
      el.setText(`${this.currentDate.getMonth() + 1}月${this.currentDate.getDate()}日`);
    }
  }
}
