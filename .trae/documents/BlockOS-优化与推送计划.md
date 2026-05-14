# BlockOS 优化计划与 GitHub 推送

> 计划日期: 2026-05-14
> 目标仓库: https://github.com/akkomylove/blockOS.git

---

## 一、当前项目状态分析

### 1.1 已完成功能
- **8种Block类型**: text, todo, code, table, media, quote, toggle, divider
- **AI Agent**: 自然语言操作Block（删除/创建/更新/高亮/清空）
- **AI生成**: 流式文本生成、Block专属AI操作、文档格式化
- **导入/导出**: Markdown, HTML, PDF(Playwright), Word
- **搜索**: 标题+内容双匹配
- **关系视图**: 链接关系、层级结构、数据概览
- **组合功能**: 整体拖拽、整体选中、组合命名、右侧导航栏
- **侧边栏**: 文件夹分组、折叠/展开
- **帮助中心**: 使用指南、AI功能、设置（自定义API）
- **状态管理**: Zustand + immer + persist, 50步历史栈
- **服务端**: SQLite + Next.js API路由

### 1.2 发现的问题
1. `.env*.local` 已在 `.gitignore` 中 ✅（API密钥安全）
2. `package.json` 中 `@ai-sdk/openai` 已废弃（之前用 `@ai-sdk/openai-compatible` 替代），但依赖未清理
3. `framer-motion` 已安装但几乎未使用（OnboardingTour 用了但效果简单）
4. `sql.js` 已安装但服务端用 `better-sqlite3`（package.json 中未列出）
5. `@tiptap/*` 系列已安装但 TextBlock 用 `document.execCommand`（未使用 TipTap）
6. 画布底部提示文案 "右键空白处添加 Block · 左键拖拽框选 · Alt+拖拽平移 · 滚轮缩放" 中 "拖拽框选" 和 "Alt+拖拽平移" 实际不存在
7. OnboardingTour 第4步描述包含 "拖拽 Block 标题栏可自由移动" 等不准确描述
8. 新建Block时标题自动为"未命名 Block N"，但用户可能希望先编辑标题再确认
9. AI Action Menu 的图标映射 `iconMap` 使用字符串key匹配，易出错
10. `SortableBlock` 使用 `@dnd-kit/sortable` 但实际排序功能由 `moveBlock` 处理，`@dnd-kit` 可能冗余

### 1.3 可优化方向（用户选择）
- ✅ 新增Block类型（白板/思维导图/公式）
- ✅ AI多模态增强（图片/语音）

---

## 二、本次计划实施内容

### Phase 1: 清理与修复（先修漏洞）

#### 1.1 清理无用依赖
- **文件**: `package.json`
- **操作**: 移除未使用的依赖 `@ai-sdk/openai`、`framer-motion`、`@tiptap/*` 系列、`sql.js`
- **原因**: 减少包体积，避免误导后续开发者

#### 1.2 修复画布底部提示文案
- **文件**: `src/components/BlockEditor.tsx`
- **操作**: 移除 "左键拖拽框选 · Alt+拖拽平移" 等不存在的功能描述
- **改为**: "右键空白处添加 Block · 滚轮缩放"

#### 1.3 修复 OnboardingTour 描述
- **文件**: `src/components/OnboardingTour.tsx`
- **操作**: 第4步 "自由布局与框选" 移除拖拽相关描述
- **改为**: 聚焦到 "点击 Block 标题栏可自由移动位置。使用工具栏按钮进行批量操作。"

#### 1.4 修复 BlockEditor 快速添加按钮
- **文件**: `src/components/BlockEditor.tsx`
- **操作**: 顶部快速添加按钮只显示5种类型，缺少 quote/toggle/divider
- **改为**: 显示全部8种类型，或精简为最常用的5种但确保逻辑正确

---

### Phase 2: 新增 Block 类型

#### 2.1 白板/绘图 Block (whiteboard)
- **文件**: 
  - `src/types/block.ts` — 新增 `'whiteboard'` 到 `BlockType`
  - `src/components/blocks/WhiteboardBlock.tsx` — 新组件
  - `src/components/BlockRenderer.tsx` — 添加渲染分支
  - `src/store/blockStore.ts` — `AI_ACTIONS` 添加 whiteboard 类型
- **功能**: 
  - 基于 Canvas 2D 的简易绘图板
  - 支持画笔（多种颜色、粗细）
  - 支持橡皮擦
  - 支持清空画布
  - 内容以 base64 PNG 保存到 `block.content`
- **UI**: 工具栏在画布上方（颜色选择器、笔刷粗细滑块、橡皮擦、清空按钮）

#### 2.2 思维导图 Block (mindmap)
- **文件**:
  - `src/types/block.ts` — 新增 `'mindmap'` 到 `BlockType`
  - `src/components/blocks/MindmapBlock.tsx` — 新组件
  - `src/components/BlockRenderer.tsx` — 添加渲染分支
  - `src/store/blockStore.ts` — `AI_ACTIONS` 添加 mindmap 类型
- **功能**:
  - 中心节点 + 子节点展开
  - 点击节点可编辑文本
  - 点击 "+" 添加子节点
  - 节点可折叠/展开
  - 数据以 JSON 保存到 `block.content`
- **UI**: 水平树状布局，节点为圆角卡片，连线为贝塞尔曲线

#### 2.3 公式 Block (math)
- **文件**:
  - `src/types/block.ts` — 新增 `'math'` 到 `BlockType`
  - `src/components/blocks/MathBlock.tsx` — 新组件
  - `src/components/BlockRenderer.tsx` — 添加渲染分支
  - `src/store/blockStore.ts` — `AI_ACTIONS` 添加 math 类型
- **功能**:
  - 使用 KaTeX 渲染 LaTeX 数学公式
  - 编辑模式输入 LaTeX 源码
  - 预览模式渲染公式
  - 预置常用公式模板（求和、积分、矩阵等）
- **依赖**: 新增 `katex` 包

---

### Phase 3: AI 多模态增强

#### 3.1 AI 图片理解（Vision）
- **文件**:
  - `src/app/api/ai/vision/route.ts` — 新API路由
  - `src/components/blocks/MediaBlock.tsx` — 添加 "AI分析图片" 按钮
  - `src/components/AIActionMenu.tsx` — media 类型添加 "图片理解" 操作
- **功能**:
  - 用户上传图片后，AI 可以描述图片内容、提取文字（OCR）、分析图表数据
  - 使用 SiliconFlow 的多模态模型（如 `Qwen/Qwen2-VL-72B-Instruct`）
  - 返回文本结果，可保存为新的 text Block
- **实现**:
  - 前端将图片转为 base64
  - API 使用 `streamText` + `messages` 格式（包含 image URL）

#### 3.2 AI 语音输入（Speech-to-Text）
- **文件**:
  - `src/components/CommandPalette.tsx` — 添加麦克风按钮
  - `src/hooks/useSpeechRecognition.ts` — 新 Hook（封装 Web Speech API）
- **功能**:
  - 点击麦克风按钮，使用浏览器原生 `SpeechRecognition` API 将语音转为文字
  - 支持中文语音识别
  - 识别结果自动填入 CommandPalette 输入框
- **注意**: 使用浏览器原生 API，无需额外依赖，但仅在支持的浏览器中可用

---

### Phase 4: GitHub 推送

#### 4.1 前置检查
- [x] `.env*.local` 在 `.gitignore` 中
- [ ] 确认 `node_modules` 不在仓库中
- [ ] 确认没有大文件（>100MB）
- [ ] 确认没有敏感信息泄露

#### 4.2 推送步骤
1. `git init`（如未初始化）
2. `git remote add origin https://github.com/akkomylove/blockOS.git`
3. `git add .`
4. `git commit -m "Initial commit: BlockOS v2.0"`
5. `git branch -M main`
6. `git push -u origin main`

#### 4.3 如推送失败
- 检查 `gh auth status`
- 使用 `gh repo set-default akkomylove/blockOS`
- 或使用 HTTPS token 认证

---

## 三、实施顺序

| 顺序 | 任务 | 优先级 |
|------|------|--------|
| 1 | 清理无用依赖 | 高 |
| 2 | 修复文案漏洞 | 高 |
| 3 | 新增 Whiteboard Block | 中 |
| 4 | 新增 Mindmap Block | 中 |
| 5 | 新增 Math Block | 中 |
| 6 | AI Vision API | 中 |
| 7 | Speech-to-Text | 低 |
| 8 | GitHub 推送 | 高 |
| 9 | 构建验证 | 高 |

---

## 四、验证标准

1. `npm run build` 0 错误 0 警告
2. `npm run dev` 启动无 Edge Runtime 错误
3. 新增 Block 类型能在画布中正常创建、编辑、保存
4. AI Vision 能正确分析图片并返回结果
5. GitHub 仓库成功推送，文件结构正确
6. `.env.local` 未被推送

---

## 五、决策记录

- **不使用 framer-motion**: 现有动画需求简单，CSS transition 足够
- **不使用 @tiptap**: TextBlock 已用 `document.execCommand` 实现，切换成本高
- **KaTeX 而非 MathJax**: KaTeX 更快、更轻量，适合客户端渲染
- **Web Speech API 而非 Whisper API**: 免费、无需额外 API 调用、响应更快
- **SiliconFlow Vision 模型**: 用户已有 SiliconFlow 账号，使用 `Qwen/Qwen2-VL-72B-Instruct`
- **不清理 @dnd-kit**: 虽然 SortableBlock 的拖拽排序功能实际由 store 处理，但保留以备后续扩展
