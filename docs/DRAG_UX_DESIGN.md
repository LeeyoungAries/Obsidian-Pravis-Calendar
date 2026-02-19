# 拖拽体验优化设计

## 一、需求

1. **拖拽过程可视化**：鼠标未释放前即可看到拖到何处、拖多大
2. **时间粒度**：从当前 1 小时缩小到 15 分钟

---

## 二、现状

| 场景 | 实现方式 | 粒度 | 过程反馈 |
|------|----------|------|----------|
| 事件移动 | HTML5 DnD | 整点 | 无，仅 drop 时生效 |
| 事件 resize | mousedown→mouseup | 1 小时 | 无 |
| 拖拽创建 | mousedown→mouseup | 1 小时 | 无 |

---

## 三、设计方案

### 3.1 时间粒度：15 分钟

**常量**：
```
SLOT_HEIGHT = 48        // 1 小时 = 48px
SLOTS_PER_HOUR = 4      // 15 分钟一格
PX_PER_SLOT = 12       // 48/4，每 15 分钟 12px
```

**工具函数**（新建 `utils/timeSlot.ts`）：
```ts
// Y 坐标 → 分钟数（0-1439，对齐 15 分钟）
function yToMinutes(relY: number, slotHeight: number): number

// 分钟数 → Y 坐标
function minutesToY(minutes: number, slotHeight: number): number

// 对齐到 15 分钟
function snapToSlot(date: Date): Date
```

**涉及修改**：
- `dragCreate.ts`：getSlotFromY 改为 15 分钟粒度
- `dragResize.ts`：computeNewEnd 改为 15 分钟步进
- `EventCard.ts` / 移动逻辑：drop 时按 15 分钟计算
- `DayView.ts` / `WeekView.ts`：makeDropTarget 需支持 15 分钟（见下）

---

### 3.2 事件移动：从 HTML5 DnD 改为鼠标拖拽 + 实时预览

**原因**：HTML5 DnD 的 dragover 只能给 drop 目标加样式，无法在事件条上实时显示「将落在何处」。改用 mousedown/mousemove/mouseup 可完全控制预览。

**流程**：
1. mousedown 在事件条上：记录起始 Y、事件 start/end
2. mousemove：创建/更新 ghost 元素，ghost 的 top 随鼠标 Y 变化，snap 到 15 分钟；ghost 高度 = 原 duration，不变
3. mouseup：计算最终 top（snap 到 15 分钟），调用 updateEvent，移除 ghost

**Ghost 元素**：
- 半透明或虚线边框，与原事件条样式类似
- 随鼠标 Y 实时移动
- 原事件条可设为 opacity: 0.5 或保持不动（推荐：原条保持，ghost 显示目标位置）

**跨列（周视图）**：
- mousemove 时根据 clientX 判断落在哪一列（dayIndex），ghost 显示在该列
- mouseup 时按 dayIndex + Y 计算新 start

**涉及**：新建 `utils/dragMove.ts`，替换 `makeEventDraggable` 在日/周视图中的使用；`EventCard.ts` 保留 makeEventDraggable 供月视图/全天使用（月视图可后续再改）

---

### 3.3 事件 Resize：实时拉伸预览

**流程**：
1. mousedown 在 resize handle：记录 startY、startEnd
2. mousemove：根据 clientY 计算新 end（snap 15 分钟），**直接更新事件条的 height**，并更新条内显示的时间文本
3. mouseup：调用 onUpdate 持久化

**要点**：不新增 ghost，直接改事件条自身。mousemove 时只改 DOM，mouseup 时再写 store。若用户拖出视口后释放，仍按最后有效位置提交。

**粒度**：`slotDelta = Math.round((clientY - startY) / (slotHeight / 4))`，`newEnd.setMinutes(..., newEnd.getMinutes() + slotDelta * 15)`

**涉及**：`dragResize.ts`

---

### 3.4 拖拽创建：实时选区预览

**现状**：dragCreate 已有 mousedown/mousemove/mouseup，但无视觉反馈。

**方案**：mousedown 时创建 overlay div（如 `calendar-drag-create-preview`），mousemove 时根据 startY 与当前 clientY 更新 overlay 的 top 和 height，mouseup 时移除 overlay 并创建事件。

**Overlay 样式**：半透明背景、虚线边框，与事件条风格一致。

**粒度**：getSlotFromY 改为 15 分钟，创建时 start/end 对齐 15 分钟。

**涉及**：`dragCreate.ts`

---

### 3.5 Drop 目标（事件移动）的 15 分钟支持

当前 makeDropTarget 按整点（hour）计算。若改用鼠标拖拽，不再依赖 drop target，而是根据 mouseup 时的 Y 直接计算，自然支持 15 分钟。

若暂时保留 HTML5 DnD 用于全天/月视图，则需：
- 日/周 timed 事件：用新 dragMove（鼠标拖拽）
- 全天、月视图：可继续用 HTML5 DnD，粒度保持整点或后续再改

---

## 四、实现清单

| 模块 | 改动 |
|------|------|
| `utils/timeSlot.ts` | 新建，yToMinutes、minutesToY、snapToSlot |
| `utils/dragMove.ts` | 新建，鼠标拖拽移动 + ghost 预览，15 分钟粒度 |
| `utils/dragResize.ts` | mousemove 实时更新 bar 高度，15 分钟粒度 |
| `utils/dragCreate.ts` | mousemove 显示 overlay 预览，15 分钟粒度 |
| `EventCard.ts` | 日/周视图事件条改用 dragMove，月视图/全天保留 makeEventDraggable |
| `DayView.ts` | 传入 dragMove 所需回调，时间轴 slot 可考虑 15 分钟细分（可选） |
| `WeekView.ts` | 同上 |
| `styles.css` | ghost、overlay、resize handle 样式 |

---

## 五、时间轴显示（可选）

当前时间轴仅显示整点。若改为 15 分钟粒度，可选：
- 保持整点标签，仅交互 15 分钟（推荐）
- 或每 15 分钟画细线，整点画粗线

---

## 六、验收

- [ ] 事件移动：拖拽过程中可见 ghost 实时跟随，释放后落在正确位置
- [ ] 事件 resize：拖拽 handle 时事件条高度实时变化，释放后持久化
- [ ] 拖拽创建：拖拽过程中可见半透明选区
- [ ] 所有拖拽时间粒度为 15 分钟
