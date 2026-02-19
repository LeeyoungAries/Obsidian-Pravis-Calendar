import { Modal, App } from "obsidian";
import type { EventStore } from "../store/EventStore";
import type { CalendarStore } from "../store/CalendarStore";
import type { Event } from "../types";
import { NoteSuggestModal } from "./NoteSuggestModal";
import { parseWikiLinks } from "../utils/wikiLink";

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
    private calendarStore: CalendarStore,
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

    form.createEl("label", { text: "日历" }).style.display = "block";
    const calendarSelect = form.createEl("select");
    const calendars = this.calendarStore.getCalendars();
    const eventCalId = ev?.calendarId ?? "cal_default";
    const hasEventCal = calendars.some((c) => c.id === eventCalId);
    calendars.forEach((c) => {
      const opt = calendarSelect.createEl("option", { value: c.id, text: c.name });
      if (eventCalId === c.id) opt.selected = true;
    });
    if (!hasEventCal && eventCalId) {
      const opt = calendarSelect.createEl("option", { value: eventCalId, text: eventCalId });
      opt.selected = true;
    }
    calendarSelect.style.width = "100%";
    calendarSelect.style.marginBottom = "0.5rem";

    form.createEl("label", { text: "关联笔记" }).style.display = "block";
    let notePaths: string[] = [...(ev?.notePaths ?? [])];
    const noteChipsWrap = form.createDiv("calendar-note-chips");
    noteChipsWrap.style.marginBottom = "0.5rem";
    noteChipsWrap.style.display = "flex";
    noteChipsWrap.style.flexWrap = "wrap";
    noteChipsWrap.style.gap = "4px";
    const renderNoteChips = () => {
      noteChipsWrap.empty();
      notePaths.forEach((path, i) => {
        const chip = noteChipsWrap.createDiv("calendar-note-chip");
        chip.createSpan().setText(path);
        const del = chip.createSpan("calendar-note-chip-del");
        del.setText("x");
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          notePaths = notePaths.filter((_, j) => j !== i);
          renderNoteChips();
        });
      });
    };
    renderNoteChips();
    const noteInputRow = form.createDiv("calendar-form-row");
    noteInputRow.style.marginBottom = "0.5rem";
    noteInputRow.style.display = "flex";
    noteInputRow.style.gap = "0.5rem";
    const noteInput = noteInputRow.createEl("input", { type: "text" });
    noteInput.placeholder = "输入 [[note]] 或点击选择";
    noteInput.style.flex = "1";
    const parseAndAppend = () => {
      const links = parseWikiLinks(noteInput.value);
      links.forEach((linkpath) => {
        const dest = this.app.metadataCache.getFirstLinkpathDest(linkpath, "");
        if (dest?.path && !notePaths.includes(dest.path)) notePaths.push(dest.path);
      });
      noteInput.value = "";
      renderNoteChips();
    };
    noteInput.addEventListener("blur", parseAndAppend);
    noteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { parseAndAppend(); e.preventDefault(); }
    });
    const noteAddBtn = noteInputRow.createEl("button", { text: "+ 选择" });
    noteAddBtn.addEventListener("click", () => {
      const files = this.app.vault.getMarkdownFiles();
      new NoteSuggestModal(this.app, files, (file) => {
        if (!notePaths.includes(file.path)) notePaths.push(file.path);
        renderNoteChips();
      }).open();
    });

    form.createEl("label", { text: "地点" }).style.display = "block";
    const locationInput = form.createEl("input", { type: "text" });
    locationInput.placeholder = "地点";
    locationInput.value = ev?.location ?? "";
    locationInput.style.width = "100%";
    locationInput.style.marginBottom = "0.5rem";

    form.createEl("label", { text: "类型" }).style.display = "block";
    const typeSelect = form.createEl("select");
    typeSelect.createEl("option", { value: "event", text: "事件" });
    typeSelect.createEl("option", { value: "todo", text: "Todo" });
    typeSelect.value = ev?.type ?? "event";
    typeSelect.style.width = "100%";
    typeSelect.style.marginBottom = "0.5rem";

    const completedRow = form.createDiv("calendar-form-row");
    const completedLabel = completedRow.createEl("label");
    const completedCheck = completedLabel.createEl("input", { type: "checkbox" });
    completedCheck.checked = ev?.completed ?? false;
    completedLabel.appendText(" 已完成");
    completedRow.style.marginBottom = "0.5rem";
    completedRow.style.display = (ev?.type ?? "event") === "todo" ? "block" : "none";
    typeSelect.addEventListener("change", () => {
      completedRow.style.display = typeSelect.value === "todo" ? "block" : "none";
    });

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
      let start: Date;
      let end: Date;
      if (allDay) {
        start = new Date(startDateInput.value + "T00:00:00");
        end = new Date(endDateInput.value + "T23:59:59");
      } else {
        start = new Date(startDateInput.value + "T" + startTimeInput.value);
        end = new Date(endDateInput.value + "T" + endTimeInput.value);
      }
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      if (end < start) [start, end] = [end, start];
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      const location = locationInput.value.trim();
      const notes = notesInput.value.trim();
      const calendarId = calendarSelect.value;
      parseAndAppend();
      const type = typeSelect.value as "event" | "todo";
      const completed = type === "todo" ? completedCheck.checked : false;
      if (isEdit && ev) {
        this.eventStore.updateEvent(ev.id, { title, start: startStr, end: endStr, allDay, location, notes, calendarId, notePaths, type, completed });
      } else {
        this.eventStore.addEvent({
          title,
          start: startStr,
          end: endStr,
          allDay,
          location,
          notes,
          calendarId,
          notePaths,
          type,
          completed,
        });
      }
      this.close();
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
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
    this.afterClose?.();
  }
}
