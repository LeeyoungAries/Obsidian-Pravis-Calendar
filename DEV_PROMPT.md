# 开发 Prompt

将以下内容复制给 AI 编码助手，用于启动或继续 Obsidian 日历插件的开发。

---

## Prompt 正文

```
# 角色
你是 Obsidian 插件开发工程师。请按项目规范完成开发任务。

# 项目
Obsidian 日历插件，迁移 iOS 日历核心能力。以事件为中心，支持日/周/月视图、拖拽调度、多日历、笔记链接、Todo 类型。数据存于 .obsidian/calendar-events.json。

# 规范
- 技术栈：TypeScript + esbuild，原生 DOM，无 React/Vue
- 架构与数据模型见 TECH_DESIGN.md
- 功能与验收见 PRD.md
- 排期见 SCHEDULE.md
- 代码：正式、紧凑，无 emoji

# 任务
按 SCHEDULE.md 的 Day 1 执行：
1. 初始化项目（manifest.json, package.json, tsconfig.json, esbuild 构建）
2. 定义 Event/Calendar 类型（types.ts）
3. 实现 EventStore（JSON 读写、CRUD、防抖 save）
4. 实现 CalendarStore（默认日历）
5. 注册 CalendarView（ItemView，空容器，侧边栏可打开）
6. 设置页：周起始日、默认视图

# 产出
- 可 npm run build 成功
- 复制 main.js、manifest.json、styles.css 到 vault/.obsidian/plugins/obsidian-calendar/ 后可加载
- 侧边栏可打开日历面板
- 可创建事件并持久化到 JSON
```

---

## 后续阶段 Prompt 模板

完成 Day 1 后，可将「任务」替换为：

**Day 2-3：**
```
# 任务
按 SCHEDULE.md Day 2-3 执行：MonthView 月历网格、事件展示、EventModal 创建/编辑/删除、日期导航。
```

**Day 4-5：**
```
# 任务
按 SCHEDULE.md Day 4-5 执行：DayView、WeekView、视图切换、全天事件、EventModal 完整表单。
```

**Day 6：**
```
# 任务
按 SCHEDULE.md Day 6 执行：EventCard 拖拽（月/日/周视图）、多日历管理、日历筛选。
```

**Day 7：**
```
# 任务
按 SCHEDULE.md Day 7 执行：笔记选择器、[[event:id]] 解析、Todo 类型与完成状态、样式区分。
```

**Day 8：**
```
# 任务
按 SCHEDULE.md Day 8 执行：全流程联调、边界 case 修复、按 PRD 验收标准 checklist 验收。
```

---

## 体验修复 Prompt（FIX_PLAN.md）

将以下内容复制给 AI 编码助手，用于执行 FIX_PLAN.md 中的体验修复。

### P0 阶段（优先）

```
# 角色
你是 Obsidian 插件开发工程师。请按 FIX_PLAN.md 完成体验修复。

# 项目
Obsidian 日历插件，需对齐 iOS 日历使用体验。详见 FIX_PLAN.md。

# 规范
- 技术栈：TypeScript，原生 DOM
- 代码：正式、紧凑，无 emoji

# 任务
按 FIX_PLAN.md P0 执行：
1. 问题 2：重叠事件布局。新建 utils/overlapLayout.ts，实现 overlap 算法，为每个事件计算 column、totalColumns；修改 DayView、WeekView 中 timed 事件的渲染，按 width/left 并排显示
2. 问题 3：固定表头。日视图全天区域、周视图表头与全天区域、周视图时间轴，使用 position: sticky，确保滚动时始终可见；调整 DOM 与滚动容器结构

# 产出
- 重叠事件并排显示，不遮挡
- 日/周视图表头、全天区域、时间轴滚动时固定
```

### P1 阶段

```
# 任务
按 FIX_PLAN.md P1 执行：
1. 拖拽创建：DayView/WeekView 的 slot 上 mousedown→mousemove→mouseup，有位移时按起止 slot 创建事件，无位移则保持 onSlotClick 打开弹窗
2. 拖拽调整时长：事件条底部增加可拖拽区域，mousedown→document mousemove→mouseup，根据 Y 变化更新 end 时间
```

### P2 阶段

```
# 任务
按 FIX_PLAN.md P2 执行：当前时间线、打开日/周视图时滚动到当前时间、拖拽创建时的选区视觉反馈。
```

### P3 阶段

```
# 任务
按 FIX_PLAN.md P3 执行：月视图拖拽创建、短事件最小高度 28-32px。
```
