# 开发 Prompt

将以下内容复制给 AI 编码助手，用于启动或继续 Obsidian 日历插件的开发。

---

## Prompt 正文

```
# 角色
你是 Obsidian 插件开发工程师。请按项目规范完成开发任务。

# 项目
Obsidian 日历插件，迁移 iOS 日历核心能力。以事件为中心，支持日/周/月视图、拖拽调度、多日历、笔记链接、Todo 类型。数据存于 .obsidian/pravis-calendar-events.json。

# 规范
- 技术栈：TypeScript + esbuild，原生 DOM，无 React/Vue
- 架构与数据模型见 TECH_DESIGN.md
- 功能与验收见 PRD.md
- 排期见 SCHEDULE.md
- 代码：正式、紧凑，无 emoji

# 任务
按 docs/SCHEDULE.md 的 Day 1 执行：
1. 初始化项目（manifest.json, package.json, tsconfig.json, esbuild 构建）
2. 定义 Event/Calendar 类型（types.ts）
3. 实现 EventStore（JSON 读写、CRUD、防抖 save）
4. 实现 CalendarStore（默认日历）
5. 注册 CalendarView（ItemView，空容器，侧边栏可打开）
6. 设置页：周起始日、默认视图

# 产出
- 可 npm run build 成功
- 复制 main.js、manifest.json、styles.css 到 vault/.obsidian/plugins/pravis-calendar/ 后可加载
- 侧边栏可打开日历面板
- 可创建事件并持久化到 JSON
```

---

## 后续阶段 Prompt 模板

完成 Day 1 后，可将「任务」替换为：

**Day 2-3：**
```
# 任务
按 docs/SCHEDULE.md Day 2-3 执行：MonthView 月历网格、事件展示、EventModal 创建/编辑/删除、日期导航。
```

**Day 4-5：**
```
# 任务
按 docs/SCHEDULE.md Day 4-5 执行：DayView、WeekView、视图切换、全天事件、EventModal 完整表单。
```

**Day 6：**
```
# 任务
按 docs/SCHEDULE.md Day 6 执行：EventCard 拖拽（月/日/周视图）、多日历管理、日历筛选。
```

**Day 7：**
```
# 任务
按 docs/SCHEDULE.md Day 7 执行：笔记选择器、[[event:id]] 解析、Todo 类型与完成状态、样式区分。
```

**Day 8：**
```
# 任务
按 docs/SCHEDULE.md Day 8 执行：全流程联调、边界 case 修复、按 PRD 验收标准 checklist 验收。
```

---

## 体验修复 Prompt（docs/FIX_PLAN.md）

将以下内容复制给 AI 编码助手，用于执行 docs/FIX_PLAN.md 中的体验修复。

### P0 阶段（优先）

```
# 角色
你是 Obsidian 插件开发工程师。请按 docs/FIX_PLAN.md 完成体验修复。

# 项目
Obsidian 日历插件，需对齐 iOS 日历使用体验。详见 docs/FIX_PLAN.md。

# 规范
- 技术栈：TypeScript，原生 DOM
- 代码：正式、紧凑，无 emoji

# 任务
按 docs/FIX_PLAN.md P0 执行：
1. 问题 2：重叠事件布局。新建 utils/overlapLayout.ts，实现 overlap 算法，为每个事件计算 column、totalColumns；修改 DayView、WeekView 中 timed 事件的渲染，按 width/left 并排显示
2. 问题 3：固定表头。日视图全天区域、周视图表头与全天区域、周视图时间轴，使用 position: sticky，确保滚动时始终可见；调整 DOM 与滚动容器结构

# 产出
- 重叠事件并排显示，不遮挡
- 日/周视图表头、全天区域、时间轴滚动时固定
```

### P1 阶段

```
# 任务
按 docs/FIX_PLAN.md P1 执行：
1. 拖拽创建：DayView/WeekView 的 slot 上 mousedown→mousemove→mouseup，有位移时按起止 slot 创建事件，无位移则保持 onSlotClick 打开弹窗
2. 拖拽调整时长：事件条底部增加可拖拽区域，mousedown→document mousemove→mouseup，根据 Y 变化更新 end 时间
```

### P2 阶段

```
# 任务
按 docs/FIX_PLAN.md P2 执行：当前时间线、打开日/周视图时滚动到当前时间、拖拽创建时的选区视觉反馈。
```

### P3 阶段

```
# 任务
按 docs/FIX_PLAN.md P3 执行：月视图拖拽创建、短事件最小高度 28-32px。
```

---

## 拖拽体验优化 Prompt（docs/DRAG_UX_DESIGN.md）

将以下内容复制给 AI 编码助手，用于执行 docs/DRAG_UX_DESIGN.md 中的拖拽体验优化。

```
# 角色
你是 Obsidian 插件开发工程师。请按 docs/DRAG_UX_DESIGN.md 完成拖拽体验优化。

# 项目
Obsidian 日历插件。需实现：拖拽过程可视化（鼠标未释放前可见目标位置/大小）、时间粒度从 1 小时改为 15 分钟。

# 规范
- 技术栈：TypeScript，原生 DOM
- 代码：正式、紧凑，无 emoji

# 任务
按 docs/DRAG_UX_DESIGN.md 实施，顺序如下：

1. 新建 utils/timeSlot.ts：yToMinutes、minutesToY、snapToSlot，15 分钟粒度（SLOTS_PER_HOUR=4）

2. 新建 utils/dragMove.ts：鼠标拖拽移动事件，mousemove 时显示 ghost 预览，mouseup 时提交；日视图单列、周视图需根据 clientX 判断 dayIndex；导出 setupDayViewDragMove、setupWeekViewDragMove

3. 修改 utils/dragResize.ts：mousemove 时实时更新事件条 height 和内部时间文本，15 分钟粒度；slotDelta 按 slotHeight/4 计算

4. 修改 utils/dragCreate.ts：mousemove 时显示 overlay 选区预览，15 分钟粒度；getSlotFromY 改为 yToMinutes

5. 修改 DayView.ts、WeekView.ts：日/周视图的 timed 事件条改用 dragMove，不再用 makeEventDraggable；全天、月视图保留 makeEventDraggable

6. 修改 styles.css：添加 .calendar-drag-ghost、.calendar-drag-create-preview 样式

# 产出
- 事件移动：拖拽时 ghost 实时跟随，释放后正确落位
- 事件 resize：拖拽时高度实时变化，15 分钟粒度
- 拖拽创建：有 overlay 选区预览，15 分钟粒度
- 时间轴标签保持整点，仅交互 15 分钟
```

---

## 月视图全天任务优化 Prompt（docs/DEV_PLAN.md）

将以下内容复制给 AI 编码助手，用于执行 docs/DEV_PLAN.md 中的月视图全天任务显示优化。

```
# 角色
你是 Obsidian 插件开发工程师。请按 docs/DEV_PLAN.md 完成月视图全天任务显示优化。

# 项目
Obsidian 日历插件。跨天全天任务在月视图中需显示为连续横条，对齐 iOS 月视图。

# 规范
- 技术栈：TypeScript，原生 DOM
- 代码：正式、紧凑，无 emoji

# 任务
按 docs/DEV_PLAN.md 当前迭代执行：

1. 排查 MonthView、monthAllDayLayout、calendar-month-bars-overlay 的渲染逻辑，确认跨天任务是否被按天拆分；若存在拆分则修复为单条渲染

2. 确保单条跨天任务只渲染一个 DOM 元素，grid-column、grid-row 正确跨格；computeMonthAllDayLayout 已输出 startRow/startCol/endRow/endCol，检查应用是否正确

3. 文案：任务名在条内左对齐，超长用 text-overflow: ellipsis；至少首格内完整显示

4. 样式：首尾圆角（border-radius 仅首尾格）、中间无断点；条与网格对齐，无错位

5. 重叠任务垂直堆叠（layer），全天条与 timed 事件区域（margin-top）分离

# 产出
- 跨 2 天及以上全天任务为一条连续横条
- 任务名在条内可见
- 重叠任务垂直堆叠，无遮挡
- 全天条与 timed 区域分离
```

---

## 关联笔记优化 Prompt（docs/NOTE_LINK_OPTIMIZATION.md）

将以下内容复制给 AI 编码助手，用于执行 docs/NOTE_LINK_OPTIMIZATION.md 中的关联笔记功能优化。

```
# 角色
你是 Obsidian 插件开发工程师。请按 docs/NOTE_LINK_OPTIMIZATION.md 完成关联笔记功能优化。

# 项目
Obsidian 日历插件。需实现：多条关联笔记、双链格式添加、事件 grid 上点击跳转。

# 规范
- 技术栈：TypeScript，原生 DOM
- 代码：正式、紧凑，无 emoji

# 任务
按 docs/NOTE_LINK_OPTIMIZATION.md 实施，顺序如下：

1. 数据层：types.ts 将 notePath 改为 notePaths: string[]；EventStore.load 迁移旧 notePath；CalendarView 新建事件时传 notePaths: []

2. 新建 src/utils/wikiLink.ts：parseWikiLinks(text) 用正则提取 [[xxx]] 中的 linkpath，返回去重数组

3. EventModal：多笔记 UI（标签列表 + 删除）、输入框支持输入 [[note]] 并解析、+ 选择按钮追加、保存时提交 notePaths

4. DayView、WeekView、MonthView：事件条/chip 在 notePaths.length > 0 时显示链接图标；点击图标阻止冒泡并跳转（单条直接打开，多条用 Menu 或 SuggestModal 选择）

5. styles.css：添加 .calendar-event-note-link 样式

# 产出
- 事件可关联任意多条笔记
- 支持 [[note]] 双链格式添加
- 事件 grid 上点击链接图标可跳转到关联笔记
```

---

## 撤销功能 Prompt（docs/DEV_PLAN.md 下期）

```
# 任务
按 docs/DEV_PLAN.md 撤销功能迭代执行：EventStore 操作历史栈、undo/redo 逻辑、Command+Z/Command+Shift+Z 快捷键、栈深度限制 20–50 步。
```
