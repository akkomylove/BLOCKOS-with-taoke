# BlockOS 功能总览

> 本文档记录了 BlockOS 当前的所有功能，用于后续开发参考。修改代码时请勿破坏或移除已有功能。
> 最后更新：2026-05-14

---

## 一、技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router + Turbopack) |
| 前端 | React 19 + TypeScript + Tailwind CSS |
| 状态管理 | Zustand + immer |
| 拖拽 | @dnd-kit/core + sortable |
| AI SDK | @ai-sdk/openai-compatible |
| 认证 | next-auth v5 |
| PDF 导出 | Playwright |
| 公式渲染 | KaTeX |
| 图标 | lucide-react |

---

## 二、Block 类型（11种）

### 2.1 文本块 (text)
- **编辑**：contenteditable 富文本编辑
- **格式化工具栏**（悬浮显示）：
  - 加粗 / 斜体 / 下划线 / 删除线
  - 无序列表 / 有序列表
  - 字体大小：12-48px（下拉选择）
  - 字体：默认、宋体、黑体、楷体、微软雅黑、Arial、Georgia、Monaco
  - 颜色：10 色网格选择器
- **元数据**：fontSize, fontFamily, fontColor, fontWeight, fontStyle, textDecoration
- **AI 动作**：总结、改写（正式）、改写（随意）、扩展

### 2.2 待办块 (todo)
- 复选框勾选/取消
- 内容编辑
- 删除键自动删除空项
- **AI 动作**：拆解子任务、总结

### 2.3 代码块 (code)
- 多语言选择（TypeScript/JavaScript/Python 等）
- 代码高亮
- `@ref` 语法引用其他 Block 内容
- **AI 动作**：解释代码、优化建议

### 2.4 表格块 (table)
- 添加/删除行列
- **列类型设置**：text / number / date / select / checkbox / link
- select 类型支持 options 配置
- 单元格编辑
- **AI 动作**：数据洞察、总结

### 2.5 媒体块 (media)
- 支持类型：图片、视频、音频、外部链接
- URL 输入 + 本地上传
- 类型自动检测
- 卡片式 UI，带渐变遮罩和类型标签
- **AI 动作**：生成描述

### 2.6 引用块 (quote)
- 内容编辑
- 引用样式
- **AI 动作**：总结

### 2.7 折叠块 (toggle)
- 标题编辑
- 展开/折叠状态切换
- **AI 动作**：总结

### 2.8 分隔线 (divider)
- 纯展示，无编辑功能

### 2.9 白板块 (whiteboard)
- 自由绘图、涂鸦
- 画笔/橡皮擦模式
- 颜色选择、画笔大小调整
- 下载画布为图片
- **AI 动作**：生成描述

### 2.10 思维导图 (mindmap)
- 创建节点、添加子节点
- 折叠/展开节点
- 删除节点
- 编辑节点名称
- **AI 动作**：扩展节点、总结

### 2.11 数学公式 (math)
- LaTeX 输入
- KaTeX 实时渲染
- 常用公式模板快速插入
- **AI 动作**：解释公式

---

## 三、核心 UI 组件

### 3.1 工具栏 (Toolbar)
- 撤销 / 重做
- AI 助手按钮
- 关系视图按钮
- Agent 模式开关 + 日志
- 搜索按钮
- 导入 / 导出按钮
- 帮助按钮
- **选中 Block 时显示**：删除、复制按钮

### 3.2 命令面板 / AI 助手 (CommandPalette)
- 自然语言指令输入
- **Agent 级别操作**（JSON 解析执行）：
  - `deleteAllBlocks` — 删除所有 Block
  - `deleteBlock` — 删除指定 Block
  - `updateBlock` — 更新 Block 内容
  - `createBlock` — 创建新 Block（可带内容）
  - `highlightBlocks` — 高亮指定 Block
  - `clearAllContent` — 清空所有 Block 内容
- 执行结果以绿色卡片展示
- 流式响应显示
- 历史记录

### 3.3 AI 结果卡片 (AIResultCard)
- 替换当前 Block 内容
- 保存到指定现有 Block
- 创建为新 Block

### 3.4 导入面板 (ImportPanel)
- **Tab 切换**：Markdown / CSV / 图片
- **文件上传**（支持拖拽）：
  - .md 文件 → readAsText
  - .csv 文件 → readAsText
  - 图片文件 → readAsDataURL
- **粘贴输入**（文本框）
- 上传状态反馈（加载中 / 成功）

### 3.5 导出面板 (ExportPanel)
- Markdown 导出
- HTML 导出
- PDF 导出（调用 /api/export/pdf，Playwright 渲染）
- Word 导出

### 3.6 搜索面板 (SearchPanel)
- 搜索 Block **标题 + 内容**
- 实时高亮匹配项
- 点击跳转定位

### 3.7 关系抽屉 (RelationDrawer)
- **链接关系**：显示 Block 间的 links 关联
- **层级结构**：显示 parentId 嵌套层级
- **数据概览**：统计各类型 Block 数量

### 3.8 帮助面板 (HelpPanel)
- **4 个 Tab**：
  1. 使用指南 — Block 类型网格（带彩色图标）
  2. 快捷键 — kbd 样式快捷键列表
  3. AI 功能 — Agent 说明 + 操作示例
  4. 设置 — 自定义 API Key / Base URL / Model
- 设置保存到 localStorage

### 3.9 侧边栏 (Sidebar)
- 页面列表
- 文件夹管理（创建/删除/重命名/折叠）
- 页面拖入文件夹
- 新建页面

### 3.10 Block 渲染器 (BlockRenderer)
- 根据 block.type 分发到对应组件
- 统一包裹 SortableBlock（拖拽排序）

### 3.11 可排序 Block (SortableBlock)
- dnd-kit 拖拽排序
- 选中状态高亮
- 右键菜单（AI 操作、删除、复制）

---

## 四、Store 方法（Zustand）

### 4.1 页面管理
- `addPage(title?, folderId?)` — 创建页面
- `deletePage(id)` — 删除页面
- `updatePageTitle(id, title)` — 更新页面标题
- `setCurrentPage(id)` — 切换当前页面
- `saveCurrentPageBlocks()` / `loadPageBlocks(pageId)` — 页面 Block 存取

### 4.2 文件夹管理
- `addFolder(name)` — 创建文件夹
- `deleteFolder(id)` — 删除文件夹
- `renameFolder(id, name)` — 重命名
- `toggleFolderCollapse(id)` — 折叠/展开
- `movePageToFolder(pageId, folderId)` — 移动页面到文件夹

### 4.3 Block CRUD
- `addBlock(type, afterId?, position?)` — 创建 Block（自动定位）
- `duplicateBlock(id)` — 复制 Block
- `updateBlock(id, updates)` — 更新 Block
- `deleteBlock(id)` — 删除 Block
- `moveBlock(activeId, overId)` — 拖拽排序
- `moveBlockTo(id, x, y)` — 自由画布定位
- `resizeBlock(id, width)` — 调整宽度

### 4.4 选择管理
- `setSelection(ids)` — 设置选中
- `toggleSelection(id)` — 切换选中
- `clearSelection()` — 清空选中

### 4.5 层级管理
- `indentBlock(id)` — 缩进（最大深度 5）
- `outdentBlock(id)` — 取消缩进
- `getBlockDepth(id)` — 获取深度

### 4.6 组合管理
- `groupBlocks(ids)` — 组合多个 Block
- `ungroupBlocks(groupId)` — 取消组合
- `updateGroupName(groupId, name)` — 重命名组合

### 4.7 链接
- `createLink(fromId, toId)` — 创建 Block 间链接

### 4.8 历史记录
- `saveHistory()` — 保存历史（最多 50 条）
- `undo()` / `redo()` — 撤销/重做
- `canUndo()` / `canRedo()` — 状态检查

### 4.9 导入导出
- `exportToMarkdown()` — 导出 Markdown
- `exportToHtml()` — 导出 HTML
- `importFromMarkdown(markdown)` — 导入 Markdown
- `importFromCsv(csv)` — 导入 CSV（自动解析引号/逗号）
- `importImage(base64, caption?)` — 导入图片

### 4.10 服务器同步
- `syncToServer()` — 同步当前页面 Block 到服务器
- `loadFromServer(pageId)` — 从服务器加载
- `syncPages()` — 同步页面列表

### 4.11 Agent
- `toggleAgent()` — 开关 Agent
- `addAgentLog(log)` — 添加 Agent 日志

---

## 五、API 路由

### 5.1 AI 路由

| 路由 | 功能 |
|------|------|
| `POST /api/ai/generate` | 通用 AI 生成，流式响应 |
| `POST /api/ai/command` | Agent 命令解析，返回 JSON 操作数组 |
| `POST /api/ai/block-action` | Block 专属 AI 动作（总结/改写/扩展等） |
| `POST /api/ai/summary` | 多 Block 综合总结 |
| `POST /api/ai/format-document` | 文本转格式化 HTML |

### 5.2 页面路由

| 路由 | 功能 |
|------|------|
| `GET /api/pages` | 获取页面列表 |
| `POST /api/pages` | 创建页面 |
| `GET /api/pages/[id]` | 获取页面详情 |
| `PUT /api/pages/[id]` | 更新页面 |
| `DELETE /api/pages/[id]` | 删除页面 |
| `GET /api/pages/[id]/blocks` | 获取页面 Block |
| `POST /api/pages/[id]/blocks` | 批量更新 Block |

### 5.3 导出路由

| 路由 | 功能 |
|------|------|
| `POST /api/export/pdf` | HTML → PDF（Playwright） |

### 5.4 认证路由

| 路由 | 功能 |
|------|------|
| `GET/POST /api/auth/[...nextauth]` | NextAuth 认证 |

---

## 六、AI 配置

### 6.1 模型配置 (src/lib/ai-provider.ts)
- **默认模型**：`Qwen/Qwen3-8B`
- **备用模型**：`THUDM/glm-4-9b-chat`
- **API 提供商**：SiliconFlow (`https://api.siliconflow.cn/v1`)
- **SDK**：`@ai-sdk/openai-compatible`（非 `@ai-sdk/openai`，因 SiliconFlow 不支持 `/v1/responses`）

### 6.2 自定义 API 设置
- 用户可在 HelpPanel → 设置 Tab 中填写：
  - API Key
  - Base URL
  - Model 名称
- 保存到 localStorage，优先于环境变量

### 6.3 Agent 系统提示词
- 接收完整 Block 列表作为上下文
- 强制 JSON-only 输出（无 Markdown、无确认提问）
- 支持 6 种操作类型，每种有精确 JSON 格式

---

## 七、快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` / `Ctrl+Y` | 重做 |
| `Ctrl+Shift+P` | 打开 AI 助手 |
| `Ctrl+F` | 搜索 |
| `Ctrl+Shift+E` | 导出 |
| `Ctrl+Shift+I` | 导入 |
| `Ctrl+Shift+H` | 帮助 |
| `Delete` | 删除选中 Block |
| `Ctrl+D` | 复制选中 Block |
| `Tab` | 缩进 Block |
| `Shift+Tab` | 取消缩进 |
| `Ctrl+Shift+G` | 组合选中 Block |
| `Ctrl+Shift+U` | 取消组合 |
| `Ctrl+Shift+L` | 创建链接 |
| `Ctrl+Shift+A` | 切换 Agent |

---

## 八、数据结构

### 8.1 Block 核心字段
```typescript
interface Block {
  id: string;
  type: BlockType;        // 11 种类型
  title: string;
  content: string;
  meta: BlockMeta;        // 样式、状态、链接等
  parentId: string | null; // 层级嵌套
  groupId?: string;       // 组合
  order: number;          // 排序
  x: number;              // 画布 X 坐标
  y: number;              // 画布 Y 坐标
  width: number;          // 宽度（最小 200）
  collapsed: boolean;     // 折叠状态
  createdAt: number;
  updatedAt: number;
}
```

### 8.2 BlockMeta 字段
```typescript
interface BlockMeta {
  aiContext?: string;     // AI 上下文提示
  tags?: string[];        // 标签
  links?: string[];       // 链接到的 Block ID
  highlight?: string;     // 高亮颜色
  checked?: boolean;      // todo 勾选状态
  language?: string;      // code 语言
  expanded?: boolean;     // toggle 展开状态
  caption?: string;       // media 描述
  fontSize?: number;      // 文本字体大小
  fontFamily?: string;    // 文本字体
  fontColor?: string;     // 文本颜色
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
}
```

### 8.3 表格数据结构
```typescript
interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'link';
  options?: string[];     // select 类型的选项
}

interface TableData {
  columns: string[];
  columnTypes?: TableColumn[];
  rows: string[][];
}
```

---

## 九、AI 动作配置

每种 Block 类型对应一组专属 AI 动作：

| Block 类型 | AI 动作 |
|-----------|---------|
| text | 总结、改写（正式）、改写（随意）、扩展 |
| todo | 拆解子任务、总结 |
| code | 解释代码、优化建议 |
| table | 数据洞察、总结 |
| media | 生成描述 |
| quote | 总结 |
| toggle | 总结 |
| whiteboard | 生成描述 |
| mindmap | 扩展节点、总结 |
| math | 解释公式 |

---

## 十、导出格式支持

| 格式 | 说明 |
|------|------|
| Markdown | 所有 Block 类型映射为 MD 语法 |
| HTML | 完整 HTML 文档，含样式 |
| PDF | Playwright 渲染 HTML 后生成 |
| Word | .doc 格式（前端 blob 生成） |

---

## 十一、导入格式支持

| 格式 | 方式 | 说明 |
|------|------|------|
| Markdown | 文件上传 / 粘贴 | 解析标题、列表、代码块、引用、分隔线、待办 |
| CSV | 文件上传 / 粘贴 | 自动处理引号和逗号，生成 table Block |
| 图片 | 文件上传 | readAsDataURL，生成 media Block |

---

## 十二、Agent 自动化规则

默认内置规则：
- **任务完成日志**：当 todo Block 从 unchecked → checked 时，自动创建 text Block 记录完成时间，并调用 AI 生成鼓励语

---

## 十三、已移除的功能（勿恢复）

- ~~ListBlock~~（列表类型 Block）— 用户认为价值不大，已删除
- ~~ImageBlock~~ — 已合并为 MediaBlock
- ~~AIGeneratePanel~~ — 已合并到 CommandPalette

---

## 十四、注意事项

1. **所有新 Block 类型必须包含 x, y, width 字段**
2. **共享状态必须使用 Zustand store，禁止用 useState**
3. **代码中不要添加注释**（项目规则）
4. **AI 模型使用 `@ai-sdk/openai-compatible`**，不能用 `@ai-sdk/openai`
5. **SiliconFlow 不支持 `/v1/responses`**，必须使用 `/v1/chat/completions`
6. **MediaBlock 使用 `<img>` 标签**，顶部有 `eslint-disable` 注释
7. **构建验证**：每次修改后必须运行 `npm run build`，确保 0 errors 0 warnings

---

## 十五、文件结构速查

```
src/
  app/
    api/
      ai/
        generate/route.ts
        command/route.ts
        block-action/route.ts
        summary/route.ts
        format-document/route.ts
      export/pdf/route.ts
      pages/route.ts
      pages/[id]/route.ts
      pages/[id]/blocks/route.ts
      auth/[...nextauth]/route.ts
    page.tsx                    # 入口，动态导入 BlockOSApp
  components/
    blocks/
      TextBlock.tsx
      TodoBlock.tsx
      CodeBlock.tsx
      TableBlock.tsx
      MediaBlock.tsx
      QuoteBlock.tsx
      ToggleBlock.tsx
      DividerBlock.tsx
      WhiteboardBlock.tsx
      MindmapBlock.tsx
      MathBlock.tsx
    BlockOSApp.tsx
    BlockEditor.tsx
    BlockRenderer.tsx
    SortableBlock.tsx
    Toolbar.tsx
    CommandPalette.tsx
    CommandMenu.tsx
    AIActionMenu.tsx
    AIResultCard.tsx
    ImportPanel.tsx
    ExportPanel.tsx
    HelpPanel.tsx
    SearchPanel.tsx
    RelationDrawer.tsx
    Sidebar.tsx
  store/
    blockStore.ts
  types/
    block.ts
    page.ts
  lib/
    ai-provider.ts
```
