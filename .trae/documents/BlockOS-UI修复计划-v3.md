# BlockOS UI 修复计划 v3

> **Goal:** 修复浅色主题下区块颜色、使用指南白底白字不可读、AI 功能和设置板块 UI 不统一的问题

**Architecture:** 统一 HelpPanel 四个标签页的卡片/手风琴视觉风格，修复 BlockEditor 中硬编码深色背景，确保所有文字在浅色/深色主题下均有足够对比度

**Tech Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS + Zustand

---

## 问题清单

1. **区块颜色不随主题切换** — `BlockEditor.tsx` 硬编码 `rgba(30,30,35,0.92)` 背景，浅色主题下仍为深色
2. **使用指南白底白字** — 快速开始区块背景色与文字色在浅色主题下对比度不足
3. **AI 功能页 UI 简陋** — 与使用指南的手风琴风格不一致
4. **设置页 UI 简陋** — 与使用指南的手风琴风格不一致

---

## 文件映射

| 文件 | 职责 |
|---|---|
| `src/components/BlockEditor.tsx` | Block 容器渲染，含硬编码背景色 |
| `src/components/HelpPanel.tsx` | 帮助中心面板，含 4 个标签页 |

---

## Task 1: 修复 BlockEditor 硬编码背景色

**Files:**
- Modify: `src/components/BlockEditor.tsx`

**问题定位:**
- 第 467 行：`style={{ backgroundColor: 'rgba(30,30,35,0.92)' }}` 硬编码深色，覆盖 Tailwind 类
- 子 Block 头部：`bg-blue-950/25` 无浅色变体
- 子 Block 标题：`text-blue-300/80` 无浅色变体

- [ ] **Step 1: 删除硬编码 inline style**

删除 `style={{ backgroundColor: 'rgba(30,30,35,0.92)' }}`，让 `bg-white dark:bg-zinc-850` 生效

- [ ] **Step 2: 修复子 Block 头部背景**

`bg-blue-950/25` → `bg-blue-50/30 dark:bg-blue-950/25`

- [ ] **Step 3: 修复子 Block 标题颜色**

`text-blue-300/80` → `text-blue-500 dark:text-blue-300/80`

---

## Task 2: 修复使用指南白底白字

**Files:**
- Modify: `src/components/HelpPanel.tsx`

**问题定位:**
- 快速开始区块：`bg-gradient-to-br from-blue-500/5 to-purple-500/5` 背景太浅，`text-gray-800 dark:text-zinc-200` 在浅色下对比度可能不足
- 实际问题是文字颜色缺少 `dark:` 前缀或浅色下文字太浅

- [ ] **Step 1: 检查并修复所有文字颜色**

确保所有文字使用 `text-gray-800 dark:text-zinc-200` 或 `text-gray-500 dark:text-zinc-400`，避免浅色下使用 `text-zinc-xxx`（zinc 在浅色下偏白）

- [ ] **Step 2: 增强卡片背景对比度**

快速开始区块背景改为 `bg-blue-50/50 dark:bg-blue-500/5`，确保浅色下可见

---

## Task 3: 统一 AI 功能页为手风琴风格

**Files:**
- Modify: `src/components/HelpPanel.tsx`

**当前问题:**
- AI 功能页使用平铺卡片，与使用指南的手风琴风格不一致
- 视觉上显得简陋

- [ ] **Step 1: 将 AI 功能页改为手风琴区块**

使用 `AccordionItem` 组件包裹：
- "AI Agent" → 手风琴项
- "支持的操作" → 手风琴项  
- "Block 专属 AI" → 手风琴项
- "AI 自动补全" → 手风琴项

- [ ] **Step 2: 统一卡片样式**

所有手风琴内容区使用 `bg-gray-50 dark:bg-zinc-850 border border-gray-100 dark:border-zinc-800 rounded-xl`

---

## Task 4: 统一设置页为手风琴风格

**Files:**
- Modify: `src/components/HelpPanel.tsx`

**当前问题:**
- 设置页使用平铺输入框，与使用指南风格不一致

- [ ] **Step 1: 将设置页改为手风琴区块**

使用 `AccordionItem` 组件包裹：
- "自定义 API" → 手风琴项（内含 API 密钥、基础 URL、模型名称三个输入框）

- [ ] **Step 2: 统一按钮样式**

保存/恢复默认按钮使用与使用指南一致的圆角和配色

---

## Task 5: 构建与运行时验证

- [ ] **Step 1: Build Check**

Run: `npm run build`
Expected: 0 errors, 0 warnings（与本修改相关的）

- [ ] **Step 2: Runtime Check**

Run: `npm run dev`
Expected: 无 Edge Runtime / module 错误

- [ ] **Step 3: 视觉验证清单**

- [ ] 浅色主题下 Block 背景为白色/浅灰色
- [ ] 深色主题下 Block 背景为 zinc-850
- [ ] 使用指南所有文字清晰可读
- [ ] AI 功能页与使用指南风格统一
- [ ] 设置页与使用指南风格统一
