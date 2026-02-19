# 全天任务跨天连续条设计

## 一、需求

跨越多天的全天任务，应显示为一条连续横跨多列的任务栏，而非每天一个独立 chip。对齐 iOS 日历。

## 二、现状

周视图中，全天区域为 7 列网格，每列对应一天。跨天事件在每天列内各渲染一个 chip，导致同一任务被拆成多段。

## 三、方案

### 3.1 布局结构

- 保持 7 列网格，与下方时间网格对齐
- 每个跨天事件渲染为**一条横条**，通过 `grid-column: startCol / span count` 跨越多列
- 重叠事件（日期范围相交）垂直堆叠，占用不同行

### 3.2 算法

1. 计算每个事件在当周的列范围：startCol = clamp(事件开始日在本周的索引, 0, 6)，endCol = clamp(事件结束日在本周的索引, 0, 6)
2. 对全天事件做 overlap 行分配：日期范围相交的事件不能在同一行
3. 渲染：每个事件一条 bar，`grid-column: startCol + 1 / endCol + 2`（CSS grid 从 1 开始），`grid-row: rowIndex + 1`

### 3.3 涉及文件

- `utils/allDayOverlapLayout.ts`：新建，计算 startCol、endCol、row
- `WeekView.ts`：全天区域改为按事件渲染跨列 bar，不再按天迭代
- `styles.css`：新增 `.calendar-week-allday-bar` 样式

### 3.4 日视图

日视图全天为单日，无跨列需求，保持现有 chip 列表即可。
