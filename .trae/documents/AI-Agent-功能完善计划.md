# AI / Agent 功能完善计划

## 目标
1. 测试 SiliconFlow API 密钥可用性
2. 修复并完善所有 AI 相关功能（CommandPalette、AI Action Menu、格式化、Agent）
3. 新增 AI 生成内容功能
4. 确保原有基础功能不受影响

## 当前状态分析

### 已有 AI 功能
| 功能 | 文件 | 状态 | 问题 |
|------|------|------|------|
| AI Action Menu | `AIActionMenu.tsx` + `AIResultCard.tsx` | 可用 | 流式响应正常 |
| 文档格式化 | `Toolbar.tsx` + `format-document/route.ts` | 可用 | 需测试 SiliconFlow 兼容性 |
| Block 智能处理 | `block-action/route.ts` | 可用 | 需测试 |
| 综合总结 | `summary/route.ts` | 可用 | 需测试 |
| CommandPalette | `CommandPalette.tsx` + `command/route.ts` | **有 bug** | 解析 JSON 失败（截图中的 SyntaxError） |
| Agent 系统 | `useAgent.ts` + `AgentLogPanel.tsx` | **不完整** | 只有 todo 完成规则，callAI 动作未真正调用 AI |
| AI 生成内容 | 无 | **缺失** | 用户需要此功能 |

### 技术架构
- AI Provider: `src/lib/ai-provider.ts` — 使用 `@ai-sdk/openai` 的 `createOpenAI` 对接 SiliconFlow
- 模型: `THUDM/GLM-4.1V-9B-Thinking` (主) / `Qwen/Qwen3-VL-8B-Instruct` (备用)
- 所有 AI 路由使用 `streamText` 返回流式响应
- 前端通过 `response.body.getReader()` 读取流

### 已知问题
1. **CommandPalette JSON 解析失败**: `command/route.ts` 返回流式文本，但 `CommandPalette.tsx` 第 101 行尝试 `response.json()`，流式响应不是 JSON 格式
2. **Agent callAI 未实现**: `useAgent.ts` 第 86-111 行虽然写了 `callAI` 动作，但只是调用 `block-action` API，没有真正利用 AI 返回的内容来执行操作
3. **缺少 AI 生成内容功能**: 用户无法通过自然语言提示词让 AI 直接创建内容

---

## 计划变更

### 任务 1: curl 测试 SiliconFlow API 密钥
**目的**: 确认密钥可用，排除网络/认证问题

```bash
curl -s https://api.siliconflow.cn/v1/chat/completions \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "THUDM/GLM-4.1V-9B-Thinking",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

同时测试备用模型 `Qwen/Qwen3-VL-8B-Instruct`。

### 任务 2: 修复 CommandPalette 流式解析
**文件**: `src/components/CommandPalette.tsx`
**问题**: 流式响应不能用 `response.json()` 解析
**修改**:
- 将 `const data = await response.json()` 改为流式读取（参考 `AIResultCard.tsx` 的实现）
- 累积文本内容，尝试从中提取 JSON
- 如果提取 JSON 失败，显示 AI 返回的文本内容（非 JSON 回退）
- 添加流式显示效果（显示 "思考中..." 和光标）

### 任务 3: 扩展 Agent 规则系统（手动触发）
**文件**: `src/store/blockStore.ts` + `src/hooks/useAgent.ts`
**修改**:
- 保留现有 `todo-complete` 规则
- 修复 `callAI` 动作：真正调用 AI API 并将结果用于执行操作
- 新增规则：
  - `text-summarize`: 文本 block 内容超过 200 字时，手动触发总结
  - `code-explain`: 代码 block 手动触发解释
  - `table-insight`: 表格 block 手动触发数据洞察
- 规则通过 AI Action Menu 手动触发（不是自动触发）
- 确保 Agent 日志正确记录

### 任务 4: 新增 AI 生成内容功能
**新文件**: `src/components/AIGeneratePanel.tsx`
**修改文件**: `src/components/Toolbar.tsx` + `src/components/BlockEditor.tsx`
**功能**:
- **入口 1**: Toolbar 上增加 "AI 生成" 按钮（Wand2 图标）
- **入口 2**: 右键菜单增加 "AI 生成内容" 选项
- **交互**: 点击后弹出对话框，输入提示词
- **处理**: 调用新的 API 路由 `/api/ai/generate`
- **结果**: 显示预览卡片（复用 `AIResultCard` 样式），用户确认后创建新 block
- **新 API 路由**: `src/app/api/ai/generate/route.ts` — 接收 prompt，调用 AI 生成内容，返回流式响应

### 任务 5: 测试所有 AI 功能
**测试清单**:
- [ ] API 密钥 curl 测试通过
- [ ] CommandPalette 自然语言命令正常执行
- [ ] AI Action Menu（Sparkles 按钮）各类型 block 动作正常
- [ ] 文档格式化（Toolbar AI 格式化按钮）正常
- [ ] Agent 日志面板正常显示
- [ ] AI 生成内容功能正常
- [ ] 构建无错误
- [ ] 原有基础功能（创建/删除/拖拽/缩放 block、页面切换等）不受影响

---

## 文件变更清单

### 修改文件
1. `src/components/CommandPalette.tsx` — 修复流式解析
2. `src/store/blockStore.ts` — 扩展 Agent 规则
3. `src/hooks/useAgent.ts` — 修复 callAI 动作实现
4. `src/components/Toolbar.tsx` — 添加 AI 生成按钮
5. `src/components/BlockEditor.tsx` — 右键菜单添加 AI 生成选项

### 新建文件
6. `src/components/AIGeneratePanel.tsx` — AI 生成内容对话框
7. `src/app/api/ai/generate/route.ts` — AI 生成 API 路由

### 无需修改（仅测试）
8. `src/lib/ai-provider.ts` — 配置已正确
9. `src/app/api/ai/block-action/route.ts` — 代码正确
10. `src/app/api/ai/summary/route.ts` — 代码正确
11. `src/app/api/ai/format-document/route.ts` — 代码正确
12. `src/app/api/ai/command/route.ts` — 代码正确

---

## 验收标准
1. curl 测试返回 200 和正常 AI 回复
2. CommandPalette 输入命令后，流式显示 AI 思考过程，最终正确执行操作
3. AI Action Menu 所有动作（总结/改写/扩展/解释/优化/洞察）正常工作
4. Agent 面板显示操作日志，callAI 动作真正调用 AI
5. AI 生成内容功能：输入提示词 → 显示预览 → 确认后创建 block
6. `npm run build` 0 错误 0 警告
7. 原有功能（block 操作、页面管理、导入导出等）全部正常
