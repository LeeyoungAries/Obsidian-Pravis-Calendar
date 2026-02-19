# Obsidian 日历插件 - 技术方案

## 1. 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript | Obsidian 官方推荐 |
| 构建 | esbuild / Rollup | 打包为 main.js |
| UI | 原生 DOM + CSS | 无 React/Vue 依赖，降低体积 |
| 数据 | JSON + Vault API | loadData/saveData 或 vault.adapter.read/write |
| 最低版本 | Obsidian 1.4+ | 覆盖主流用户 |

---

## 2. 架构设计

```
src/
├── main.ts                 # 插件入口
├── store/
│   ├── EventStore.ts       # 事件 CRUD、持久化
│   └── CalendarStore.ts    # 日历配置 CRUD
├── views/
│   ├── CalendarView.ts     # ItemView 基类，视图容器
│   ├── DayView.ts          # 日视图
│   ├── WeekView.ts         # 周视图
│   └── MonthView.ts        # 月视图
├── components/
│   ├── EventCard.ts        # 事件卡片（可拖拽）
│   ├── EventModal.ts       # 创建/编辑弹窗
│   └── CalendarSelector.ts # 多日历切换
├── utils/
│   ├── id.ts               # ID 生成
│   ├── date.ts             # 日期计算
│   └── drag.ts             # 拖拽逻辑
└── types.ts                # Event, Calendar 类型定义
```

---

## 3. 核心模块

### 3.1 数据层 (Store)

**EventStore**
- `load()`: 从 `.obsidian/pravis-calendar-events.json` 读取
- `save()`: 写入 JSON，防抖 300ms
- `getEvents(start, end)`: 按时间范围查询
- `addEvent(event)`: 新增，自动生成 id
- `updateEvent(id, partial)`: 更新
- `deleteEvent(id)`: 删除
- 事件总线：`on('change')` 通知视图刷新

**CalendarStore**
- 存储于同一 JSON 或 `calendar-config` 键
- `getCalendars()`, `updateCalendar()`, `toggleVisible()`

### 3.2 视图层 (View)

**CalendarView** 继承 `ItemView`
- `getViewType()`: `calendar-view`
- `getDisplayText()`: `日历`
- `onOpen()`: 挂载容器，根据 `currentViewMode` 渲染 DayView/WeekView/MonthView
- 顶部：视图切换按钮、日期导航、日历筛选

**DayView**
- 左侧：0-24 小时时间轴
- 右侧：事件按 start 排序渲染，支持拖拽垂直移动

**WeekView**
- 7 列网格，每列一天
- 事件按日期+时间落入对应格子，支持拖拽跨天

**MonthView**
- 月历网格，每格显示当日事件摘要
- 支持拖拽跨日

### 3.3 拖拽

- 使用原生 HTML5 Drag and Drop API
- `EventCard` 设置 `draggable="true"`，`ondragstart` 写入 eventId
- 各视图容器 `ondragover`、`ondrop` 计算目标时间，调用 `EventStore.updateEvent`

### 3.4 编辑弹窗

- 使用 Obsidian `Modal` 基类
- 表单字段：标题、开始/结束时间、全天开关、地点、备注、笔记选择器、日历选择、类型(event/todo)、完成状态
- 笔记选择器：`app.vault.getAbstractFileByPath` + 文件树或 `SuggestModal` 实现

### 3.5 笔记链接

- 编辑时：`SuggestModal` 搜索 vault 内 md 文件，选中后写入 `notePath`
- 笔记内引用：注册 `MarkdownPostProcessor`，解析 `[[event:evt_xxx]]` 或 frontmatter `event-id`，渲染为可点击链接，点击打开日历并定位事件

---

## 4. 数据文件格式

```json
{
  "events": [
    {
      "id": "evt_20250218_abc123",
      "title": "会议",
      "start": "2025-02-18T14:00:00",
      "end": "2025-02-18T15:00:00",
      "allDay": false,
      "location": "",
      "notes": "",
      "calendarId": "cal_default",
      "notePath": "",
      "type": "event",
      "completed": false
    }
  ],
  "calendars": {
    "cal_default": {
      "id": "cal_default",
      "name": "默认",
      "color": "#007AFF",
      "visible": true
    }
  }
}
```

---

## 5. 技术风险与对策

| 风险 | 对策 |
|------|------|
| 大量事件渲染卡顿 | 按可见范围懒加载，虚拟滚动（月视图按需） |
| 拖拽与 Obsidian 快捷键冲突 | 拖拽时阻止默认行为，避免触发全局快捷键 |
| 时区处理 | 统一使用本地时间，ISO 字符串存储 |
| 笔记路径变更 | 监听 vault 的 rename 事件，同步更新 notePath |

---

## 6. 依赖与构建

- 无外部 npm 依赖，仅用 Obsidian 内置 API
- `package.json` scripts: `build` (esbuild), `dev` (watch)
- 输出：`main.js`, `styles.css`, `manifest.json`
