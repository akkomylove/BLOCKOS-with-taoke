# BlockOS 文本编辑器与导出优化计划

## 摘要

本次计划实现三大核心需求：
1. **文本 Block 升级为 Tiptap 富文本编辑器** — 支持完整排版格式（标题、列表、加粗/斜体、对齐、链接等）
2. **修复右键菜单与折叠交互** — 右键添加 block 失效、折叠后缺少展开入口
3. **AI 自动格式化文档** — 通过工具栏按钮将选中文本 block 转为标准格式（Word/PDF）

## 当前状态分析

### 已有基础
- 白板画布：自由拖拽、缩放、平移、框选
- Block 系统：9 种类型（text/todo/list/code/table/image/quote/toggle/divider），含 title/x/y/width/collapsed 字段
- 父子嵌套：drag-to-nest、collapse/expand、visibleBlocks 过滤
- 连接线与 PDF 导出 API（Playwright）
- AI Action 系统：Sparkles 按钮 + AIActionMenu + /api/ai/block-action
- 导入面板：Markdown、CSV、Image

### 已知问题
1. **右键菜单添加 block 失效** — `addBlockAtPosition` 计算坐标时可能因 canvasRef 未就绪或坐标转换错误导致 block 添加位置异常
2. **折叠后无展开入口** — 折叠按钮仅在 `children.length > 0` 时显示，但折叠后子元素被隐藏，按钮也随之消失
3. **文本编辑器功能薄弱** — 当前使用原生 contentEditable + document.execCommand，不支持标题层级、代码块内嵌、链接等

## 方案决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 富文本库 | Tiptap + StarterKit | 成熟稳定，React 友好，扩展生态丰富 |
| PDF 导出 | 保留服务端 Playwright | 用户明确要求，质量高 |
| 右键菜单 | 精简：添加 block + 设为子 block | 用户选择 |
| AI 格式化触发 | 工具栏全局按钮 | 用户选择，先选文本 block 再点击格式化 |

## 具体变更

### 1. 安装 Tiptap 依赖

**文件**: `package.json`（通过 npm install）

安装包：
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-text-align`

### 2. 重写 TextBlock 为 Tiptap 编辑器

**文件**: `src/components/blocks/TextBlock.tsx`

替换原生 contentEditable 为 Tiptap Editor：
- 使用 `useEditor` hook 创建编辑器实例
- 配置 StarterKit（标题 h1-h3、加粗、斜体、列表、代码等）
- 添加 Link、TextAlign、Placeholder 扩展
- 顶部悬浮工具栏：标题下拉、加粗、斜体、下划线、删除线、链接、对齐、列表
- 内容同步：通过 `onUpdate` 将 JSON/HTML 同步到 block.content
- 保留空内容 Backspace 删除 block 行为

**数据格式变更**: block.content 从纯文本/HTML 字符串改为存储 Tiptap JSON（更结构化），导出时转换为 HTML。

### 3. 修复右键菜单添加 Block

**文件**: `src/components/BlockEditor.tsx`

问题分析：`addBlockAtPosition` 使用 `canvasRef.current.getBoundingClientRect()` 计算坐标，但右键菜单通过 Portal 渲染在 body 上，点击菜单项时事件坐标是屏幕坐标，需要正确转换为画布坐标。

修复方案：
- 在 `addBlockAtPosition` 中增加 canvasRef 空值检查
- 确保右键菜单点击时正确传递 `contextMenu.x/y`（屏幕坐标）
- 坐标转换公式验证：`(screenX - canvasRect.left - pan.x) / zoom`

同时精简右键菜单：
- 保留：添加 block 列表（text/todo/list/code/table/image）
- 保留：设为子 block（当有选中项且目标不同时）
- 移除：其他冗余选项

### 4. 修复折叠后无展开入口

**文件**: `src/components/BlockEditor.tsx`

问题分析：当前折叠按钮条件为 `children.length > 0`，但 `children` 是通过 `sortedBlocks.filter((b) => b.parentId === block.id)` 计算的。折叠后子元素仍存在于 sortedBlocks 中，所以按钮应该仍然显示。需确认实际行为。

修复方案：
- 将折叠按钮的显示条件改为基于 `childCountMap[block.id] > 0`
- 确保折叠按钮始终可见（只要 block 有子元素）
- 折叠状态下在 block 标题栏显示 "已折叠 N 个子项" 提示

### 5. 添加 AI 自动格式化功能

**文件**: 
- `src/components/Toolbar.tsx` — 添加 "AI 格式化" 按钮
- `src/app/api/ai/format-document/route.ts` — 新建 API 路由
- `src/store/blockStore.ts` — 添加 `formatBlockWithAI` 方法
- `src/types/block.ts` — 在 AI_ACTIONS 中添加 `format-document` 动作

功能流程：
1. 用户选中一个文本 block
2. 点击工具栏 "AI 格式化" 按钮
3. 前端发送请求到 `/api/ai/format-document`，携带 block.content
4. AI 将内容转为标准文档格式（HTML 结构：标题、段落、列表等）
5. 返回格式化后的 HTML/JSON，更新 block.content

Prompt 设计：
```
你是一个专业文档排版助手。请将以下原始文本转为标准格式的文档内容。
要求：
1. 识别并设置标题层级（h1/h2/h3）
2. 将相关段落组织为列表
3. 添加适当的加粗、斜体强调
4. 保持原文核心信息不变
5. 输出为 HTML 格式

原始内容：
{content}
```

### 6. BlockRenderer 适配 Tiptap 内容

**文件**: `src/components/BlockRenderer.tsx`

无需大幅修改，因为 TextBlock 内部处理渲染。但需确保其他 block 类型不受影响。

### 7. 导出适配

**文件**: `src/store/blockStore.ts` — `exportToMarkdown` / `exportToHtml`

- `exportToHtml`: 文本 block 的 content 若为 Tiptap JSON，需先通过 Tiptap 渲染为 HTML
- `exportToMarkdown`: 文本 block 的 content 需从 HTML/JSON 转为 Markdown
- 由于 Tiptap JSON 无法直接在 store 中渲染，考虑在 store 中仍存储 HTML 字符串（Tiptap 的 `editor.getHTML()`），保持向后兼容

**决策**: store 中 block.content 继续存储 HTML 字符串（Tiptap `getHTML()` 输出），这样 export 功能无需修改。Tiptap 编辑器初始化时使用 `setContent(block.content)`。

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | 修改 | 添加 tiptap 依赖 |
| `src/components/blocks/TextBlock.tsx` | 重写 | 替换为 Tiptap 编辑器 |
| `src/components/BlockEditor.tsx` | 修改 | 修复右键菜单、折叠按钮 |
| `src/components/Toolbar.tsx` | 修改 | 添加 AI 格式化按钮 |
| `src/app/api/ai/format-document/route.ts` | 新建 | AI 格式化 API |
| `src/types/block.ts` | 修改 | 添加 format-document AI 动作 |
| `src/store/blockStore.ts` | 修改 | 添加 formatBlockWithAI 方法 |

## 验证步骤

1. `npm install` 安装 Tiptap 依赖
2. `npm run build` 检查编译错误
3. 启动 dev server，验证：
   - 文本 block 可输入、可排版（标题/列表/加粗等）
   - 右键空白处可添加 block 到正确位置
   - 父子 block 折叠/展开正常
   - AI 格式化按钮可用（需配置 OPENAI_API_KEY）
   - PDF 导出正常
4. 检查类型安全：无新增 `any` 类型
5. 检查无未使用变量/导入

## 假设与约束

- 用户已配置 `OPENAI_API_KEY` 环境变量（AI 格式化功能依赖）
- 部署环境支持 Playwright（PDF 导出依赖）
- Tiptap 的 HTML 输出与现有 exportToHtml 兼容
- 不修改其他 block 类型（todo/list/code 等保持 contentEditable）
