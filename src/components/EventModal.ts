import { Modal, App } from "obsidian";
import type { EventStore } from "../store/EventStore";
import type { Event } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

function toDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface EventModalOptions {
  mode: "create" | "edit";
  initialDate?: Date;
  event?: Event;
}

export class EventModal extends Modal {
  afterClose?: () => void;

  constructor(
    app: App,
    private eventStore: EventStore,
    private options: EventModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const isEdit = this.options.mode === "edit";
    const ev = this.options.event;
    this.titleEl.setText(isEdit ? "编辑事件" : "创建事件");

    const base = this.options.initialDate ? new Date(this.options.initialDate) : new Date();
    const now = new Date(base);
    if (this.options.initialDate && !ev) {
      now.setHours(9, 0, 0, 0);
    }
    const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000);

    const form = contentEl.createDiv("calendar-event-form");

    form.createEl("label", { text: "标题" }).style.display = "block";
    const titleInput = form.createEl("input", { type: "text" });
    titleInput.placeholder = "事件标题";
    titleInput.value = ev?.title ?? "";
    titleInput.style.width = "100%";
    titleInput.style.marginBottom = "0.5rem";

    const allDayRow = form.createDiv("calendar-form-row");
    const allDayLabel = allDayRow.createEl("label");
    const allDayCheck = allDayLabel.createEl("input", { type: "checkbox" });
    allDayCheck.checked = ev?.allDay ?? false;
    allDayLabel.appendText(" 全天");
    allDayRow.style.marginBottom = "0.5rem";

    const timeRow = form.createDiv("calendar-form-row");
    timeRow.createEl("label", { text: "开始" }).style.display = "block";
    const startDateInput = timeRow.createEl("input", { type: "date" });
    const startTimeInput = timeRow.createEl("input", { type: "time" });
    startDateInput.style.marginRight = "0.5rem";
    startDateInput.value = ev ? toDateLocal(new Date(ev.start)) : toDateLocal(now);
    startTimeInput.value = ev ? new Date(ev.start).toTimeString().slice(0, 5) : now.toTimeString().slice(0, 5);
    timeRow.style.marginBottom = "0.5rem";

    const endRow = form.createDiv("calendar-form-row");
    endRow.createEl("label", { text: "结束" }).style.display = "block";
    const endDateInput = endRow.createEl("input", { type: "date" });
    const endTimeInput = endRow.createEl("input", { type: "time" });
    endDateInput.style.marginRight = "0.5rem";
    endDateInput.value = ev ? toDateLocal(new Date(ev.end)) : toDateLocal(defaultEnd);
    endTimeInput.value = ev ? new Date(ev.end).toTimeString().slice(0, 5) : defaultEnd.toTimeString().slice(0, 5);
    endRow.style.marginBottom = "0.5rem";

    form.createEl("label", { text: "地点" }).style.display = "block";
    const locationInput = form.createEl("input", { type: "text" });
    locationInput.placeholder = "地点";
    locationInput.value = ev?.location ?? "";
    locationInput.style.width = "100%";
    locationInput.style.marginBottom = "0.5rem";

    form.createEl("label", { text: "备注" }).style.display = "block";
    const notesInput = form.createEl("textarea");
    notesInput.placeholder = "备注";
    notesInput.value = ev?.notes ?? "";
    notesInput.rows = 3;
    notesInput.style.width = "100%";
    notesInput.style.marginBottom = "1rem";

    const toggleTimeInputs = () => {
      const hide = allDayCheck.checked;
      startTimeInput.style.display = hide ? "none" : "inline-block";
      endTimeInput.style.display = hide ? "none" : "inline-block";
    };
    toggleTimeInputs();
    allDayCheck.addEventListener("change", toggleTimeInputs);

    const btnRow = form.createDiv("calendar-form-buttons");
    const submitBtn = btnRow.createEl("button", { text: isEdit ? "保存" : "创建" });
    submitBtn.addClass("mod-cta");
    submitBtn.addEventListener("click", () => {
      const title = titleInput.value.trim();
      if (!title) return;
      const allDay = allDayCheck.checked;
      let start: string;
      let end: string;
      if (allDay) {
        start = new Date(startDateInput.value + "T00:00:00").toISOString();
        end = new Date(endDateInput.value + "T23:59:59").toISOString();
      } else {
        start = new Date(startDateInput.value + "T" + startTimeInput.value).toISOString();
        end = new Date(endDateInput.value + "T" + endTimeInput.value).toISOString();
      }
      const location = locationInput.value.trim();
      const notes = notesInput.value.trim();
      if (isEdit && ev) {
        this.eventStore.updateEvent(ev.id, { title, start, end, allDay, location, notes });
      } else {
        this.eventStore.addEvent({
          title,
          start,
          end,
          allDay,
          location,
          notes,
          calendarId: "cal_default",
          notePath: "",
          type: "event",
          completed: false,
        });
      }
      this.close();
      this.afterClose?.();
    });

    const cancelBtn = btnRow.createEl("button", { text: "取消" });
    cancelBtn.style.marginLeft = "0.5rem";
    cancelBtn.addEventListener("click", () => this.close());

    if (isEdit && ev) {
      const deleteBtn = btnRow.createEl("button", { text: "删除" });
      deleteBtn.addClass("mod-warning");
      deleteBtn.style.marginLeft = "auto";
      deleteBtn.addEventListener("click", () => {
        this.eventStore.deleteEvent(ev.id);
        this.close();
        this.afterClose?.();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
    this.afterClose?.();
  }
}
