# 关联笔记功能优化 - 技术开发方案

## 一、现状与目标

### 现状

- 事件仅支持单条 `notePath: string`
- 编辑弹窗：单输入框 +「选择」按钮（NoteSuggestModal）+「清除」
- 有笔记时显示「打开」按钮，但需进入编辑弹窗才能点击
- 事件条（日/周/月视图）不展示关联笔记，无法从 grid 直接跳转

### 目标

1. 支持任意多条关联笔记
2. 支持双链格式 `[[note name]]` 添加
3. 在事件 grid 上点击即可跳转到关联笔记

---

## 二、数据模型

### 2.1 字段变更

```ts
// types.ts
export interface Event {
  // ...
  notePaths: string[];  // 新增，替代 notePath
}
```

- 移除 `notePath`，统一使用 `notePaths`
- 旧数据在 load 时迁移

### 2.2 迁移逻辑（EventStore.load）

```ts
const events = (parsed.events ?? []).filter((e) => e?.id && e?.start && e?.end).map((e) => {
  const notePaths = Array.isArray(e.notePaths)
    ? e.notePaths.filter((p) => typeof p === "string" && p.trim())
    : (e.notePath && String(e.notePath).trim() ? [e.notePath.trim()] : []);
  return { ...e, notePaths };
});
```

### 2.3 JSON 存储

```json
{ "notePaths": ["Projects/会议纪要.md", "Notes/相关文档.md"] }
```

---

## 三、实现步骤（开发顺序）

### 步骤 1：数据层

| 子项 | 实现 |
|------|------|
| types.ts | `notePath` 改为 `notePaths: string[]` |
| EventStore.load | 迁移 `notePath` → `notePaths` |
| EventStore.addEvent / updateEvent | 使用 `notePaths` |
| CalendarView | 新建事件时传 `notePaths: []` |

### 步骤 2：工具函数

新建 `src/utils/wikiLink.ts`：

```ts
export function parseWikiLinks(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]#|]+)(?:[#|][^\]]*)?\]\]/g);
  return [...new Set([...matches].map((m) => m[1].trim()))];
}
```

### 步骤 3：EventModal 多笔记 UI

| 子项 | 实现 |
|------|------|
| 标签列表 | 用 div 展示 notePaths，每项为 chip + 删除按钮 |
| 输入框 | textarea 或 input，placeholder 提示可输入 `[[note]]` |
| 双链解析 | input/blur 时用 parseWikiLinks 提取，`metadataCache.getFirstLinkpathDest(linkpath, "")` 解析为 path，去重追加 |
| + 选择 | 打开 NoteSuggestModal，选中后追加到 notePaths（去重） |
| 保存 | 提交 notePaths 数组 |

### 步骤 4：事件 Grid 跳转

| 视图 | 位置 | 实现 |
|------|------|------|
| DayView | 全天 chip、timed bar | `notePaths.length > 0` 时在标题旁加 `.calendar-event-note-link` 图标 |
| WeekView | 全天 bar、timed bar | 同上 |
| MonthView | 日格内 chip | 同上 |

**点击逻辑**：

- 图标点击：`ev.stopPropagation()`，执行跳转
- 单条：`app.workspace.getLeaf().openFile(file)`
- 多条：用 `FuzzySuggestModal` 或 `Menu` 列出笔记，选择后打开

**回调传递**：CalendarView 需向各 View 传入 `onNoteLinkClick?: (event: Event) => void`，内部用 `app` 打开文件；或各 View 接收 `app`，自行处理。

### 步骤 5：样式

```css
.calendar-event-note-link {
  margin-left: 4px;
  opacity: 0.7;
  cursor: pointer;
}
.calendar-event-note-link:hover { opacity: 1; }
```

---

## 四、涉及文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/types.ts` | `notePath` → `notePaths: string[]` |
| `src/store/EventStore.ts` | load 迁移、add/update 使用 notePaths |
| `src/utils/wikiLink.ts` | 新建，parseWikiLinks |
| `src/components/EventModal.ts` | 多笔记 UI、双链解析、notePaths 读写 |
| `src/views/DayView.ts` | 链接图标、点击跳转 |
| `src/views/WeekView.ts` | 同上 |
| `src/views/MonthView.ts` | 同上 |
| `src/views/CalendarView.ts` | 新建事件 notePaths: []，向 View 传入 app 或 onNoteLinkClick |
| `styles.css` | `.calendar-event-note-link` |

---

## 五、向后兼容

- 读取：`notePath` 存在且无 `notePaths` 时，自动填充
- 写入：只写 `notePaths`，不再写 `notePath`
