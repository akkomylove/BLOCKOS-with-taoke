# BlockOS 优化计划

> 基于 Phase 1 探索结果制定的详细实施计划。用户选择：Tailwind `dark:` 类名切换方案，优先级由我定。

---

## 一、优先级排序（按依赖与价值）

| 优先级 | 功能 | 理由 |
|--------|------|------|
| P0 | 深色/浅色主题切换 | 所有后续 UI 改动都涉及颜色，必须先定主题系统 |
| P1 | 标签系统完善 | 数据层已存在（meta.tags），只需补 UI，低风险高价值 |
| P2 | 全文搜索增强 | 在现有 SearchPanel 上扩展，加标签/类型过滤 |
| P3 | Block 模板库 | 独立功能，不依赖其他改动 |
| P4 | 代码 Block 多语言支持 | 扩展 LANGUAGES 数组 + 高亮，改动小 |
| P5 | AI 自动补全 | 需要新 API 路由 + TextBlock 集成，复杂度中等 |
| P6 | 版本历史时间线 | 基于现有 undo/redo 历史做可视化 |
| P7 | Block 间数据联动 | 最复杂，涉及响应式依赖追踪，放最后 |

---

## 二、P0: 深色/浅色主题切换

### 当前状态
- `layout.tsx` 硬编码 `bg-zinc-950 text-zinc-100`
- 所有组件大量使用 `bg-zinc-*`、`text-zinc-*`、`border-zinc-*`
- `tailwind.config.ts` 已定义 `--background` / `--foreground` CSS 变量但未使用
- 无主题状态管理

### 方案：Tailwind `dark:` 类名切换

1. **启用 Tailwind darkMode**: 在 `tailwind.config.ts` 添加 `darkMode: 'class'`
2. **创建 ThemeProvider**: `src/components/ThemeProvider.tsx`
   - 用 localStorage 持久化主题偏好
   - 在 `<html>` 元素上切换 `dark` / `light` 类
   - 提供 `useTheme()` hook
3. **重构颜色使用**: 将所有硬编码 `zinc` 颜色替换为语义化映射
   - 由于组件数量多（20+），采用**最小改动策略**：
   - 保留现有 `bg-zinc-950` 等作为暗色值
   - 为每个组件添加 `dark:` 前缀的亮色对应值
   - 例如：`bg-zinc-950` → `bg-white dark:bg-zinc-950`
4. **在 Toolbar 添加主题切换按钮**: 太阳/月亮图标

### 需要修改的文件
- `tailwind.config.ts` — 添加 `darkMode: 'class'`
- `src/app/layout.tsx` — 移除硬编码 bg/text，交给 ThemeProvider
- `src/components/ThemeProvider.tsx` — 新建
- `src/components/Toolbar.tsx` — 添加主题切换按钮
- `src/components/BlockOSApp.tsx` — 包裹 ThemeProvider
- **所有使用硬编码 zinc 颜色的组件** — 批量添加 `dark:` 对应值

### 颜色映射规则

| 暗色（当前） | 亮色对应 |
|-------------|---------|
| `bg-zinc-950` | `bg-gray-50` |
| `bg-zinc-900` | `bg-white` |
| `bg-zinc-850` | `bg-gray-100` |
| `bg-zinc-800` | `bg-gray-200` |
| `bg-zinc-700` | `bg-gray-300` |
| `text-zinc-100` | `text-gray-900` |
| `text-zinc-200` | `text-gray-800` |
| `text-zinc-300` | `text-gray-700` |
| `text-zinc-400` | `text-gray-500` |
| `text-zinc-500` | `text-gray-400` |
| `text-zinc-600` | `text-gray-400` |
| `border-zinc-700` | `border-gray-200` |
| `border-zinc-800` | `border-gray-200` |
| `border-zinc-600` | `border-gray-300` |

---

## 三、P1: 标签系统完善

### 当前状态
- `BlockMeta.tags?: string[]` 已定义在 `types/block.ts`
- 没有任何 UI 入口可以查看、添加、编辑标签
- SearchPanel 不搜索标签

### 实现方案

1. **Block 标签编辑 UI**: 在每个 Block 的标题栏（BlockEditor.tsx 的 renderBlockTree）添加标签显示和编辑
   - 显示已有标签为小圆角标签
   - 点击添加按钮弹出输入框，输入后回车添加
   - 点击标签上的 × 删除
2. **标签颜色**: 为常见标签分配预设颜色（工作/个人/重要/待办/灵感等）
3. **Store 方法**: 复用 `updateBlock` 更新 `meta.tags`，无需新方法

### 需要修改的文件
- `src/components/BlockEditor.tsx` — 在 Block 标题栏添加标签显示/编辑
- `src/types/block.ts` — 如有需要扩展标签相关类型

---

## 四、P2: 全文搜索增强

### 当前状态
- SearchPanel 只搜索 `title` 和 `content`
- 无过滤条件
- 结果只显示类型和预览

### 实现方案

1. **标签搜索**: 在过滤逻辑中加入 `b.meta.tags?.some(t => t.toLowerCase().includes(q))`
2. **类型过滤**: 添加类型筛选按钮组（全部/text/todo/code/table/media/quote/toggle）
3. **标签过滤**: 显示当前页面所有存在的标签，可点击筛选
4. **高亮匹配**: 在结果预览中高亮匹配的关键词
5. **搜索结果展示增强**: 显示匹配的标签、类型图标

### 需要修改的文件
- `src/components/SearchPanel.tsx` — 扩展搜索逻辑和 UI

---

## 五、P3: Block 模板库

### 当前状态
- `blockStore.ts` 有 `seedBlocks` 作为默认数据
- 无模板选择机制

### 实现方案

1. **定义模板数据结构**:
   ```typescript
   interface BlockTemplate {
     id: string;
     name: string;
     icon: string;
     description: string;
     blocks: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>[];
   }
   ```
2. **预设模板**:
   - 会议纪要（text + todo + text）
   - 项目计划（text + table + todo）
   - 读书笔记（text + quote + text）
   - 周报（text + todo + text）
   - 空白页面
3. **新建页面时选择模板**: 在 Sidebar 的「新建页面」流程中添加模板选择弹窗
4. **Store 方法**: `addPageFromTemplate(templateId: string)` — 基于模板创建 Block

### 需要修改的文件
- `src/types/block.ts` — 添加 BlockTemplate 类型
- `src/store/blockStore.ts` — 添加模板数据和 addPageFromTemplate 方法
- `src/components/Sidebar.tsx` — 新建页面时弹出模板选择
- `src/components/TemplatePicker.tsx` — 新建模板选择组件

---

## 六、P4: 代码 Block 多语言支持

### 当前状态
- `LANGUAGES` 数组只有 13 种语言
- 无语法高亮（textarea 纯文本）
- 只有 JavaScript 能运行

### 实现方案

1. **扩展语言列表**: 增加到 30+ 种常用语言
   - 前端: javascript, typescript, jsx, tsx, html, css, scss, json, markdown
   - 后端: python, java, kotlin, go, rust, c, cpp, csharp, ruby, php
   - 数据: sql, yaml, toml, graphql
   - 其他: bash, powershell, dockerfile, regex
2. **添加语法高亮**: 引入 `prismjs` 或 `highlight.js`
   - 编辑时保持 textarea
   - 只读/预览模式下用高亮渲染
3. **运行按钮按语言显示**: 目前只有 JS 显示运行按钮，后续可扩展（但本次只加语言列表+高亮）

### 需要修改的文件
- `src/components/blocks/CodeBlock.tsx` — 扩展 LANGUAGES，集成高亮库
- `package.json` — 添加 prismjs 或 highlight.js 依赖

---

## 七、P5: AI 自动补全

### 当前状态
- TextBlock 是 contenteditable，无 AI 补全功能
- AI 生成需要打开 CommandPalette

### 实现方案

1. **触发方式**: 在 TextBlock 中输入时，检测停顿（如停止输入 1.5 秒）自动触发补全建议
2. **UI 展示**: 在光标位置显示灰色幽灵文本（ghost text），按 Tab 接受
3. **API 路由**: 复用 `/api/ai/generate`，prompt 为「基于以下内容续写：...」
4. **节流控制**: 最小间隔 3 秒，避免频繁请求
5. **开关**: 在 HelpPanel 设置中添加「AI 自动补全」开关

### 需要修改的文件
- `src/components/blocks/TextBlock.tsx` — 添加补全逻辑和幽灵文本 UI
- `src/components/HelpPanel.tsx` — 添加补全开关设置

---

## 八、P6: 版本历史时间线

### 当前状态
- `blockStore.ts` 有 `history: HistoryEntry[]`（最多 50 条）
- 只有 undo/redo，无可视化

### 实现方案

1. **新建 HistoryPanel 组件**: 时间线形式展示历史记录
   - 每条记录显示时间戳、Block 数量变化、操作类型（推断）
   - 点击某条记录直接恢复到该状态
   - 对比视图：显示两个版本间的差异
2. **Toolbar 添加入口**: 历史按钮
3. **Store 增强**: 在历史条目中记录操作类型（create/update/delete/move）

### 需要修改的文件
- `src/store/blockStore.ts` — 在历史条目中添加操作类型
- `src/components/HistoryPanel.tsx` — 新建
- `src/components/Toolbar.tsx` — 添加历史按钮
- `src/components/BlockOSApp.tsx` — 集成 HistoryPanel

---

## 九、P7: Block 间数据联动

### 当前状态
- CodeBlock 有 `@ref` 语法可以引用其他 Block 内容
- 但引用是静态的（运行时才解析），表格变化不会自动触发代码块更新

### 实现方案

1. **依赖追踪**: 在 `blockStore.ts` 中维护 `blockDependencies: Record<string, string[]>`（blockId → 依赖它的 blockId 列表）
2. **自动更新**: 当 Block A 变化时，查找所有依赖 A 的 Block，自动更新它们
3. **CodeBlock 联动**: 表格数据变化时，引用该表格的代码块自动重新运行
4. **UI 提示**: 在 Block 上显示「被 X 个 Block 引用」的提示

### 需要修改的文件
- `src/store/blockStore.ts` — 添加依赖追踪和联动逻辑
- `src/components/blocks/CodeBlock.tsx` — 监听依赖变化自动重运行
- `src/components/BlockEditor.tsx` — 显示引用计数

---

## 十、实施顺序与依赖

```
P0 主题切换
  ├── 修改 tailwind.config.ts
  ├── 新建 ThemeProvider
  ├── 修改 layout.tsx / BlockOSApp.tsx
  └── 批量修改所有组件的颜色类名

P1 标签系统
  ├── 修改 BlockEditor.tsx（标签编辑 UI）
  └── 依赖 P0（颜色类名）

P2 搜索增强
  ├── 修改 SearchPanel.tsx
  └── 依赖 P1（标签搜索）

P3 模板库
  ├── 修改 types/block.ts
  ├── 修改 blockStore.ts
  ├── 新建 TemplatePicker.tsx
  └── 修改 Sidebar.tsx

P4 代码语言
  ├── 修改 CodeBlock.tsx
  └── 添加 prismjs 依赖

P5 AI 补全
  ├── 修改 TextBlock.tsx
  └── 修改 HelpPanel.tsx

P6 历史时间线
  ├── 修改 blockStore.ts
  ├── 新建 HistoryPanel.tsx
  ├── 修改 Toolbar.tsx
  └── 修改 BlockOSApp.tsx

P7 数据联动
  ├── 修改 blockStore.ts
  ├── 修改 CodeBlock.tsx
  └── 修改 BlockEditor.tsx
```

---

## 十一、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 主题切换批量改颜色类名可能遗漏 | 某些组件在亮色下显示异常 | 改完后逐个面板检查，build 通过后再验证 |
| 新增 prismjs 增加包体积 | 构建变慢 | 只导入需要的语言包 |
| AI 自动补全频繁调用 API | 费用/限流 | 加节流和本地开关 |
| Block 联动循环依赖 | 无限更新 | 加更新深度限制和检测 |

---

## 十二、验收标准

- [ ] 主题切换：点击按钮后所有 UI 元素正确切换深浅色，偏好持久化
- [ ] 标签系统：每个 Block 可添加/删除标签，标签有颜色区分
- [ ] 搜索增强：可按类型/标签过滤，高亮关键词
- [ ] 模板库：新建页面时可选择模板，模板正确生成 Block
- [ ] 代码语言：支持 30+ 语言，只读模式有语法高亮
- [ ] AI 补全：TextBlock 停顿后显示幽灵文本，Tab 接受
- [ ] 历史时间线：可视化历史，可点击恢复，显示差异
- [ ] 数据联动：表格变化后引用的代码块自动更新
- [ ] 所有改动 `npm run build` 0 errors 0 warnings
