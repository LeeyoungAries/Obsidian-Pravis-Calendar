# 日历插件 - 体验修复与补充方案

## 一、问题理解与修复方案

### 问题 1：无法直接在日历上拖拽生成、调整日程时间

**现状**：创建事件只能通过点击 slot 打开弹窗；拖拽仅支持移动已有事件到其他 slot。

**目标**：对齐 iOS 日历，支持：
- 拖拽空白区域创建新事件（按下拖拽一段，释放时按起止时间创建）
- 拖拽事件底部边缘调整结束时间（拉长/缩短）

**修复方案**：

| 子项 | 实现方式 |
|------|----------|
| 拖拽创建 | 在 DayView/WeekView 的 slot 上监听 mousedown → mousemove → mouseup。mousedown 记录起始 slot；mouseup 时若发生位移，计算起止 slot，调用 `eventStore.addEvent` 创建，默认 1 小时时长；若未位移则保持原有 onSlotClick 打开弹窗 |
| 拖拽调整时长 | 在 EventCard/事件条底部增加可拖拽区域（如 4px 高），监听该区域的 mousedown → document mousemove → mouseup，根据鼠标 Y 变化计算新 end 时间，调用 `updateEvent` |

**涉及文件**：`DayView.ts`、`WeekView.ts`、`EventCard.ts` 或新建 `utils/dragCreate.ts`、`utils/dragResize.ts`

---

### 问题 2：重叠事件相互遮挡

**现状**：DayView、WeekView 中，相同或重叠时间段的事件均 `position: absolute` 叠加，后者盖住前者。

**目标**：重叠事件并排显示，类似 iOS 日历的列布局。

**修复方案**：

采用经典 overlap 布局算法：

1. 按 `start` 排序事件
2. 遍历事件，计算每个事件与哪些事件重叠，建立 overlap 组
3. 对每组：分配 column 索引（从左到右填满可用列），记录 `totalColumns`
4. 渲染时：`width = (1 / totalColumns) * 100%`，`left = (column / totalColumns) * 100%`，`margin-left` 留 1-2px 间隙

**伪代码**：
```
for each event e:
  e.column = 0
  while 与 column 上已有事件重叠: e.column++
  e.totalColumns = max(同组内 column) + 1
```

**涉及文件**：`DayView.ts`、`WeekView.ts`、新建 `utils/overlapLayout.ts`、`styles.css`（调整事件条 width/left）

---

### 问题 3：日/周视图中表头与全天区域需固定

**现状**：`calendar-content-area` 有 `overflow: auto`，日/周视图整体滚动时，星期几/日期、全天任务区域会滚出视口。

**目标**：表头（星期几、几月几号）和全天任务区域 `position: sticky`，滚动时始终可见。

**修复方案**：

| 视图 | 固定元素 | 实现 |
|------|----------|------|
| 日视图 | 全天区域 | `.calendar-allday-section { position: sticky; top: 0; z-index: 1; background: var(--background-primary); }` |
| 日视图 | 当前日期标题 | 在 toolbar 已有，无需额外固定；若日视图有独立日期栏，则 sticky |
| 周视图 | 星期/日期 header | `.calendar-week-col-header { position: sticky; top: 0; z-index: 1; background: var(--background-primary); }` |
| 周视图 | 全天区域 | `.calendar-week-allday { position: sticky; top: 0; z-index: 2; background: var(--background-primary); }` |
| 周视图 | 时间轴 | `.calendar-week-timeaxis` 需 `position: sticky; left: 0`，使横向滚动时时间轴固定 |

**结构调整**：确保 sticky 元素的父级滚动容器正确；当前 `calendar-week-timesection` 为滚动区，需将表头、全天移出或置于滚动区顶部并 sticky。

**涉及文件**：`DayView.ts`、`WeekView.ts`、`styles.css`、`CalendarView.ts`（若需调整 DOM 结构）

---

## 二、原设计遗漏的补充项

### 补充 1：当前时间线

**说明**：日/周视图中，一条横线标识当前时刻，便于快速定位。

**实现**：在时间轴区域叠加一个 `position: absolute` 的 div，`top = (当前小时 + 当前分钟/60) * SLOT_HEIGHT`，样式为细线 + 圆点。需每分钟或每 10 分钟更新一次位置（或进入视图时计算一次）。

**涉及**：`DayView.ts`、`WeekView.ts`、`styles.css`

---

### 补充 2：打开日/周视图时滚动到当前时间

**说明**：进入日/周视图时，自动滚动使当前时刻位于视口中央或顶部附近。

**实现**：`render` 完成后，计算当前时刻对应 scrollTop，执行 `scrollIntoView` 或 `scrollTop = ...`。

**涉及**：`DayView.ts`、`WeekView.ts`、`CalendarView.ts`

---

### 补充 3：拖拽创建时的视觉反馈

**说明**：在空白区域拖拽时，显示半透明选区，表示即将创建的事件时间范围。

**实现**：mousedown 时创建 overlay div，mousemove 时更新其 top/height，mouseup 时移除并创建事件。

**涉及**：`DayView.ts`、`WeekView.ts`、`utils/dragCreate.ts`

---

### 补充 4：月视图拖拽创建

**说明**：月视图中，在空白日期格内拖拽（跨天）创建多日事件，或拖拽到某格创建单日事件。

**实现**：月视图 cell 支持 mousedown → mousemove（跨 cell）→ mouseup，按起止日期创建。可选：简化为先支持点击创建，拖拽创建作为后续迭代。

**优先级**：中，可与日/周拖拽创建同批实现。

---

### 补充 5：事件条最小高度与短事件可见性

**说明**：15 分钟、30 分钟等短事件在日/周视图中可能高度过小，难以点击或识别。

**实现**：当前已有 `Math.max(durationHours * SLOT_HEIGHT, 24)`，可提高到 28-32px，并确保标题在 `overflow: hidden` 下仍可读。

**涉及**：`DayView.ts`、`WeekView.ts`、`styles.css`

---

### 补充 6：键盘快捷键

**说明**：选中事件时，Delete/Backspace 删除；Escape 关闭弹窗。

**实现**：在 `CalendarView` 或 `EventModal` 注册 `addCommand` 或 keydown 监听。

**优先级**：低，可后续迭代。

---

## 三、修复排期建议

| 阶段 | 内容 | 预估 |
|------|------|------|
| P0 | 问题 2 重叠布局、问题 3 固定表头 | 1 天 |
| P1 | 问题 1 拖拽创建、拖拽调整时长 | 1.5 天 |
| P2 | 补充 1 当前时间线、补充 2 滚动到当前时间、补充 3 拖拽视觉反馈 | 0.5 天 |
| P3 | 补充 4 月视图拖拽创建、补充 5 短事件可见性 | 0.5 天 |

**合计**：约 3.5 人天。

---

## 四、验收标准

- [ ] 日/周视图空白 slot 拖拽可创建事件，释放时按起止时间创建
- [ ] 事件条底部可拖拽调整结束时间
- [ ] 重叠事件并排显示，不互相遮挡
- [ ] 日视图全天区域、周视图表头与全天区域滚动时固定可见
- [ ] 日/周视图显示当前时间线
- [ ] 打开日/周视图时自动滚动到当前时刻
- [ ] 拖拽创建时有选区视觉反馈
