# BlockOS UI & 功能优化计划

## 摘要

本计划针对用户提出的所有 UI 和功能问题进行系统性修复和优化，包括：修复构建错误、合并 AI 助手入口、改进 AI 结果保存位置选择、删除冗余 ListBlock、更新 Help 内容、清理异常快捷键等。

## 当前状态分析

### 已完成的修改（来自前序会话）
1. Toolbar.tsx - 移除 Copy ID 按钮，添加 `flex-shrink-0` 防止挤压
2. CommandPalette.tsx - 已合并命令/生成两个模式为统一 AI 助手面板
3. AIResultCard.tsx - 已添加"替换原内容"和"创建新 Block"两个按钮
4. TableBlock.tsx - 已支持列类型（text/number/date/select/checkbox/link）
5. TextBlock.tsx - 已添加格式工具栏（粗体/斜体/下划线/删除线/列表）
6. MediaBlock.tsx - 已创建，支持图片/视频/音频
7. CodeBlock.tsx - 已添加 `// @ref` 引用功能（但存在重复函数声明的构建错误）
8. HelpPanel.tsx - 已更新为 4 个选项卡（guide/shortcuts/ai/settings）
9. SearchPanel.tsx - 已支持标题搜索

### 现有构建错误
- **CodeBlock.tsx:102-122**: `parseRefs` 和 `tryParseJSON` 被重复声明（第 39-51 行已有 useCallback 版本）

### 待清理的冗余代码
- BlockRenderer.tsx 仍引用 `ListBlock` 和 `ImageBlock`
- types/block.ts 的 `BlockType` 仍包含 `'list'` 和 `'image'`
- blockStore.ts 的 `createEmptyBlock` 仍有 list 相关逻辑
- AI_ACTIONS 中仍有 `list` 和 `image` 的配置
- 存在未使用的 AIGeneratePanel.tsx 文件

---

## 修改计划

### 任务 1: 修复构建错误（CodeBlock.tsx）
**文件**: `src/components/blocks/CodeBlock.tsx`
**问题**: 第 102-122 行存在重复的 `parseRefs` 和 `tryParseJSON` 函数声明
**修改**: 删除第 102-122 行的重复代码块

### 任务 2: 删除 ListBlock 类型
**文件清单**:
- `src/types/block.ts` - 从 `BlockType` 中移除 `'list'`，从 `BlockMeta` 中移除 `listType`
- `src/components/BlockRenderer.tsx` - 移除 `ListBlock` import 和 case
- `src/store/blockStore.ts` - 从 `createEmptyBlock` 中移除 list 相关逻辑
- `src/types/block.ts` - 从 `AI_ACTIONS` 中移除 `list` 配置
- 删除文件 `src/components/blocks/ListBlock.tsx`

### 任务 3: ImageBlock → MediaBlock 迁移
**文件清单**:
- `src/types/block.ts` - 将 `BlockType` 中的 `'image'` 改为 `'media'`
- `src/components/BlockRenderer.tsx` - 将 `ImageBlock` import 改为 `MediaBlock`，case 改为 `'media'`
- `src/types/block.ts` - 更新 `AI_ACTIONS` 中 `image` → `media`
- `src/store/blockStore.ts` - 更新 `importImage` 方法或相关逻辑中的类型引用
- 删除文件 `src/components/blocks/ImageBlock.tsx`

### 任务 4: 合并 AI 助手为单一入口
**文件**: `src/components/CommandPalette.tsx`
**修改**: 移除顶部的"执行命令"/"生成内容"选项卡切换，统一为单一输入框。根据输入内容自动路由：如果输入包含操作意图关键词（如"删除"、"创建"、"高亮"、"标红"），调用 `/api/ai/command`，否则调用 `/api/ai/generate`。

### 任务 5: AI 结果保存位置增加"保存到指定 Block"
**文件**: `src/components/AIResultCard.tsx`
**修改**: 在"替换原内容"和"创建新 Block"之间，增加第三个选项：下拉选择现有 Block。用户可以从当前页面的所有 Block 中选择一个目标，将 AI 结果保存到该 Block 中。

### 任务 6: 清理异常快捷键
**文件**: `src/components/CommandPalette.tsx`
**修改**: 移除 `Windows+Enter` 等奇怪快捷键，仅保留 `Ctrl+K`（打开/关闭）、`Esc`（关闭）、`Enter`（提交）。

### 任务 7: 更新 HelpPanel 内容
**文件**: `src/components/HelpPanel.tsx`
**修改**: 
- 使用指南：更新 Block 类型列表（移除 list，添加 media）
- 快捷键：仅保留基础快捷键（Ctrl+K、Ctrl+Z、Ctrl+Shift+Z、Ctrl+F、Esc）
- AI 功能：更新描述，反映合并后的 AI 助手

### 任务 8: 构建验证
**命令**: `npm run build`
**预期**: 0 错误，0 警告

---

## 假设与决策

1. **ListBlock 删除**: TextBlock 的列表功能已完全覆盖 ListBlock 的需求，直接删除不会造成功能损失
2. **MediaBlock 替换**: MediaBlock 完全向后兼容 ImageBlock 的图片功能，同时新增视频/音频支持
3. **AI 助手合并**: 通过关键词检测自动路由，简化用户操作，不需要手动切换模式
4. **API 设置**: HelpPanel 的设置选项卡已存在，无需修改
5. **搜索**: SearchPanel 已支持标题搜索，无需修改

## 验证步骤

1. 运行 `npm run build`，确认无编译错误
2. 启动开发服务器，验证页面正常加载
3. 测试创建 TextBlock 并输入内容，确认无异常
4. 测试创建 MediaBlock，确认图片/视频/音频正常显示
5. 测试 TableBlock 列类型设置
6. 测试 AI 助手面板，确认合并后功能正常
7. 测试 AI 结果保存到指定 Block
8. 测试 HelpPanel 各选项卡内容正确
