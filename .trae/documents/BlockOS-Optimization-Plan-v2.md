# BlockOS 优化计划 v2：向 Notion 级文档工具演进

## 一、当前状态分析

### 1.1 已实现的特性
- 5 种 Block 类型：text、todo、list、code、table
- 拖拽排序（@dnd-kit）
- 多选（Shift/Cmd+Click）
- `/` 命令菜单创建 Block
- AI 动作菜单（Sparkles 按钮）
- Cmd+K 命令面板
- 双向链接
- Agent 规则引擎（todo 完成自动触发）
- 暗色主题 UI
- localStorage 持久化

### 1.2 已修复的关键问题
- Hydration 不匹配（skipHydration + dynamic ssr:false）
- Agent 无限循环（processedChangesRef 去重）
- Next.js 升级至 15.5.18 + React 19

### 1.3 用户明确的问题
1. **Block 添加体验差** — 只能底部添加，无法在任意位置插入
2. **单页面，无文档管理** — 只有一个页面，无法创建多个文档
3. **操作无法回溯** — 无 Undo/Redo
4. **内容类型单一** — 只有 5 种基础类型
5. **操作逻辑混乱** — 很多交互不自然

### 1.4 探索发现的问题（未在用户列表中）
1. **无页面/文档概念** — 所有 Block 在一个扁平数组里，没有文档层级
2. **无嵌套/缩进** — Block 之间只有顺序关系，没有父子层级
3. **TextBlock 的 contentEditable 光标问题** — 每次 setState 后光标会跳到最后
4. **ListBlock 渲染与编辑分离** — 渲染时解析 content，但编辑时是纯文本，体验割裂
5. **TableBlock 数据不可读** — 内容存 JSON，导出时无法直接阅读
6. **无搜索功能** — 无法搜索 Block 内容
7. **无导出功能** — 无法导出为 Markdown/HTML
8. **AI 功能未配置 API Key** — 已预留接口但无法调用
9. **CommandMenu 只在 `/` 触发时工作** — 空行输入 `/` 的检测逻辑脆弱
10. **无 Block 转换** — 无法将 text 转为 todo，或 todo 转为 list
11. **无删除确认** — Backspace 删除直接消失，无提示
12. **无空 Block 自动清理** — 空 Block 会一直存在

---

## 二、目标定义

### 2.1 核心目标
将 BlockOS 从"单页面 Block 编辑器"升级为"多文档知识管理系统"，核心体验对标 Notion 的 70%。

### 2.2 成功标准
- [ ] 可以创建/管理多个文档（页面）
- [ ] 可以在任意位置添加/插入 Block
- [ ] 支持 Undo/Redo（完整版，含内容编辑）
- [ ] 新增 4 种 Block 类型（图片、引用块、折叠块、分割线）
- [ ] 支持 Block 嵌套/缩进（Tab/Shift+Tab + 拖拽嵌套）
- [ ] Block 类型可转换（text ↔ todo ↔ list）
- [ ] 空 Block 自动清理
- [ ] 搜索功能
- [ ] 导出为 Markdown
- [ ] 独立帮助页面（使用教程）
- [ ] 后端 API + 数据库支持
- [ ] 腾讯服务器部署准备

---

## 三、详细实施方案

### Phase 1: 页面/文档管理（左侧侧边栏）

**目标**：引入 Page 概念，左侧显示所有页面列表

**数据模型变更**（`src/types/block.ts`）：
```typescript
export interface Page {
  id: string;
  title: string;
  icon?: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}
```

**Store 变更**（`src/store/blockStore.ts`）：
- 将 `blocks: Block[]` 改为 `pages: Page[]`
- 添加 `currentPageId: string`
- 添加 `addPage`、`deletePage`、`updatePageTitle`、`setCurrentPage` 方法
- 保留 `blocks` 作为当前页面的 blocks（getter）
- 所有 Block 操作自动作用于当前页面

**新增组件**：
- `src/components/Sidebar.tsx` — 左侧侧边栏
  - 页面列表（可折叠分组）
  - 新建页面按钮
  - 页面右键菜单（重命名、删除、复制）
  - 当前页面高亮
  - 拖拽排序页面

**修改组件**：
- `src/components/BlockOSApp.tsx` — 添加 Sidebar 布局
- `src/components/Toolbar.tsx` — 添加当前页面标题编辑

---

### Phase 2: 完整 Undo/Redo

**目标**：记录所有状态变更，支持无限级撤销/重做

**实现方案**：
- 在 store 中维护 `history: Block[][]` 和 `historyIndex