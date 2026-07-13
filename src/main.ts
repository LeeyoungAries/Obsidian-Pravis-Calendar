import { addIcon, Plugin, type WorkspaceLeaf } from "obsidian";
import type { PluginSettings } from "./types";
import { EventStore } from "./store/EventStore";
import { CalendarStore } from "./store/CalendarStore";
import { CalendarView, VIEW_TYPE_CALENDAR } from "./views/CalendarView";
import { CalendarSettingTab } from "./settings";
import { createEventLinkProcessor } from "./eventLinkProcessor";
import { PRAVIS_CALENDAR_ICON, PRAVIS_CALENDAR_ICON_SVG } from "./constants/icons";

const DEFAULT_SETTINGS: PluginSettings = {
  weekStartDay: 0,
  defaultView: "month",
};

export default class CalendarPlugin extends Plugin {
  private eventStore!: EventStore;
  private calendarStore!: CalendarStore;
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };
  private mainCalendarLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    addIcon(PRAVIS_CALENDAR_ICON, PRAVIS_CALENDAR_ICON_SVG);
    this.eventStore = new EventStore(this.app);
    this.calendarStore = new CalendarStore(this.eventStore);
    await this.eventStore.load();

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => {
      return new CalendarView(leaf, this.eventStore, this.calendarStore, this.settings);
    });

    this.addRibbonIcon(PRAVIS_CALENDAR_ICON, "打开 Pravis Calendar", () => {
      this.openInMainTab();
    });

    this.addCommand({
      id: "open-calendar",
      name: "打开 Pravis Calendar",
      callback: () => this.openInMainTab(),
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
      new CalendarSettingTab(
        this.app,
        this,
        this.eventStore,
        this.calendarStore,
        () => this.settings,
        (s) => this.saveSettings(s)
      )
    );

    this.registerMarkdownPostProcessor(
      createEventLinkProcessor((eventId) => this.openCalendarToEvent(eventId))
    );

    this.app.workspace.onLayoutReady(() => this.prepareCalendarSidebarTab());
  }

  private async prepareCalendarSidebarTab(): Promise<void> {
    const { workspace } = this.app;
    if (typeof workspace.ensureSideLeaf === "function") {
      await workspace.ensureSideLeaf(VIEW_TYPE_CALENDAR, "right", { active: false, reveal: false });
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    await leaf?.setViewState({ type: VIEW_TYPE_CALENDAR, active: false });
  }

  private async openCalendarToEvent(eventId: string): Promise<void> {
    const leaf = await this.openInMainTab();
    if (leaf?.view instanceof CalendarView) {
      (leaf.view as CalendarView).navigateToEvent(eventId);
    }
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  private async openInMainTab(): Promise<WorkspaceLeaf> {
    const { workspace } = this.app;
    if (this.mainCalendarLeaf?.view.getViewType() === VIEW_TYPE_CALENDAR) {
      await workspace.revealLeaf(this.mainCalendarLeaf);
      return this.mainCalendarLeaf;
    }

    const leaf = workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    this.mainCalendarLeaf = leaf;
    return leaf;
  }

  private async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  private async saveSettings(settings: PluginSettings): Promise<void> {
    this.settings = settings;
    await this.saveData(settings);
  }
}
