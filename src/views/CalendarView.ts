import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import type { PluginSettings } from "../types";
import { MonthView } from "./MonthView";
import { EventModal } from "../components/EventModal";
import { DayEventsModal } from "../components/DayEventsModal";
import { addMonths } from "../utils/date";

const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export const VIEW_TYPE_CALENDAR = "calendar-view";

export class CalendarView extends ItemView {
  private eventStore: EventStore;
  private calendarStore: CalendarStore;
  private settings: PluginSettings;
  private containerEl: HTMLElement;
  private monthView: MonthView | null = null;
  private currentDate: Date;
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

  private render(): void {
    this.containerEl.empty();

    const toolbar = this.containerEl.createDiv("obsidian-calendar-toolbar");

    const navGroup = toolbar.createDiv("calendar-nav-group");
    const prevBtn = navGroup.createEl("button", { text: "<" });
    prevBtn.setAttribute("aria-label", "上月");
    prevBtn.addEventListener("click", () => {
      this.currentDate = addMonths(this.currentDate, -1);
      this.monthView?.setCurrentDate(this.currentDate);
      this.monthView?.render();
      this.updateNavTitle(navTitle);
    });

    const navTitle = navGroup.createSpan("calendar-nav-title");
    this.updateNavTitle(navTitle);

    const nextBtn = navGroup.createEl("button", { text: ">" });
    nextBtn.setAttribute("aria-label", "下月");
    nextBtn.addEventListener("click", () => {
      this.currentDate = addMonths(this.currentDate, 1);
      this.monthView?.setCurrentDate(this.currentDate);
      this.monthView?.render();
      this.updateNavTitle(navTitle);
    });

    const todayBtn = toolbar.createEl("button", { text: "今天" });
    todayBtn.addEventListener("click", () => {
      this.currentDate = new Date();
      this.monthView?.setCurrentDate(this.currentDate);
      this.monthView?.render();
      this.updateNavTitle(navTitle);
    });

    const createBtn = toolbar.createEl("button", { text: "创建事件" });
    createBtn.addEventListener("click", () => {
      const modal = new EventModal(this.app, this.eventStore, { mode: "create", initialDate: this.currentDate });
      modal.afterClose = () => this.render();
      modal.open();
    });

    const monthContainer = this.containerEl.createDiv("calendar-month-wrapper");
    this.monthView = new MonthView(
      monthContainer,
      this.eventStore,
      this.calendarStore,
      this.settings.weekStartDay,
      this.currentDate,
      {
        onDateClick: (date) => {
          const modal = new EventModal(this.app, this.eventStore, { mode: "create", initialDate: date });
          modal.afterClose = () => this.render();
          modal.open();
        },
        onEventClick: (event) => {
          const modal = new EventModal(this.app, this.eventStore, { mode: "edit", event });
          modal.afterClose = () => this.render();
          modal.open();
        },
        onDayEventsClick: (date, events) => {
          const dayModal = new DayEventsModal(this.app, date, events, (e) => {
            dayModal.close();
            const editModal = new EventModal(this.app, this.eventStore, { mode: "edit", event: e });
            editModal.afterClose = () => this.render();
            editModal.open();
          });
          dayModal.open();
        },
      }
    );
    this.monthView.render();
  }

  private updateNavTitle(el: HTMLElement): void {
    el.setText(`${this.currentDate.getFullYear()}年 ${MONTH_NAMES[this.currentDate.getMonth()]}`);
  }
}
