# BlockOS 工作流分析 & AI Copilot 优化 + 协作融合方案

## 状态
Plan 模式 — 待用户确认后执行

## 背景

BlockOS 已完成与 Taoke 项目的核心合并（AI 服务移植到 Next.js + SiliconFlow 适配）。现需针对以下三方面进行体验优化和功能融合：

1. **工作流分析面板** — 当前仅支持输入文档名称和逗号分隔角色，用户希望像原 Taoke 一样支持选择已有文档或导入文档，并提供 10 个预设角色 + 自定义选项。
2. **AI Copilot 引导** — 当前面板仅有「计划/定稿/审阅」三个标签，缺乏功能说明和使用引导，用户不清楚各功能的具体意义。
3. **协作功能融合** — BlockOS 本身具备 Team/Project/Task 协作体系，Taoke 的核心也是围绕工作流协作，需将两者联动。

## Taoke 原项目功能全景

### 已移植到 BlockOS 的功能（5/12）

| # | 功能 | 状态 | BlockOS 对应 |
|---|------|------|-------------|
| 1 | **工作流分析**（岗位流转分析） | 已移植 | `AnalyzePanel` + `/api/ai/analyze` |
| 2 | **AI Copilot**（计划/定稿/审阅） | 已移植 | `CopilotPanel` + `/api/ai/copilot` |
| 3 | **代码实验室**（Code Lab） | 已移植 | `CodeLabPanel` + `/api/ai/code-lab` |
| 4 | **可视化辅助**（Viz Assist） | 已移植 | `VizAssistPanel` + `/api/ai/viz-assist` |
| 5 | **版本总结**（Version Summary） | 已移植 | `VersionSummaryPanel` + `/api/ai/version-summary` |

### 尚未移植的 Taoke 功能（7/12）

| # | 功能 | 说明 | 优先级 |
|---|------|------|--------|
| 6 | **AI 对话聊天**（Chat） | 侧边栏 AI 对话助手，支持 4 种角色预设（产品经理/投资人/工程师/数据分析师），结合选中文本和文档上下文进行专业回复 | **高** |
| 7 | **角色审阅增强**（Review Enrich） | 为工作流中每个角色生成审阅摘要、检查清单和视图提示（priority_topics/foldable_topics/review_keywords） | **高** |
| 8 | **文档折叠规划**（Fold Plan） | 根据当前角色视角，为文档每个段落生成「高亮/保留/折叠」建议，优化阅读体验 | **中** |
| 9 | **文档关联推荐**（Doc Relations） | 分析当前文档与候选文档之间的关联关系（需求参考/实现依赖/数据关联/复盘引用等） | **中** |
| 10 | **预设文档模板**（Preset Docs） | 5 种预设文档模板（产品需求/技术方案/数据复盘/发布清单/运营周报），带推荐工作流 | **中** |
| 11 | **文档导入**（Import） | 从外部源导入文件并整合到系统中 | **低**（前端 FileReader 已覆盖） |
| 12 | **文档导出**（Export） | 导出为多种格式（PDF 等） | **低** |

### Taoke 前端页面结构

- **首页**（`/`）：项目介绍、核心功能展示、流程图示
- **设置页**（`/setup`）：工作流配置、文档上传、分析流程
- **编辑器页**（`/editor`）：完整的文档编辑 + AI 工具面板
  - AI 对话面板（聊天）
  - 副驾工作台（计划/审阅）
  - 角色切换
  - 工具面板：角色审阅、代码实验、图表试验、文档关联
- **图表嵌入页**（`/diagram-embed`）

### Taoke API 端点汇总

| 端点 | 功能 | 移植状态 |
|------|------|----------|
| `GET /api/presets` | 列出预设文档模板 | 未移植 |
| `GET /api/presets/{id}` | 获取预设文档内容 | 未移植 |
| `POST /api/analyze` | 工作流分析 | 已移植 |
| `POST /api/review-enrich` | 角色审阅增强 | 未移植 |
| `POST /api/chat` | AI 对话聊天 | 未移植 |
| `POST /api/copilot` | AI Copilot | 已移植 |
| `POST /api/code-lab` | 代码实验室 | 已移植 |
| `POST /api/viz-assist` | 可视化辅助 | 已移植 |
| `POST /api/doc-relations` | 文档关联推荐 | 未移植 |
| `POST /api/fold-plan` | 文档折叠规划 | 未移植 |
| `POST /api/version-summary` | 版本总结 | 已移植 |

---

## 目标

- 工作流分析：文档来源可选（当前画布 / 已有 Page / 本地导入），角色选择可视化（10 预设 + 自定义）
- AI Copilot：每个模式提供功能说明、使用场景提示、交互引导
- 协作融合：分析结果可直接生成项目任务，任务状态可反向驱动工作流分析

---

## 方案概述

### 一、工作流分析面板重构（AnalyzePanel）

#### 1.1 文档来源选择器

替换当前单一的「文档名称输入框」，提供三种文档来源方式：

| 来源 | 说明 | 实现方式 |
|------|------|----------|
| **当前画布** | 使用当前 BlockOS 画布中的 blocks 内容作为文档 | 直接读取 `blockStore.blocks` |
| **已有页面** | 选择 BlockOS 中已创建的 Page | 读取 `pages` 表，展示页面列表 |
| **导入文档** | 上传本地 .txt / .md / .docx 文件 | 前端 FileReader 读取文本内容 |

UI 设计：
- 顶部使用分段控制器（Segmented Control）切换三种来源
- 「当前画布」：显示当前 blocks 数量和内容预览（前 200 字）
- 「已有页面」：下拉选择框，列出所有 Page 标题，支持搜索过滤
- 「导入文档」：拖拽上传区域 + 文件选择按钮，显示文件名和字数统计

#### 1.2 工作流角色选择器

替换当前「逗号分隔输入框」，提供可视化角色选择：

**10 个预设角色**：
1. 产品经理（Product Manager）— 需求定义、用户调研
2. UI/UX 设计师（Designer）— 界面设计、交互原型
3. 前端开发（Frontend Dev）— 页面实现、组件开发
4. 后端开发（Backend Dev）— API 开发、数据库设计
5. 测试工程师（QA Engineer）— 测试用例、质量保障
6. 运维工程师（DevOps）— 部署、监控、CI/CD
7. 数据分析师（Data Analyst）— 数据分析、报表
8. 项目经理（Project Manager）— 进度管理、资源协调
9. 技术负责人（Tech Lead）— 架构设计、技术决策
10. 安全工程师（Security Engineer）— 安全审计、漏洞修复

**自定义角色**：
- 提供「+ 自定义角色」按钮
- 点击后弹出输入框，输入角色名称
- 自定义角色与预设角色一样可拖拽排序和删除

UI 设计：
- 预设角色以 Tag/Chip 形式展示，点击选中/取消
- 已选角色在下方以可拖拽列表展示，支持调整顺序（因为工作流有先后顺序）
- 每个已选角色可设置「是否关键节点」（checkbox）

#### 1.3 数据流调整

- `AnalyzeRequest` 的 `documentContent` 根据来源不同从三个渠道获取
- `sourceType` 扩展为 `'canvas' | 'page' | 'upload'`
- 新增 `pageId?: string` 字段用于「已有页面」来源

---

### 二、AI Copilot 引导优化（CopilotPanel）

#### 2.1 功能说明卡片

在三个标签页上方增加常驻的功能说明区域（可折叠）：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **计划** | AI 通过多轮对话理解你的需求，逐步生成项目计划 | 项目启动初期，思路不清晰，需要 AI 协助梳理 |
| **定稿** | 基于已有内容和对话历史，生成完整的项目计划文档 | 需求已明确，需要输出标准化的计划文档 |
| **审阅** | AI 对当前文档进行质量检查，发现潜在问题和风险 | 文档完成初稿，需要进行质量把关 |

#### 2.2 交互引导增强

**计划模式**：
- 首次进入时显示引导提示："描述你的项目目标或需求，AI 会逐步追问以完善计划"
- 提供快捷输入示例（Quick Prompts）：
  - "我要开发一个电商小程序"
  - "帮我制定一个数据迁移方案"
  - "设计一个用户增长策略"

**定稿模式**：
- 显示当前对话历史摘要（如果有）
- 引导提示："基于之前的对话，AI 将生成完整的项目计划文档"
- 提供输出格式选项（Markdown / 结构化列表 / 甘特图描述）

**审阅模式**：
- 引导提示："AI 将从完整性、准确性、可行性三个维度审阅文档"
- 审阅结果按严重程度分级展示（高/中/低）
- 每个问题提供「定位到文档」和「一键修复建议」按钮

#### 2.3 空状态优化

- 未选择模式时显示 Copilot 功能总览图（三模式介绍）
- 未输入内容时显示占位提示和快捷操作

---

### 三、协作功能融合方案

#### 3.1 现有协作体系梳理

BlockOS 已有：
- **Team**：团队管理（成员、角色）
- **Project**：项目（归属团队，包含任务、里程碑）
- **Task**：任务（归属项目，有状态、优先级、负责人、起止时间）
- **UserProfile**：用户职能标签（functions 字段）

Taoke 分析产出：
- **岗位流转（RoleFlow）**：角色 → 阶段目标 → 交接点 → 注意事项
- **任务安排（TaskSchedule）**：步骤、负责人、目标、优先级
- **文档摘要（DocumentSummary）**：内容概述

#### 3.2 融合联动设计

**方向一：分析结果 → 协作任务（Analyze → Task）**

工作流分析完成后，增加「生成项目任务」按钮：
- 将 `taskSchedule` 转换为 BlockOS 的 `Task` 创建到指定 Project
- 角色与团队成员职能匹配（`UserProfile.functions`）
- 自动建议任务负责人（根据职能匹配度）
- 任务标题 = `taskSchedule[i].goal`
- 任务优先级 = `taskSchedule[i].priority`
- 任务描述 = 该角色的 `stageGoal` + `watchPoints`

**方向二：协作数据 → 分析输入（Task/Project → Analyze）**

工作流分析面板增加「从项目导入」选项：
- 选择已有 Project，自动提取其 Task 列表作为工作流角色和任务参考
- 将 Project 的 milestones 作为工作流阶段输入

**方向三：任务状态驱动工作流可视化**

在 Project 详情页增加「工作流视图」：
- 将 Project 的 Task 按分析结果中的角色分组
- 每个角色列显示该角色负责的任务及完成状态
- 用连线表示岗位流转关系（handoffToNext）
- 任务全部完成时，该角色节点高亮/打勾

#### 3.3 数据模型扩展

新增表 `workflow_analyses`：
```sql
CREATE TABLE IF NOT EXISTS workflow_analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_summary TEXT,
  workflow_roles TEXT NOT NULL, -- JSON 数组
  role_flow TEXT, -- JSON RoleFlow
  task_schedule TEXT, -- JSON TaskScheduleItem[]
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id)
);
```

新增表 `workflow_tasks`（关联分析和任务）：
```sql
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES workflow_analyses(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL,
  role TEXT NOT NULL,
  goal TEXT NOT NULL
);
```

#### 3.4 API 扩展

- `POST /api/workflow/analyses` — 保存分析结果
- `GET /api/workflow/analyses?projectId=` — 获取项目的历史分析
- `POST /api/workflow/analyses/:id/tasks` — 将分析结果转换为项目任务
- `GET /api/projects/:id/workflow-view` — 获取项目的工作流可视化数据

---

## 实施计划

### Task 1: 工作流分析面板 — 文档来源选择器
**目标**：实现「当前画布 / 已有页面 / 导入文档」三种来源选择
**文件**：
- `src/components/AnalyzePanel.tsx` — 重构文档选择区域
- `src/lib/ai/types.ts` — 扩展 `AnalyzeRequest`（`sourceType`, `pageId`）
- `src/app/api/ai/analyze/route.ts` — 适配新的请求结构
**质量门禁**：
- [ ] 三种来源切换正常
- [ ] 已有页面下拉列表正确显示所有 Page
- [ ] 导入文档支持 .txt / .md，内容正确读取
- [ ] 分析 API 正常返回结果

### Task 2: 工作流分析面板 — 预设角色选择器
**目标**：实现 10 个预设角色 + 自定义角色的可视化选择
**文件**：
- `src/components/AnalyzePanel.tsx` — 角色选择区域
- `src/components/RoleSelector.tsx`（新建）— 可复用的角色选择组件
- `src/lib/ai/analyzer.ts` — 确保角色顺序和自定义角色正常传入 prompt
**质量门禁**：
- [ ] 10 个预设角色正确显示，点击选中/取消
- [ ] 自定义角色可添加、删除
- [ ] 已选角色可拖拽排序
- [ ] 分析结果中的角色顺序与选择一致

### Task 3: AI Copilot 引导优化
**目标**：增加功能说明、使用场景提示、快捷输入
**文件**：
- `src/components/CopilotPanel.tsx` — 重构引导区域
- `src/components/CopilotGuide.tsx`（新建）— 引导说明组件
- `src/components/QuickPrompts.tsx`（新建）— 快捷输入提示组件
**质量门禁**：
- [ ] 三个模式的功能说明正确显示
- [ ] 快捷输入示例可点击填充
- [ ] 空状态显示引导内容
- [ ] 各模式提交后正常返回结果

### Task 4: 协作数据模型扩展
**目标**：创建 workflow_analyses 和 workflow_tasks 表
**文件**：
- `src/lib/db.ts` — 新增表结构 + 索引
- `src/types/collaboration.ts` — 新增类型定义
**质量门禁**：
- [ ] 数据库初始化正常，新表创建成功
- [ ] 类型定义完整，无 TypeScript 错误

### Task 5: 分析结果 → 项目任务 联动
**目标**：工作流分析结果可一键生成到指定 Project
**文件**：
- `src/components/AnalyzePanel.tsx` — 增加「生成任务」按钮和项目选择
- `src/app/api/workflow/analyses/route.ts`（新建）— 保存分析结果
- `src/app/api/workflow/analyses/[id]/tasks/route.ts`（新建）— 生成任务
- `src/store/collaborationStore.ts` — 增加 `createTasksFromAnalysis` 方法
**质量门禁**：
- [ ] 分析结果可保存到数据库
- [ ] 可选择目标 Project
- [ ] 任务正确生成到 Project，字段映射正确
- [ ] 角色与团队成员职能匹配建议正常

### Task 6: 项目工作流可视化视图
**目标**：在 Project 详情页增加工作流视图
**文件**：
- `src/components/collaboration/WorkflowView.tsx`（新建）— 工作流可视化组件
- `src/app/api/projects/[id]/workflow-view/route.ts`（新建）— 工作流视图数据
- 修改 Project 详情页，增加视图切换（列表视图 / 工作流视图）
**质量门禁**：
- [ ] 工作流视图正确显示角色节点和任务
- [ ] 任务完成状态实时更新
- [ ] 岗位流转连线正确显示
- [ ] 视图切换正常

### Task 7: 从项目导入工作流
**目标**：工作流分析面板支持从已有 Project 导入角色和任务
**文件**：
- `src/components/AnalyzePanel.tsx` — 增加「从项目导入」来源选项
- `src/app/api/projects/[id]/workflow-source/route.ts`（新建）— 提取项目数据
**质量门禁**：
- [ ] 可选择已有 Project
- [ ] 正确提取 Project 的 Task 和 Milestone 作为分析输入
- [ ] 分析结果与项目数据关联

### Task 8: AI 对话聊天（Chat）移植
**目标**：将 Taoke 的 AI 对话聊天功能移植到 BlockOS
**文件**：
- `src/lib/ai/chat.ts`（新建）— Chat 服务实现（4 种角色预设：产品经理/投资人/工程师/数据分析师）
- `src/app/api/ai/chat/route.ts`（新建）— Chat API Route
- `src/components/ChatPanel.tsx`（新建）— 聊天面板 UI
- `src/hooks/useTaokeAI.ts` — 增加 `useChat` hook
- `src/lib/ai/types.ts` — 增加 `ChatRequest` / `ChatResponse` 类型
**质量门禁**：
- [ ] 4 种角色预设可切换
- [ ] 选中文本可作为上下文传入
- [ ] 多轮对话正常
- [ ] AI 回复正确显示

### Task 9: 角色审阅增强（Review Enrich）移植
**目标**：将 Taoke 的角色审阅增强功能移植到 BlockOS
**文件**：
- `src/lib/ai/review-enrich.ts`（新建）— Review Enrich 服务实现
- `src/app/api/ai/review-enrich/route.ts`（新建）— Review Enrich API Route
- `src/components/ReviewEnrichPanel.tsx`（新建）— 审阅增强面板
- `src/hooks/useTaokeAI.ts` — 增加 `useReviewEnrich` hook
- `src/lib/ai/types.ts` — 增加 `ReviewEnrichRequest` / `ReviewEnrichResponse` 类型
**质量门禁**：
- [ ] 为每个角色生成审阅摘要和检查清单
- [ ] 视图提示（priority_topics/foldable_topics/review_keywords）正确显示
- [ ] 与工作流分析结果联动

### Task 10: 预设文档模板（Preset Docs）移植
**目标**：将 Taoke 的 5 种预设文档模板移植到 BlockOS
**文件**：
- `src/lib/presets.ts`（新建）— 预设模板注册表（产品需求/技术方案/数据复盘/发布清单/运营周报）
- `src/app/api/presets/route.ts`（新建）— 列出/获取预设模板 API
- `src/components/PresetSelector.tsx`（新建）— 预设模板选择器
- `src/components/AnalyzePanel.tsx` — 增加「使用预设模板」来源选项
**质量门禁**：
- [ ] 5 种预设模板正确列出
- [ ] 模板内容和推荐工作流正确显示
- [ ] 选择模板后可直接进行分析

### Task 11: 文档折叠规划（Fold Plan）移植
**目标**：将 Taoke 的文档折叠规划功能移植到 BlockOS
**文件**：
- `src/lib/ai/fold-plan.ts`（新建）— Fold Plan 服务实现
- `src/app/api/ai/fold-plan/route.ts`（新建）— Fold Plan API Route
- `src/components/FoldPlanPanel.tsx`（新建）— 折叠规划面板
- `src/hooks/useTaokeAI.ts` — 增加 `useFoldPlan` hook
- `src/lib/ai/types.ts` — 增加 `FoldPlanRequest` / `FoldPlanResponse` 类型
**质量门禁**：
- [ ] 根据角色视角生成段落折叠建议
- [ ] 高亮/保留/折叠状态正确显示
- [ ] 不影响原文内容

### Task 12: 文档关联推荐（Doc Relations）移植
**目标**：将 Taoke 的文档关联推荐功能移植到 BlockOS
**文件**：
- `src/lib/ai/doc-relations.ts`（新建）— Doc Relations 服务实现
- `src/app/api/ai/doc-relations/route.ts`（新建）— Doc Relations API Route
- `src/components/DocRelationsPanel.tsx`（新建）— 文档关联面板
- `src/hooks/useTaokeAI.ts` — 增加 `useDocRelations` hook
- `src/lib/ai/types.ts` — 增加 `DocRelationsRequest` / `DocRelationsResponse` 类型
**质量门禁**：
- [ ] 正确分析文档间关联关系
- [ ] 关联类型（需求参考/实现依赖/数据关联/复盘引用）正确显示
- [ ] 置信度分级正确

### Task 13: 集成测试与审查
**目标**：端到端验证所有功能正常联动
**步骤**：
1. 启动应用，验证数据库和页面加载
2. 创建工作流分析（三种文档来源各测一次 + 预设模板）
3. 验证角色选择器（预设 + 自定义）
4. 验证 Copilot 引导功能
5. 验证 AI 对话聊天（4 种角色）
6. 验证角色审阅增强
7. 验证文档折叠规划
8. 验证文档关联推荐
9. 将分析结果生成到项目任务
10. 验证项目工作流可视化视图
11. 验证从项目导入工作流
12. 运行 `npm run lint` 和 `npm run typecheck`

---

## 技术约束

- 继续使用现有技术栈：Next.js 15 + React 19 + TypeScript + Tailwind + Zustand + SQLite
- AI 服务保持 SiliconFlow 适配，不引入新依赖
- 文件上传仅在前端处理（FileReader），不上传到服务器
- 所有新增 API Route 使用 `getUserId` 进行用户隔离

---

## 质量门禁（每个 Task）

每个 Task 完成后必须执行：
1. 功能手动测试通过
2. `npm run lint` 无错误
3. `npm run typecheck` 无错误
4. 浏览器控制台无异常报错

---

## 依赖关系

```
Task 1 ──┐
Task 2 ──┼──> Task 5 ──> Task 6
Task 3 ──┤      ↑
Task 4 ──┘      └──── Task 7

Task 8 (Chat) ──┐
Task 9 (Review) ─┤
Task 10 (Preset) ─┼── 独立并行，可与其他 Task 同步进行
Task 11 (Fold) ──┤
Task 12 (Relations) ─┘

Task 13（最终集成测试）依赖所有前置 Task
```
