# BlockOS 功能总览

> **最后更新**: 2026-05-14  
> **目的**: 本文档记录 BlockOS 当前所有功能，后续修改时请参考此文档，避免误删或破坏已有功能。

---

## 一、技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + Turbopack |
| 语言 | TypeScript |
| UI | React 19 + Tailwind CSS |
| 状态管理 | Zustand + immer + persist (localStorage) |
| AI SDK | `@ai-sdk/openai-compatible` → SiliconFlow API |
| 图标 | lucide-react |
| ID 生成 | nanoid |
| 数据库 | SQLite (better-sqlite3) 服务端持久化 |

---

## 二、Block 类型（8种）

**类型定义文件**: [src/types/block.ts](file:///c:/Users/86135/Desktop/blockOS/src/types/block.ts)

| 类型 | 组件 | 说明 |
|------|------|------|
| `text` | TextBlock | 富文本，支持加粗/斜体/下划线/删除线、列表、字体(8种)/字号(12-48px)/颜色(10色) |
| `todo` | TodoBlock | 可勾选待办事项，勾选时自动记录日志 |
| `code` | CodeBlock | 代码块，支持语法高亮、语言切换、`@ref` 引用语法链接其他 Block |
| `table` | TableBlock | 数据表格，支持列类型(文本/数字/日期/选择/复选框/链接)、增删行列 |
| `media` | MediaBlock | 图片/视频/音频，自动检测类型，支持 URL 和上传 |
| `quote` | QuoteBlock | 引用块 |
| `toggle` | ToggleBlock | 可折叠/展开内容，支持子 Block |
| `divider` | DividerBlock | 水平分割线 |

**已删除的类型**: `list`（已废弃，功能合并到 TextBlock 的列表格式化）、`image`（已合并为 `media`）

### Block 数据结构

```typescript
interface Block {
  id: string;
  type: BlockType;
  title: string;          // 小标题
  content: string;         // 主体内容
  meta: BlockMeta;
  parentId: string | null; // 父 Block ID（层级结构）
  order: number;
  x: number;               // 画布 X 坐标
  y: number;               // 画布 Y 坐标
  width: number;           // 宽度
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface BlockMeta {
  aiContext?: string;
  tags?: string[];
  links?: string[];        // 链接到其他 Block 的 ID 列表
  highlight?: string;
  checked?: boolean;       // todo 专用
  language?: string;       // code 专用
  expanded?: boolean;      // toggle 专用
  caption?: string;        // media 专用
  fontSize?: number;       // text 专用
  fontFamily?: string;     // text 专用
  fontColor?: string;      // text 专用
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
}
```

---

## 三、导航栏 Toolbar

**文件**: [src/components/Toolbar.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/Toolbar.tsx)

导航栏位于页面顶部，包含以下按钮（从左到右）：

| 按钮 | 功能 |
|------|------|
| Logo + BlockOS | 品牌标识 |
| 页面标题输入框 | 实时编辑当前页面名称 |
| 撤销/重做 | 基于历史栈（最多50步） |
| 选中计数 + 复制/删除 | 当有 Block 被选中时显示 |
| **AI 助手** | 打开 CommandPalette，Agent 级别操作 |
| 关系 | 打开右侧 RelationDrawer |
| Agent | 开关 Agent 自动规则 |
| 日志 | 显示/隐藏 Agent 运行日志 |
| 搜索 | 打开 SearchPanel |
| 导出 | 打开 ExportPanel |
| 导入 | 打开 ImportPanel |
| AI 格式化 | 仅选中单个 text 类型 Block 时显示 |
| 帮助 | 打开 HelpPanel |

---

## 四、AI 功能（核心）

### 4.1 AI 助手 / CommandPalette（Agent 级别）

**文件**: [src/components/CommandPalette.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/CommandPalette.tsx)  
**API**: [src/app/api/ai/command/route.ts](file:///c:/Users/86135/Desktop/blockOS/src/app/api/ai/command/route.ts)

- 快捷键: `Ctrl+K`
- 自动判断用户意图：包含操作关键词（删除/创建/高亮等）→ 走 `/api/ai/command`（Agent操作）；否则 → 走 `/api/ai/generate`（内容生成）
- **Agent 操作类型**:
  - `deleteAllBlocks` — 删除所有 Block
  - `deleteBlock` — 删除指定 Block
  - `createBlock` — 创建新 Block（含内容）
  - `updateBlock` — 更新 Block 内容
  - `highlightBlocks` — 高亮包含关键词的 Block
  - `clearAllContent` — 清空所有 Block 内容
- 执行结果以绿色卡片展示
- 内容生成结果可选择"创建为 Block"

### 4.2 AI 生成（自由对话）

**API**: [src/app/api/ai/generate/route.ts](file:///c:/Users/86135/Desktop/blockOS/src/app/api/ai/generate/route.ts)

- 流式输出文本内容
- 用于非操作类请求（写作、问答等）

### 4.3 Block 专属 AI 操作

**文件**: [src/components/AIActionMenu.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/AIActionMenu.tsx)  
**API**: [src/app/api/ai/block-action/route.ts](file:///c:/Users/86135/Desktop/blockOS/src/app/api/ai/block-action/route.ts)

每个 Block 右侧 Sparkles 按钮，根据 Block 类型提供不同 AI 操作：

| Block 类型 | 可用操作 |
|-----------|---------|
| text | 总结、改写（正式）、改写（随意）、扩展 |
| todo | 拆解子任务、总结 |
| code | 解释代码、优化建议 |
| table | 数据洞察、总结 |
| media | 生成描述 |
| quote | 总结 |
| toggle | 总结 |
| divider | 无 |

### 4.4 AI 结果处理

**文件**: [src/components/AIResultCard.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/AIResultCard.tsx)

AI 处理完成后展示结果卡片，三个操作按钮：
- **替换原内容** — 直接替换当前 Block
- **保存到...** — 选择目标 Block 保存
- **创建新 Block** — 创建新的 Block 保存结果

### 4.5 AI 总结

**API**: [src/app/api/ai/summary/route.ts](file:///c:/Users/86135/Desktop/blockOS/src/app/api/ai/summary/route.ts)

- 对文本内容进行总结

### 4.6 AI 文档格式化

**API**: [src/app/api/ai/format-document/route.ts](file:///c:/Users/86135/Desktop/blockOS/src/app/api/ai/format-document/route.ts)

- 导航栏「AI 格式化」按钮（选中单个 text Block 时显示）
- 将纯文本格式化为结构化 Markdown/HTML

### 4.7 AI Provider 配置

**文件**: [src/lib/ai-provider.ts](file:///c:/Users/86135/Desktop/blockOS/src/lib/ai-provider.ts)

- 主模型: `Qwen/Qwen3-8B`
- 备用模型: `THUDM/glm-4-9b-chat`
- API: SiliconFlow (`https://api.siliconflow.cn/v1`)
- 用户在帮助中心 → 设置 可配置自定义 API Key/Base URL/Model

---

## 五、导入功能

**文件**: [src/components/ImportPanel.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/ImportPanel.tsx)

### 5.1 标签页

| 标签 | 支持方式 |
|------|---------|
| Markdown | 文件选择(.md) + 拖放 + 粘贴内容 |
| CSV 表格 | 文件选择(.csv) + 拖放 + 粘贴内容 |
| 图片 | 文件选择 + 拖放（自动导入为 media Block） |

### 5.2 导入方法（Store）

- `importFromMarkdown(md)` — 解析标题/代码块/待办/引用/分割线
- `importFromCsv(csv)` — 解析 CSV → Table Block
- `importImage(base64, caption?)` — 创建 Media Block

---

## 六、导出功能

**文件**: [src/components/ExportPanel.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/ExportPanel.tsx)

| 格式 | 说明 |
|------|------|
| Markdown (.md) | 完整 Markdown 格式 |
| HTML (.html) | 完整网页格式，含内嵌样式 |
| PDF (.pdf) | 通过 Playwright 服务端渲染 |
| Word (.doc) | Microsoft Word 兼容格式 |

### 导出方法（Store）

- `exportToMarkdown()` — 返回 Markdown 字符串
- `exportToHtml()` — 返回 HTML 字符串

---

## 七、搜索功能

**文件**: [src/components/SearchPanel.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/SearchPanel.tsx)

- 同时搜索 Block 的 `title` 和 `content`
- 标题匹配结果标记"标题匹配"标签
- 点击结果自动选中并滚动到对应 Block
- 最多显示 20 条结果

---

## 八、关系视图

**文件**: [src/components/RelationDrawer.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/RelationDrawer.tsx)

右侧滑出面板，三个标签页：

### 8.1 链接关系
- 显示正向链接（A→B）和反向链接（被谁引用）
- 统计正向/反向链接数量
- 点击跳转到对应 Block

### 8.2 层级结构
- 显示父子关系树
- 支持缩进显示层级深度
- 显示每个节点的子 Block 数量

### 8.3 数据概览
- Block 总数、连接总数、子 Block 数、孤立 Block 数
- 类型分布（进度条 + 百分比）
- 链接密度（每个 Block 平均连接数）

---

## 九、帮助中心

**文件**: [src/components/HelpPanel.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/HelpPanel.tsx)

四个标签页：

### 9.1 使用指南
- 快速开始说明
- 7 种 Block 类型卡片展示
- 父子关系说明

### 9.2 快捷键
| 快捷键 | 功能 |
|--------|------|
| Ctrl+K | 打开 AI 助手 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| Ctrl+F | 搜索 |
| Esc | 关闭面板 |
| Enter | 提交/AI 确认 |

### 9.3 AI 功能
- Agent 能力说明
- 支持的操作及示例命令
- Block 专属 AI 说明

### 9.4 设置
- 自定义 API Key
- 自定义 Base URL
- 自定义模型名称
- 保存/恢复默认

---

## 十、状态管理（Zustand Store）

**文件**: [src/store/blockStore.ts](file:///c:/Users/86135/Desktop/blockOS/src/store/blockStore.ts)

### 页面管理
- `addPage(title?)` — 新建页面
- `deletePage(id)` — 删除页面
- `updatePageTitle(id, title)` — 更新页面标题
- `setCurrentPage(id)` — 切换页面
- `saveCurrentPageBlocks()` — 保存当前页面 Block 到缓存
- `loadPageBlocks(pageId)` — 加载页面 Block

### Block 操作
- `addBlock(type, afterId?, position?)` — 创建 Block
- `duplicateBlock(id)` — 复制 Block
- `updateBlock(id, updates)` — 更新 Block
- `deleteBlock(id)` — 删除 Block
- `moveBlock(activeId, overId)` — 排序移动
- `moveBlockTo(id, x, y)` — 自由移动位置
- `resizeBlock(id, width)` — 调整宽度（最小200px）

### 选择操作
- `setSelection(ids)` — 设置选中
- `toggleSelection(id)` — 切换选中
- `clearSelection()` — 清除选中
- `createLink(fromId, toId)` — 创建 Block 间链接

### 层级操作
- `indentBlock(id)` — 缩进（成为前一个 Block 的子节点，最大深度5）
- `outdentBlock(id)` — 减少缩进
- `getBlockDepth(id)` — 获取深度

### 撤销/重做
- `undo()` / `redo()` — 基于历史栈（最多50步）
- `canUndo()` / `canRedo()` — 检查是否可操作
- `saveHistory()` — 自动在每次修改时调用

### 导出/导入
- `exportToMarkdown()` / `exportToHtml()`
- `importFromMarkdown(md)` / `importFromCsv(csv)` / `importImage(base64, caption?)`

### 服务端同步
- `syncToServer()` — 上传当前页 Block 到服务端
- `loadFromServer(pageId)` — 从服务端加载 Block
- `syncPages()` — 同步页面列表

### Agent
- `toggleAgent()` — 开关 Agent 自动规则
- `addAgentLog(log)` — 添加日志（最多保留20条）

### 持久化
- 通过 `zustand/middleware/persist` 自动保存到 localStorage
- Key: `blockos-storage`

---

## 十一、侧边栏

**文件**: [src/components/Sidebar.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/Sidebar.tsx)

- 页面列表（图标 + 标题）
- 点击切换页面
- 新建页面按钮

---

## 十二、其他组件

| 组件 | 文件 | 说明 |
|------|------|------|
| BlockEditor | BlockEditor.tsx | 主画布，无限白板，支持缩放/平移/框选 |
| SortableBlock | SortableBlock.tsx | 可拖拽排序的 Block 包装器 |
| BlockRenderer | BlockRenderer.tsx | 根据 type 渲染对应 Block 组件 |
| CommandMenu | CommandMenu.tsx | 右键菜单，选择新建 Block 类型（键盘方向键导航） |
| AgentLogPanel | AgentLogPanel.tsx | Agent 运行日志面板 |
| OnboardingTour | OnboardingTour.tsx | 首次使用引导 |
| ShortcutPanel | ShortcutPanel.tsx | 快捷键面板 |
| Logo | Logo.tsx | Logo 组件 |

---

## 十三、API 路由（共10个）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/ai/generate` | POST | AI 文本生成（流式） |
| `/api/ai/command` | POST | AI Agent 命令（流式 JSON） |
| `/api/ai/block-action` | POST | Block 专属 AI 操作 |
| `/api/ai/summary` | POST | AI 文本总结 |
| `/api/ai/format-document` | POST | AI 文档格式化 |
| `/api/pages` | GET/POST | 页面列表 / 创建页面 |
| `/api/pages/[id]` | GET | 获取单个页面及 Blocks |
| `/api/pages/[id]/blocks` | POST | 同步 Block 数据 |
| `/api/export/pdf` | POST | PDF 导出（Playwright） |
| `/api/auth/[...nextauth]` | ALL | 认证 |

---

## 十四、数据持久化

- **本地**: localStorage (`blockos-storage`)，通过 Zustand persist 中间件
- **服务端**: SQLite，通过 `/api/pages` 系列接口同步
- **历史记录**: 内存中维护最多 50 步的历史栈，支持撤销/重做
- **自动同步**: 每次 `saveHistory()` 后自动调用 `syncToServer()`
- **启动加载**: 应用启动时先 rehydrate localStorage，再异步加载服务端数据

---

## 十五、Agent 规则系统

**类型定义**: [src/types/block.ts](file:///c:/Users/86135/Desktop/blockOS/src/types/block.ts) (AgentRule, AgentAction, AgentLog)

- 预置规则：任务完成日志（todo 勾选时自动创建完成记录 + AI 鼓励语）
- 可通过 `agentEnabled` 全局开关
- `useAgent` hook 监听 Block 变更自动触发规则

---

## 十六、文件结构速查

```
src/
├── app/api/
│   ├── ai/
│   │   ├── generate/route.ts        # AI 生成
│   │   ├── command/route.ts         # AI Agent 命令
│   │   ├── block-action/route.ts    # Block 专属 AI
│   │   ├── summary/route.ts         # AI 总结
│   │   └── format-document/route.ts # AI 格式化
│   ├── pages/
│   │   ├── route.ts                 # 页面 CRUD
│   │   └── [id]/
│   │       ├── route.ts             # 页面详情
│   │       └── blocks/route.ts      # Block 同步
│   ├── export/pdf/route.ts          # PDF 导出
│   └── auth/[...nextauth]/route.ts  # 认证
├── components/
│   ├── blocks/
│   │   ├── TextBlock.tsx            # 富文本（字体/字号/颜色）
│   │   ├── TodoBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── TableBlock.tsx
│   │   ├── MediaBlock.tsx           # 图片/视频/音频
│   │   ├── QuoteBlock.tsx
│   │   ├── ToggleBlock.tsx
│   │   └── DividerBlock.tsx
│   ├── BlockEditor.tsx              # 主画布
│   ├── BlockRenderer.tsx            # Block 渲染器
│   ├── SortableBlock.tsx            # 可拖拽 Block
│   ├── Toolbar.tsx                  # 顶部导航栏
│   ├── CommandPalette.tsx           # AI 助手面板
│   ├── CommandMenu.tsx              # 新建 Block 菜单
│   ├── AIResultCard.tsx             # AI 结果卡片
│   ├── AIActionMenu.tsx             # Block 专属 AI 菜单
│   ├── SearchPanel.tsx              # 搜索面板
│   ├── ImportPanel.tsx              # 导入面板
│   ├── ExportPanel.tsx              # 导出面板
│   ├── HelpPanel.tsx                # 帮助中心
│   ├── RelationDrawer.tsx           # 关系视图
│   ├── Sidebar.tsx                  # 侧边栏
│   ├── AgentLogPanel.tsx            # Agent 日志
│   ├── BlockOSApp.tsx               # 主应用组件
│   ├── OnboardingTour.tsx           # 新手引导
│   └── ShortcutPanel.tsx            # 快捷键面板
├── store/blockStore.ts              # Zustand 状态管理
├── types/block.ts                   # 类型定义
├── lib/ai-provider.ts               # AI SDK 配置
└── hooks/useAgent.ts                # Agent 监听 Hook
```

---

## 十七、修改注意事项

1. **不要删除 BlockType 中的类型**，除非确认该类型的所有引用已清理（BlockRenderer、blockStore、CommandMenu、AI_ACTIONS、种子数据）
2. **不要修改 AI_ACTIONS 结构**，AIActionMenu 依赖此结构渲染菜单
3. **修改 blockStore 方法签名**时需同步更新所有调用处
4. **TextBlock 的格式化功能**（字体/字号/颜色）依赖 `document.execCommand`，修改时注意兼容性
5. **CommandPalette 的 Agent 操作**依赖 `/api/ai/command` 返回 JSON 数组，不要改变返回格式
6. **导出功能**依赖 `exportToMarkdown()` 和 `exportToHtml()` 两个 Store 方法
7. **导入功能**依赖 `importFromMarkdown()`、`importFromCsv()`、`importImage()` 三个 Store 方法
8. **帮助中心的设置**通过 localStorage 存储自定义 API 配置，Key 前缀为 `blockos-custom-`
9. **所有弹窗面板**使用 `fixed inset-0 z-50` 层级，修改时注意 z-index 冲突