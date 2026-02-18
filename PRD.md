# Obsidian 日历插件 PRD

## 1. 产品概述

将 iOS 日历核心能力迁移至 Obsidian，以事件为中心管理日程，支持与笔记双向链接、Todo 类型，数据存储于 vault 内便于同步与迁移。

---

## 2. 功能范围

### 2.1 MVP 功能（P2）

| 功能 | 描述 |
|------|------|
| 事件管理 | 创建、编辑、删除事件；标题、时间、地点、备注 |
| 多视图 | 日/周/月视图切换 |
| 拖拽调度 | 在日历上拖拽事件调整时间 |
| 全天事件 | 支持无具体起止时间的全天日程 |
| 多日历 | 工作/个人等分类，可开关显示 |
| 唯一 ID | 每个事件生成唯一 ID |
| 链接笔记 | 事件可关联任意笔记，支持双向引用 |
| Todo 类型 | 事件支持 event/todo 两种类型，todo 可勾选完成 |

### 2.2 后续迭代

| 功能 | 描述 |
|------|------|
| 重复事件 | 每天/每周/每月等规则 |
| 提醒 | 提前 N 分钟提醒 |
| 一键迁移 | 导出/导入 JSON |

### 2.3 不做

- Reminders 联动
- 云端同步（依赖 vault 自身同步能力）

---

## 3. 数据模型

### 3.1 存储方案

- 路径：`.obsidian/calendar-events.json`
- 格式：JSON
- 管理：插件全权读写

### 3.2 事件结构

```json
{
  "id": "evt_20250218_abc123",
  "title": "会议",
  "start": "2025-02-18T14:00:00",
  "end": "2025-02-18T15:00:00",
  "allDay": false,
  "location": "",
  "notes": "",
  "calendarId": "cal_work",
  "notePath": "Projects/会议纪要.md",
  "type": "event",
  "completed": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识，格式 evt_YYYYMMDD_随机串 |
| title | string | 标题 |
| start | string | ISO8601 开始时间 |
| end | string | ISO8601 结束时间 |
| allDay | boolean | 是否全天 |
| location | string | 地点 |
| notes | string | 备注 |
| calendarId | string | 所属日历 |
| notePath | string | 关联笔记路径，可选 |
| type | string | event / todo |
| completed | boolean | 仅 todo 有效 |

### 3.3 日历结构

```json
{
  "cal_work": {
    "id": "cal_work",
    "name": "工作",
    "color": "#007AFF",
    "visible": true
  }
}
```

---

## 4. 交互设计

### 4.1 视图

- 日视图：单日时间轴，按小时显示
- 周视图：7 天网格，可拖拽
- 月视图：月历网格，可拖拽

### 4.2 创建/编辑

- 点击空白处创建
- 点击事件打开编辑面板
- 编辑面板支持：标题、时间、全天、地点、备注、笔记链接、日历、类型

### 4.3 笔记链接

- 编辑面板提供笔记选择器（Obsidian 文件选择器）
- 笔记内可通过 `[[event:evt_xxx]]` 或 `event-id: evt_xxx` 引用事件

### 4.4 拖拽

- 日/周/月视图均支持拖拽
- 拖拽更新 start/end，allDay 事件仅更新日期

---

## 5. 技术约束

- 基于 Obsidian Plugin API
- 前端：Obsidian 原生 API + 可选轻量 UI 库
- 数据：JSON 文件读写，无外部依赖

---

## 6. 验收标准

- 可创建、编辑、删除事件
- 日/周/月视图正确渲染
- 拖拽可更新事件时间
- 全天事件正确显示
- 多日历可切换显示
- 事件可关联笔记，笔记可反向引用
- Todo 类型可勾选完成
