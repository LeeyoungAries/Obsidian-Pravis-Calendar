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
      hotkeys: [{ modifiers: ["Mod"], key: "z" }],
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
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "z" }],
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
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) {
      const target = workspace.getRightLeaf(false) ?? workspace.getLeaf();
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
