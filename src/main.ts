import { Plugin } from "obsidian";
import type { PluginSettings } from "./types";
import { EventStore } from "./store/EventStore";
import { CalendarStore } from "./store/CalendarStore";
import { CalendarView, VIEW_TYPE_CALENDAR } from "./views/CalendarView";
import { CalendarSettingTab } from "./settings";
import { createEventLinkProcessor } from "./eventLinkProcessor";

const DEFAULT_SETTINGS: PluginSettings = {
  weekStartDay: 0,
  defaultView: "month",
  openOnStartup: false,
  openInCenter: false,
};

export default class CalendarPlugin extends Plugin {
  private eventStore!: EventStore;
  private calendarStore!: CalendarStore;
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.eventStore = new EventStore(this.app);
    this.calendarStore = new CalendarStore(this.eventStore);
    await this.eventStore.load();

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => {
      return new CalendarView(leaf, this.eventStore, this.calendarStore, this.settings);
    });

    this.addRibbonIcon("calendar", "打开日历", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-calendar",
      name: "打开日历",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "calendar-undo",
      name: "日历: 撤销",
      checkCallback: (checking) => {
        const leaf = this.app.workspace.activeLeaf;
        const inCalendar = leaf?.view?.getViewType?.() === VIEW_TYPE_CALENDAR;
        if (!inCalendar || !this.eventStore.canUndo()) return false;
        if (checking) return true;
        this.eventStore.undo();
      },
    });

    this.addCommand({
      id: "calendar-redo",
      name: "日历: 重做",
      checkCallback: (checking) => {
        const leaf = this.app.workspace.activeLeaf;
        const inCalendar = leaf?.view?.getViewType?.() === VIEW_TYPE_CALENDAR;
        if (!inCalendar || !this.eventStore.canRedo()) return false;
        if (checking) return true;
        this.eventStore.redo();
      },
    });

    this.addSettingTab(
      new CalendarSettingTab(this.app, this, this.calendarStore, () => this.settings, (s) => this.saveSettings(s))
    );

    this.registerMarkdownPostProcessor(
      createEventLinkProcessor((eventId) => this.openCalendarToEvent(eventId))
    );

    if (this.settings.openOnStartup) {
      this.app.workspace.onLayoutReady(() => this.openCalendarOnStartup());
    }
  }

  private async openCalendarOnStartup(): Promise<void> {
    // 关闭多余的日历窗口（例如上次工作区布局恢复出来的重复面板），只保留一个
    this.dedupeCalendarLeaves();
    await this.activateView();
  }

  private dedupeCalendarLeaves(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    leaves.slice(1).forEach((leaf) => leaf.detach());
  }

  private async openCalendarToEvent(eventId: string): Promise<void> {
    await this.activateView();
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (leaf?.view instanceof CalendarView) {
      (leaf.view as CalendarView).navigateToEvent(eventId);
    }
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    this.dedupeCalendarLeaves();
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) {
      const target = this.settings.openInCenter
        ? workspace.getLeaf()
        : workspace.getRightLeaf(false) ?? workspace.getLeaf();
      await target.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    } else {
      workspace.revealLeaf(leaf);
    }
  }

  private async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  private async saveSettings(settings: PluginSettings): Promise<void> {
    this.settings = settings;
    await this.saveData(settings);
  }
}
