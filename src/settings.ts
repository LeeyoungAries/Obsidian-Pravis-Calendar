import { PluginSettingTab, type App, type Plugin } from "obsidian";
import type { PluginSettings, ViewMode } from "./types";

export class CalendarSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: Plugin, private getSettings: () => PluginSettings, private saveSettings: (s: PluginSettings) => Promise<void>) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.getSettings();

    containerEl.createEl("h2", { text: "日历设置" });

    const weekStartEl = containerEl.createDiv("setting-item");
    weekStartEl.createDiv("setting-item-info").createEl("label", { text: "周起始日" });
    const weekStartSelect = weekStartEl.createEl("select");
    [
      [0, "周日"],
      [1, "周一"],
      [2, "周二"],
      [3, "周三"],
      [4, "周四"],
      [5, "周五"],
      [6, "周六"],
    ].forEach(([val, label]) => {
      const opt = weekStartSelect.createEl("option", { value: String(val), text: label as string });
      if (settings.weekStartDay === val) opt.selected = true;
    });
    weekStartSelect.addEventListener("change", async () => {
      const s = { ...this.getSettings(), weekStartDay: Number(weekStartSelect.value) };
      await this.saveSettings(s);
    });

    const defaultViewEl = containerEl.createDiv("setting-item");
    defaultViewEl.createDiv("setting-item-info").createEl("label", { text: "默认视图" });
    const viewSelect = defaultViewEl.createEl("select");
    (["day", "week", "month"] as ViewMode[]).forEach((val) => {
      const labels: Record<ViewMode, string> = { day: "日视图", week: "周视图", month: "月视图" };
      const opt = viewSelect.createEl("option", { value: val, text: labels[val] });
      if (settings.defaultView === val) opt.selected = true;
    });
    viewSelect.addEventListener("change", async () => {
      const s = { ...this.getSettings(), defaultView: viewSelect.value as ViewMode };
      await this.saveSettings(s);
    });
  }
}
