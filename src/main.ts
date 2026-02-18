import { Plugin } from "obsidian";
import type { PluginSettings } from "./types";
import { EventStore } from "./store/EventStore";
import { CalendarStore } from "./store/CalendarStore";
import { CalendarView, VIEW_TYPE_CALENDAR } from "./views/CalendarView";
import { CalendarSettingTab } from "./settings";

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

    this.addSettingTab(
      new CalendarSettingTab(this.app, this, () => this.settings, (s) => this.saveSettings(s))
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) {
      await workspace.getRightLeaf(false)?.setViewState({
        type: VIEW_TYPE_CALENDAR,
        active: true,
      });
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
