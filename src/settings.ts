import { Notice, PluginSettingTab, type App, type Plugin } from "obsidian";
import type { PluginSettings, ViewMode } from "./types";
import type { CalendarStore } from "./store/CalendarStore";
import type { EventStore } from "./store/EventStore";
import { CALENDAR_COLORS } from "./constants/colors";

export class CalendarSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: Plugin,
    private eventStore: EventStore,
    private calendarStore: CalendarStore,
    private getSettings: () => PluginSettings,
    private saveSettings: (s: PluginSettings) => Promise<void>
  ) {
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

    containerEl.createEl("h3", { text: "数据备份" });
    const backupEl = containerEl.createDiv("setting-item");
    const backupInfo = backupEl.createDiv("setting-item-info");
    backupInfo.createEl("div", { text: "手动备份日历数据" });
    backupInfo.createEl("div", {
      text: "创建带当前时间的备份文件，保存在 .obsidian/pravis-calendar-backups/。",
      cls: "setting-item-description",
    });
    const backupButton = backupEl.createEl("button", { text: "立即备份", cls: "mod-cta" });
    backupButton.addEventListener("click", async () => {
      backupButton.disabled = true;
      backupButton.setText("正在备份...");
      try {
        const path = await this.eventStore.createManualBackup();
        new Notice(`Pravis Calendar 已备份：${path}`);
      } catch (err) {
        console.error("Calendar plugin: backup failed", err);
        new Notice("Pravis Calendar 备份失败，请检查 Vault 写入权限。");
      } finally {
        backupButton.disabled = false;
        backupButton.setText("立即备份");
      }
    });

    containerEl.createEl("h3", { text: "日历管理" });
    const calendars = this.calendarStore.getCalendars();
    calendars.forEach((cal) => {
      const item = containerEl.createDiv("setting-item");
      const info = item.createDiv("setting-item-info");
      info.style.display = "flex";
      info.style.alignItems = "center";
      info.style.gap = "0.5rem";
      const colorInput = info.createEl("input", { type: "color" });
      colorInput.value = cal.color;
      colorInput.style.width = "2rem";
      colorInput.style.height = "1.5rem";
      colorInput.addEventListener("change", () => {
        this.calendarStore.updateCalendar(cal.id, { color: colorInput.value });
      });
      const nameInput = info.createEl("input", { type: "text" });
      nameInput.value = cal.name;
      nameInput.placeholder = "日历名称";
      nameInput.style.flex = "1";
      nameInput.addEventListener("change", () => {
        this.calendarStore.updateCalendar(cal.id, { name: nameInput.value.trim() || cal.name });
      });
      const visibleLabel = info.createEl("label");
      const visibleCheck = visibleLabel.createEl("input", { type: "checkbox" });
      visibleCheck.checked = cal.visible;
      visibleCheck.title = "显示/隐藏";
      visibleCheck.addEventListener("change", () => {
        this.calendarStore.toggleVisible(cal.id);
      });
      visibleLabel.appendText(" 显示");
    });
    const addBtn = containerEl.createEl("button", { text: "添加日历" });
    addBtn.addEventListener("click", () => {
      const names = ["工作", "个人", "家庭"];
      const idx = calendars.length % names.length;
      this.calendarStore.addCalendar({
        name: names[idx] || "新日历",
        color: CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length],
        visible: true,
      });
      this.display();
    });
  }
}
