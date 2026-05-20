# BlockOS + Taoke 合并方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Taoke 的 AI 能力（岗位流转分析、Copilot、代码实验室、可视化辅助、版本总结）完整移植到 BlockOS 的 Next.js 技术栈中，统一为单一应用。

**Architecture:** 后端将 Taoke 的 Python FastAPI 服务重写为 Next.js API Routes（TypeScript），使用相同的 DashScope API；前端新增 CopilotPanel 和 AnalyzePanel 两个核心面板，通过 React Hooks 调用新 API。

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, DashScope API

---

## 文件结构映射

| 原 Taoke 文件 | 新 BlockOS 文件 | 职责 |
|-------------|---------------|------|
| `fdoc_app/models.py` | `src/lib/ai/types.ts` | TypeScript 类型定义 |
| `fdoc_app/services/qwen.py` | `src/lib/ai/client.ts` | DashScope HTTP 客户端 + 工具函数 |
| `fdoc_app/services/qwen.py` | `src/lib/ai/analyzer.ts` | 岗位流转分析逻辑 |
| `fdoc_app/services/qwen_copilot.py` | `src/lib/ai/copilot.ts` | Copilot 交互逻辑 |
| `fdoc_app/services/qwen_code.py` | `src/lib/ai/code-lab.ts` | 代码实验室逻辑 |
| `fdoc_app/services/qwen_viz.py` | `src/lib/ai/viz-assist.ts` | 可视化辅助逻辑 |
| `fdoc_app/services/qwen_version.py` | `src/lib/ai/version-summary.ts` | 版本总结逻辑 |
| `fdoc_app/main.py` (路由) | `src/app/api/ai/*/route.ts` | API Routes |
| 无 | `src/hooks/useTaokeAI.ts` | 前端 React Hooks |
| 无 | `src/components/AnalyzePanel.tsx` | 工作流分析面板 |
| 无 | `src/components/CopilotPanel.tsx` | Copilot 面板 |

---

## 质量门禁（每 Task 必须执行）

每个 Task 完成后，必须按以下顺序执行测试和审查：

### 1. TypeScript 编译检查
```bash
cd d:/比赛文件/blockOS
npx tsc --noEmit
```
**通过标准：** 零错误、零警告

### 2. Next.js 构建检查
```bash
cd d:/比赛文件/blockOS
npx next build
```
**通过标准：** 构建成功，无编译错误

### 3. 代码审查清单
- [ ] 类型安全：无 `any` 滥用，接口定义完整
- [ ] 错误处理：所有 async 函数有 try-catch，API 返回统一错误格式
- [ ] 性能：无内存泄漏，无无限循环
- [ ] 安全：无敏感信息硬编码，API Key 从环境变量读取
- [ ] 风格：遵循现有代码风格，命名一致

### 4. 功能验证（如可测试）
- [ ] API 路由返回预期 JSON 结构
- [ ] 前端组件渲染正常，无控制台报错
- [ ] 用户交互流程完整

**如任一项未通过，必须修复后才能进入下一 Task。**

---

## Task 1: 创建 AI 类型定义

**Files:**
- Create: `src/lib/ai/types.ts`

- [ ] **Step 1: 编写 Analyze 相关类型**

```typescript
export interface AnalyzeRequest {
  documentName: string;
  documentContent: string;
  workflow: string[];
  sourceType: 'upload' | 'preset';
}

export interface RoleFlowStage {
  role: string;
  stageGoal: string;
  handoffToNext: string;
  stageInput?: string;
  watchPoints: string[];
  stageOutput?: string;
}

export interface RoleFlow {
  title: string;
  stages: RoleFlowStage[];
}

export interface BaseRoleAnalysis {
  role: string;
  task: string;
  focusPoints: string[];
  briefSummary: string;
}

export interface TaskScheduleItem {
  step: number;
  owner: string;
  goal: string;
  inputFrom: string[];
  output: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalyzeResponse {
  documentSummary: string;
  roleFlow: RoleFlow;
  roles: BaseRoleAnalysis[];
  taskSchedule: TaskScheduleItem[];
}
```

- [ ] **Step 2: 编写 Copilot 相关类型**

```typescript
export interface CopilotRequest {
  action: 'plan_next' | 'plan_finalize' | 'critique_generate';
  documentName: string;
  documentContent: string;
  documentSummary?: string;
  workflow: string[];
  currentRole?: string;
  userMessage?: string;
  qaHistory?: { question: string; answer: string }[];
  copilotDocumentContent?: string;
}

export interface CopilotIssueItem {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
  targetHeading?: string;
  matchKeywords: string[];
}

export interface CopilotPlanNextResponse {
  action: 'plan_next';
  understandingSummary: string;
  nextQuestion?: string;
  readyToFinalize: boolean;
  draftMarkdown: string;
}

export interface CopilotPlanFinalizeResponse {
  action: 'plan_finalize';
  summary: string;
  finalMarkdown: string;
}

export interface CopilotCritiqueResponse {
  action: 'critique_generate';
  overview: string;
  issues: CopilotIssueItem[];
  reviewMarkdown: string;
}

export type CopilotResponse = CopilotPlanNextResponse | CopilotPlanFinalizeResponse | CopilotCritiqueResponse;
```

- [ ] **Step 3: 编写 CodeLab / VizAssist / VersionSummary 类型**

```typescript
export interface CodeLabRequest {
  documentName: string;
  documentSummary?: string;
  workflow: string[];
  currentRole: string;
  language: 'html' | 'js' | 'python' | 'c' | 'java';
  code: string;
  selectionText?: string;
}

export interface CodeLabResponse {
  language: string;
  currentRole: string;
  runtimeMode: 'browser' | 'pseudo';
  explanation: string;
  completionSuggestions: string[];
  runNotes: string[];
  pseudoResult: string;
  browserPreviewHint?: string;
}

export interface VizAssistRequest {
  documentName: string;
  documentSummary?: string;
  workflow: string[];
  currentRole: string;
  dataSourceName?: string;
  dataSourceContent?: string;
  sourceType?: 'upload' | 'preset';
}

export interface VizAssistResponse {
  chartTitle: string;
  summary: string;
  preferredChartType: 'table' | 'bar' | 'line' | 'pie';
  tableHeaders: string[];
  tableRows: string[][];
  fieldNotes: string[];
  chartSuggestions: string[];
  sourceNote?: string;
  placeholderNotice?: string;
  dataStatus: 'linked' | 'preset';
}

export interface VersionSummaryRequest {
  documentName: string;
  workflow: string[];
  previousContent: string;
  currentContent: string;
  versionNumber: number;
}

export interface VersionSummaryResponse {
  versionNumber: number;
  changeSummary: string;
  selfConclusion: string;
  decisionTrace: string[];
  keyChanges: string[];
  affectedRoles: string[];
}
```

- [ ] **Step 4: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 2: 创建 DashScope HTTP 客户端

**Files:**
- Create: `src/lib/ai/client.ts`

- [ ] **Step 1: 实现 AIServiceError 和配置读取**

```typescript
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

function getSettings() {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY,
    model: process.env.QWEN_MODEL || 'qwen-plus',
    endpoint: process.env.DASHSCOPE_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    timeoutSeconds: Math.max(5, parseInt(process.env.DASHSCOPE_TIMEOUT_SECONDS || '45', 10)),
  };
}

export function ensureConfigured(): void {
  const settings = getSettings();
  if (!settings.apiKey) {
    throw new AIServiceError('后端未配置 DASHSCOPE_API_KEY', 'missing_api_key', 503);
  }
}
```

- [ ] **Step 2: 实现 postJsonCompletion**

```typescript
export async function postJsonCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number = 0.1
): Promise<string> {
  const settings = getSettings();
  ensureConfigured();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), settings.timeoutSeconds * 1000);

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        response_format: { type: 'json_object' },
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const detail = await response.text();
      throw new AIServiceError('AI 分析请求失败', 'dashscope_http_error', 502, { status: response.status, response: detail });
    }

    const data = await response.json();
    return extractMessageContent(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AIServiceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIServiceError('AI 接口响应超时', 'dashscope_timeout', 504, { timeoutSeconds: settings.timeoutSeconds });
    }
    throw new AIServiceError('无法连接到 AI 接口', 'dashscope_connection_error', 502, { reason: error instanceof Error ? error.message : String(error) });
  }
}
```

- [ ] **Step 3: 实现 JSON 解析和修复工具函数**

```typescript
function extractMessageContent(response: unknown): string {
  const data = response as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>>;
  const message = choices[0].message as Record<string, unknown>;
  let content = message.content;

  if (Array.isArray(content)) {
    const textParts = content
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .filter((item) => item.type === 'text')
      .map((item) => String(item.text || ''));
    content = textParts.join('');
  }

  if (typeof content !== 'string' || !content.trim()) {
    throw new AIServiceError('AI 响应内容为空', 'dashscope_empty_content', 502);
  }
  return content;
}

export function parseJsonContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(extractJsonText(content));
  }
}

export function extractJsonText(text: string): string {
  let candidate = text.trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, '');
  candidate = candidate.replace(/\s*```$/, '');
  if (candidate.startsWith('{') && candidate.endsWith('}')) return candidate;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return candidate.slice(start, end + 1);
  throw new Error('No JSON object found');
}

export async function repairJson(brokenContent: string, workflow: string[], schemaHint: string): Promise<Record<string, unknown>> {
  const repaired = await postJsonCompletion([
    { role: 'system', content: `你是 JSON 修复助手。只输出合法 JSON。工作流顺序：${JSON.stringify(workflow)}。结构：${schemaHint}` },
    { role: 'user', content: `修复为合法 JSON：\n${brokenContent}` },
  ], 0);
  return parseJsonContent(repaired);
}
```

- [ ] **Step 4: 实现安全工具函数**

```typescript
export function safeText(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    const cleaned = value.map(String).map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join('；') : fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

export function safeList(value: unknown, fallback: string[] = []): string[] {
  if (value === null || value === undefined) return [...fallback];
  if (Array.isArray(value)) {
    const cleaned = value.map(String).map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...fallback];
  }
  const text = String(value).trim();
  return text ? [text] : [...fallback];
}

export function safeInt(value: unknown, fallback: number): number {
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export function safePriority(value: unknown): 'high' | 'medium' | 'low' {
  const text = safeText(value, 'medium').toLowerCase();
  return text === 'high' || text === 'low' ? text : 'medium';
}

export function mapItemsByRole(value: unknown): Map<string, Record<string, unknown>> {
  const mapped = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(value)) return mapped;
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const role = safeText((item as Record<string, unknown>).role);
    if (role) mapped.set(role.trim().toLowerCase(), item as Record<string, unknown>);
  }
  return mapped;
}

export function getDictValue(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}
```

- [ ] **Step 5: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 3: 实现岗位流转分析服务

**Files:**
- Create: `src/lib/ai/analyzer.ts`

- [ ] **Step 1: 实现 analyzeDocument 主函数**

```typescript
import { postJsonCompletion, parseJsonContent, repairJson, safeText, safeList, safeInt, safePriority, mapItemsByRole, getDictValue, AIServiceError } from './client';
import type { AnalyzeRequest, AnalyzeResponse } from './types';

export async function analyzeDocument(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const workflow = payload.workflow;
  const rawContent = await postJsonCompletion([
    { role: 'system', content: buildSystemPrompt(workflow) },
    { role: 'user', content: buildUserPrompt(payload) },
  ], 0.1);

  try {
    const parsed = normalizeAnalysisPayload(parseJsonContent(rawContent), workflow);
    return validateResponse(parsed, workflow);
  } catch (error) {
    try {
      const repaired = normalizeAnalysisPayload(await repairJson(rawContent, workflow, analysisSchemaHint()), workflow);
      return validateResponse(repaired, workflow);
    } catch (repairError) {
      throw new AIServiceError('AI 数据结构无法自动修复', 'invalid_analysis_payload', 502, { error: String(repairError) });
    }
  }
}
```

- [ ] **Step 2: 实现 normalizeAnalysisPayload**

```typescript
function normalizeAnalysisPayload(payload: Record<string, unknown>, workflow: string[]): Record<string, unknown> {
  const roleFlow = (payload.role_flow as Record<string, unknown>) || {};
  const rawStages = roleFlow.stages;
  const stagesByRole = mapItemsByRole(rawStages);
  const rawStageList = Array.isArray(rawStages) ? rawStages : [];

  const normalizedStages = [];
  for (let index = 0; index < workflow.length; index++) {
    const role = workflow[index];
    const nextRole = workflow[index + 1] || '';
    const fallbackHandoff = nextRole ? `向${nextRole}交接本环节的关键结论和交付物` : '汇总结论并结束当前流转';
    let rawStage = stagesByRole.get(role.toLowerCase());
    if (!rawStage && index < rawStageList.length && typeof rawStageList[index] === 'object') {
      rawStage = rawStageList[index] as Record<string, unknown>;
    }
    normalizedStages.push({
      role,
      stageGoal: safeText(getDictValue(rawStage, 'stage_goal'), `完成 ${role} 环节的核心目标`),
      stageInput: safeText(getDictValue(rawStage, 'stage_input')),
      watchPoints: safeList(getDictValue(rawStage, 'watch_points')),
      stageOutput: safeText(getDictValue(rawStage, 'stage_output')),
      handoffToNext: safeText(getDictValue(rawStage, 'handoff_to_next'), fallbackHandoff),
    });
  }

  const rawRoles = payload.roles;
  const rolesByRole = mapItemsByRole(rawRoles);
  const rawRoleList = Array.isArray(rawRoles) ? rawRoles : [];
  const normalizedRoles = [];
  for (let index = 0; index < workflow.length; index++) {
    const role = workflow[index];
    let rawRole = rolesByRole.get(role.toLowerCase());
    if (!rawRole && index < rawRoleList.length && typeof rawRoleList[index] === 'object') {
      rawRole = rawRoleList[index] as Record<string, unknown>;
    }
    normalizedRoles.push({
      role,
      task: safeText(getDictValue(rawRole, 'task'), `围绕文档完成 ${role} 环节的核心任务`),
      focusPoints: safeList(getDictValue(rawRole, 'focus_points'), [`${role} 需要重点关注的交付与风险`]),
      briefSummary: safeText(getDictValue(rawRole, 'brief_summary'), `${role} 负责推进并交付本环节的关键结果`),
    });
  }

  const rawSchedule = payload.task_schedule;
  const rawScheduleList = Array.isArray(rawSchedule) ? rawSchedule : [];
  const normalizedSchedule = [];
  const taskCount = Math.max(workflow.length, rawScheduleList.length);
  for (let index = 0; index < taskCount; index++) {
    const rawItem = index < rawScheduleList.length && typeof rawScheduleList[index] === 'object' ? rawScheduleList[index] as Record<string, unknown> : {};
    const ownerCandidate = safeText(rawItem.owner);
    const owner = workflow.includes(ownerCandidate) ? ownerCandidate : workflow[Math.min(index, workflow.length - 1)];
    let inputFrom = safeList(rawItem.input_from);
    if (inputFrom.length === 0 && index > 0) inputFrom = [workflow[Math.min(index - 1, workflow.length - 1)]];
    normalizedSchedule.push({
      step: safeInt(rawItem.step, index + 1),
      owner,
      goal: safeText(rawItem.goal, `推进 ${owner} 环节的工作目标`),
      inputFrom,
      output: safeText(rawItem.output, `${owner} 的阶段性交付物`),
      priority: safePriority(rawItem.priority),
    });
  }

  return {
    documentSummary: safeText(payload.document_summary, '文档分析已完成。'),
    roleFlow: { title: safeText(roleFlow.title, '岗位流转图'), stages: normalizedStages },
    roles: normalizedRoles,
    taskSchedule: normalizedSchedule,
  };
}
```

- [ ] **Step 3: 实现 validateResponse 和 Prompt 构建**

```typescript
function validateResponse(payload: Record<string, unknown>, workflow: string[]): AnalyzeResponse {
  const roleFlow = payload.roleFlow as { stages: Array<{ role: string }> };
  const roles = payload.roles as Array<{ role: string }>;
  const taskSchedule = payload.taskSchedule as Array<{ owner: string }>;

  if (roleFlow.stages.length !== workflow.length) throw new AIServiceError('岗位流转图节点数量不一致', 'invalid_role_flow_length', 502);
  if (roles.length !== workflow.length) throw new AIServiceError('岗位说明数量不一致', 'invalid_roles_length', 502);

  const stageRoles = roleFlow.stages.map((s) => s.role.trim());
  const responseRoles = roles.map((r) => r.role.trim());
  if (stageRoles.join(',') !== workflow.join(',') || responseRoles.join(',') !== workflow.join(',')) {
    throw new AIServiceError('岗位顺序不一致', 'workflow_mismatch', 502);
  }

  return payload as unknown as AnalyzeResponse;
}

function analysisSchemaHint(): string {
  return '{document_summary, role_flow:{title, stages:[{role, stage_goal, stage_input, watch_points, stage_output, handoff_to_next}]}, roles:[{role, task, focus_points, brief_summary}], task_schedule:[{step, owner, goal, input_from, output, priority}]}';
}

function buildSystemPrompt(workflow: string[]): string {
  return `你是 FDoc 的岗位流转分析助手。只输出合法 JSON，不要 markdown，不要解释。role_flow.stages 和 roles 的 role 必须严格按这个顺序输出：${JSON.stringify(workflow)}。task_schedule.owner 只能从这些岗位中选择。`;
}

function buildUserPrompt(payload: AnalyzeRequest): string {
  return `返回固定 JSON，字段只有：document_summary、role_flow、roles、task_schedule。\n要求：\n1. document_summary 1到2句话。\n2. role_flow.title 固定为 岗位流转图。\n3. role_flow.stages 按工作流顺序输出。\n4. watch_points 给 2 到 4 条。\n5. task_schedule 覆盖全流程。\n\n工作流：${JSON.stringify(payload.workflow)}\n文档名称：${payload.documentName}\n文档来源：${payload.sourceType}\n文档正文：\n${payload.documentContent}`;
}
```

- [ ] **Step 4: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 4: 实现 Copilot 服务

**Files:**
- Create: `src/lib/ai/copilot.ts`

- [ ] **Step 1: 实现 runCopilot 主函数**

```typescript
import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { CopilotRequest, CopilotResponse } from './types';

export async function runCopilot(payload: CopilotRequest): Promise<CopilotResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: buildSystemPrompt(payload.action) },
    { role: 'user', content: buildUserPrompt(payload) },
  ], 0.3);

  try {
    const parsed = parseJsonContent(rawContent);
    return normalizeCopilotResponse(parsed, payload.action);
  } catch (error) {
    throw new AIServiceError('Copilot 响应解析失败', 'copilot_parse_error', 502, { error: String(error) });
  }
}
```

- [ ] **Step 2: 实现响应归一化和 Prompt 构建**

```typescript
function normalizeCopilotResponse(payload: Record<string, unknown>, action: string): CopilotResponse {
  switch (action) {
    case 'plan_next':
      return {
        action: 'plan_next',
        understandingSummary: safeText(payload.understanding_summary, '已理解当前文档内容。'),
        nextQuestion: safeText(payload.next_question),
        readyToFinalize: payload.ready_to_finalize === true,
        draftMarkdown: safeText(payload.draft_markdown, ''),
      };
    case 'plan_finalize':
      return {
        action: 'plan_finalize',
        summary: safeText(payload.summary, '计划已生成。'),
        finalMarkdown: safeText(payload.final_markdown, ''),
      };
    case 'critique_generate':
      return {
        action: 'critique_generate',
        overview: safeText(payload.overview, '审阅已完成。'),
        issues: normalizeIssues(payload.issues),
        reviewMarkdown: safeText(payload.review_markdown, ''),
      };
    default:
      throw new AIServiceError(`未知的 Copilot action: ${action}`, 'invalid_copilot_action', 400);
  }
}

function normalizeIssues(value: unknown): Array<{ id: string; title: string; severity: 'high' | 'medium' | 'low'; reason: string; suggestion: string; targetHeading?: string; matchKeywords: string[] }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index) => ({
      id: safeText(item.id, `issue-${index + 1}`),
      title: safeText(item.title, '未命名问题'),
      severity: safeSeverity(item.severity),
      reason: safeText(item.reason, '需要进一步审查。'),
      suggestion: safeText(item.suggestion, '建议优化相关内容。'),
      targetHeading: safeText(item.target_heading) || undefined,
      matchKeywords: safeList(item.match_keywords),
    }));
}

function safeSeverity(value: unknown): 'high' | 'medium' | 'low' {
  const text = safeText(value, 'medium').toLowerCase();
  return text === 'high' || text === 'low' ? text : 'medium';
}

function buildSystemPrompt(action: string): string {
  const base = '你是 BlockOS AI Copilot。只输出合法 JSON，不要 markdown，不要解释。';
  switch (action) {
    case 'plan_next': return base + ' 返回 understanding_summary、next_question、ready_to_finalize、draft_markdown。';
    case 'plan_finalize': return base + ' 返回 summary、final_markdown。';
    case 'critique_generate': return base + ' 返回 overview、issues、review_markdown。';
    default: return base;
  }
}

function buildUserPrompt(payload: CopilotRequest): string {
  const parts = [`Action: ${payload.action}`, `Document: ${payload.documentName}`, `Workflow: ${JSON.stringify(payload.workflow)}`, `Content:\n${payload.documentContent}`];
  if (payload.userMessage) parts.push(`User Message: ${payload.userMessage}`);
  if (payload.qaHistory?.length) parts.push('QA History:\n' + payload.qaHistory.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n---\n'));
  return parts.join('\n\n');
}
```

- [ ] **Step 3: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 5: 实现 Code Lab 服务

**Files:**
- Create: `src/lib/ai/code-lab.ts`

- [ ] **Step 1: 完整实现**

```typescript
import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { CodeLabRequest, CodeLabResponse } from './types';

export async function runCodeLab(payload: CodeLabRequest): Promise<CodeLabResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: `你是 BlockOS 代码实验室助手。当前角色：${payload.currentRole}。语言：${payload.language}。只输出合法 JSON。返回 explanation、completion_suggestions、run_notes、pseudo_result、runtime_mode、browser_preview_hint。` },
    { role: 'user', content: `Document: ${payload.documentName}\nWorkflow: ${JSON.stringify(payload.workflow)}\nCurrent Role: ${payload.currentRole}\nLanguage: ${payload.language}\nCode:\n\`\`\`${payload.language}\n${payload.code}\n\`\`\`${payload.selectionText ? `\nSelected Code:\n\`\`\`${payload.language}\n${payload.selectionText}\n\`\`\`` : ''}` },
  ], 0.1);

  try {
    const parsed = parseJsonContent(rawContent);
    return {
      language: payload.language,
      currentRole: payload.currentRole,
      runtimeMode: parsed.runtime_mode === 'browser' ? 'browser' : 'pseudo',
      explanation: safeText(parsed.explanation, '代码已接收，暂无详细解释。'),
      completionSuggestions: safeList(parsed.completion_suggestions),
      runNotes: safeList(parsed.run_notes),
      pseudoResult: safeText(parsed.pseudo_result, '伪执行结果暂无。'),
      browserPreviewHint: safeText(parsed.browser_preview_hint) || undefined,
    };
  } catch (error) {
    throw new AIServiceError('代码实验室响应解析失败', 'code_lab_parse_error', 502, { error: String(error) });
  }
}
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 6: 实现 Viz Assist 服务

**Files:**
- Create: `src/lib/ai/viz-assist.ts`

- [ ] **Step 1: 完整实现**

```typescript
import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { VizAssistRequest, VizAssistResponse } from './types';

export async function runVizAssist(payload: VizAssistRequest): Promise<VizAssistResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: '你是 BlockOS 可视化助手。只输出合法 JSON。返回 chart_title、summary、preferred_chart_type、table_headers、table_rows、field_notes、chart_suggestions、source_note、placeholder_notice。' },
    { role: 'user', content: `Document: ${payload.documentName}\nWorkflow: ${JSON.stringify(payload.workflow)}\nCurrent Role: ${payload.currentRole}\n${payload.dataSourceContent ? `Data Content:\n${payload.dataSourceContent}` : ''}` },
  ], 0.1);

  try {
    const parsed = parseJsonContent(rawContent);
    const chartType = parsed.preferred_chart_type;
    return {
      chartTitle: safeText(parsed.chart_title, '数据图表'),
      summary: safeText(parsed.summary, '数据已分析。'),
      preferredChartType: chartType === 'table' || chartType === 'bar' || chartType === 'line' || chartType === 'pie' ? chartType : 'table',
      tableHeaders: safeList(parsed.table_headers),
      tableRows: normalizeTableRows(parsed.table_rows),
      fieldNotes: safeList(parsed.field_notes),
      chartSuggestions: safeList(parsed.chart_suggestions),
      sourceNote: safeText(parsed.source_note) || undefined,
      placeholderNotice: safeText(parsed.placeholder_notice) || undefined,
      dataStatus: payload.sourceType === 'upload' ? 'linked' : 'preset',
    };
  } catch (error) {
    throw new AIServiceError('可视化助手响应解析失败', 'viz_assist_parse_error', 502, { error: String(error) });
  }
}

function normalizeTableRows(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => row.map((cell) => String(cell).trim()).filter((cell) => cell.length > 0))
    .filter((row) => row.length > 0);
}
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 7: 实现 Version Summary 服务

**Files:**
- Create: `src/lib/ai/version-summary.ts`

- [ ] **Step 1: 完整实现**

```typescript
import { postJsonCompletion, parseJsonContent, repairJson, safeText, safeList, safeInt, AIServiceError } from './client';
import type { VersionSummaryRequest, VersionSummaryResponse } from './types';

export async function summarizeVersion(payload: VersionSummaryRequest): Promise<VersionSummaryResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: `你是 BlockOS 版本总结助手。只输出合法 JSON。affected_roles 只能从这些岗位中选择：${JSON.stringify(payload.workflow)}。` },
    { role: 'user', content: `返回固定 JSON：version_number、change_summary、self_conclusion、decision_trace、key_changes、affected_roles。\n\n文档名称：${payload.documentName}\n版本号：V${payload.versionNumber}\n变更前：\n${payload.previousContent}\n\n变更后：\n${payload.currentContent}` },
  ], 0.1);

  try {
    const parsed = normalizeVersionPayload(parseJsonContent(rawContent), payload);
    return parsed as VersionSummaryResponse;
  } catch (error) {
    try {
      const repaired = normalizeVersionPayload(await repairJson(rawContent, payload.workflow, '{version_number, change_summary, self_conclusion, decision_trace:[...], key_changes:[...], affected_roles:[...]}'), payload);
      return repaired as VersionSummaryResponse;
    } catch (repairError) {
      throw new AIServiceError('版本总结数据无法自动修复', 'invalid_version_summary_payload', 502, { error: String(repairError) });
    }
  }
}

function normalizeVersionPayload(payload: Record<string, unknown>, request: VersionSummaryRequest): Record<string, unknown> {
  return {
    versionNumber: safeInt(payload.version_number, request.versionNumber),
    changeSummary: safeText(payload.change_summary, `V${request.versionNumber} 已记录本次文档修改。`),
    selfConclusion: safeText(payload.self_conclusion, '本次修改已更新当前文档结论。'),
    decisionTrace: safeList(payload.decision_trace, ['记录本次修改的背景和依据']),
    keyChanges: safeList(payload.key_changes, ['文档正文已发生调整']),
    affectedRoles: safeRoles(payload.affected_roles, request.workflow),
  };
}

function safeRoles(value: unknown, workflow: string[]): string[] {
  if (value === null || value === undefined) return workflow.slice(0, Math.min(2, workflow.length));
  const items = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];
  const lookup = new Map(workflow.map((r) => [r.trim().toLowerCase(), r]));
  for (const item of items) {
    const key = String(item).trim().toLowerCase();
    const matched = lookup.get(key);
    if (matched && !normalized.includes(matched)) normalized.push(matched);
  }
  return normalized.length > 0 ? normalized : workflow.slice(0, Math.min(2, workflow.length));
}
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 8: 创建 AI 模块统一导出

**Files:**
- Create: `src/lib/ai/index.ts`

- [ ] **Step 1: 编写导出文件**

```typescript
export * from './types';
export * from './client';
export * from './analyzer';
export * from './copilot';
export * from './code-lab';
export * from './viz-assist';
export * from './version-summary';
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 9: 创建 API Routes

**Files:**
- Create: `src/app/api/ai/analyze/route.ts`
- Create: `src/app/api/ai/copilot/route.ts`
- Create: `src/app/api/ai/code-lab/route.ts`
- Create: `src/app/api/ai/viz-assist/route.ts`
- Create: `src/app/api/ai/version-summary/route.ts`

- [ ] **Step 1: 创建 /api/ai/analyze**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/ai';
import type { AnalyzeRequest } from '@/lib/ai';
import { getUserId } from '@/lib/db';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as AnalyzeRequest;
    if (!body.documentName || !body.documentContent || !body.workflow?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await analyzeDocument(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Analyze API Error:', error);
    const message = error instanceof Error ? error.message : 'AI 分析失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
```

- [ ] **Step 2: 创建 /api/ai/copilot**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runCopilot } from '@/lib/ai';
import type { CopilotRequest } from '@/lib/ai';
import { getUserId } from '@/lib/db';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as CopilotRequest;
    if (!body.action || !body.documentName || !body.documentContent || !body.workflow?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const validActions = ['plan_next', 'plan_finalize', 'critique_generate'];
    if (!validActions.includes(body.action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }
    const result = await runCopilot(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Copilot API Error:', error);
    const message = error instanceof Error ? error.message : 'Copilot 处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
```

- [ ] **Step 3: 创建 /api/ai/code-lab**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runCodeLab } from '@/lib/ai';
import type { CodeLabRequest } from '@/lib/ai';
import { getUserId } from '@/lib/db';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as CodeLabRequest;
    if (!body.documentName || !body.code || !body.workflow?.length || !body.currentRole || !body.language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const validLanguages = ['html', 'js', 'python', 'c', 'java'];
    if (!validLanguages.includes(body.language)) {
      return NextResponse.json({ error: `Invalid language` }, { status: 400 });
    }
    const result = await runCodeLab(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Code Lab API Error:', error);
    const message = error instanceof Error ? error.message : '代码实验室处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
```

- [ ] **Step 4: 创建 /api/ai/viz-assist**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runVizAssist } from '@/lib/ai';
import type { VizAssistRequest } from '@/lib/ai';
import { getUserId } from '@/lib/db';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as VizAssistRequest;
    if (!body.documentName || !body.workflow?.length || !body.currentRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await runVizAssist(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Viz Assist API Error:', error);
    const message = error instanceof Error ? error.message : '可视化助手处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
```

- [ ] **Step 5: 创建 /api/ai/version-summary**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { summarizeVersion } from '@/lib/ai';
import type { VersionSummaryRequest } from '@/lib/ai';
import { getUserId } from '@/lib/db';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as VersionSummaryRequest;
    if (!body.documentName || !body.workflow?.length || !body.previousContent || !body.currentContent || !body.versionNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (body.versionNumber < 2) {
      return NextResponse.json({ error: 'versionNumber must be >= 2' }, { status: 400 });
    }
    const result = await summarizeVersion(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Version Summary API Error:', error);
    const message = error instanceof Error ? error.message : '版本总结处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
```

- [ ] **Step 6: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 10: 创建前端 React Hooks

**Files:**
- Create: `src/hooks/useTaokeAI.ts`

- [ ] **Step 1: 完整实现**

```typescript
import { useState, useCallback } from 'react';
import type { AnalyzeRequest, AnalyzeResponse, CopilotRequest, CopilotResponse, CodeLabRequest, CodeLabResponse, VizAssistRequest, VizAssistResponse, VersionSummaryRequest, VersionSummaryResponse } from '@/lib/ai';

interface UseAIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAIAction<TReq, TRes>(endpoint: string) {
  const [state, setState] = useState<UseAIState<TRes>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (payload: TReq): Promise<TRes | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, [endpoint]);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);
  return { ...state, execute, reset };
}

export function useAnalyze() { return useAIAction<AnalyzeRequest, AnalyzeResponse>('/api/ai/analyze'); }
export function useCopilot() { return useAIAction<CopilotRequest, CopilotResponse>('/api/ai/copilot'); }
export function useCodeLab() { return useAIAction<CodeLabRequest, CodeLabResponse>('/api/ai/code-lab'); }
export function useVizAssist() { return useAIAction<VizAssistRequest, VizAssistResponse>('/api/ai/viz-assist'); }
export function useVersionSummary() { return useAIAction<VersionSummaryRequest, VersionSummaryResponse>('/api/ai/version-summary'); }
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 11: 创建 AnalyzePanel 组件

**Files:**
- Create: `src/components/AnalyzePanel.tsx`

- [ ] **Step 1: 完整实现**

```tsx
'use client';

import { useState } from 'react';
import { X, BarChart3, Loader2, Users, CheckCircle } from 'lucide-react';
import { useAnalyze } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';

interface AnalyzePanelProps { isOpen: boolean; onClose: () => void; }

export default function AnalyzePanel({ isOpen, onClose }: AnalyzePanelProps) {
  const [workflowInput, setWorkflowInput] = useState('产品经理,设计师,前端开发,后端开发,测试');
  const [documentName, setDocumentName] = useState('');
  const { data, loading, error, execute } = useAnalyze();
  const blocks = useBlockStore((state) => state.blocks);

  const handleAnalyze = async () => {
    const workflow = workflowInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (workflow.length === 0) return;
    const content = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
    await execute({ documentName: documentName || '未命名文档', documentContent: content.slice(0, 5000), workflow, sourceType: 'preset' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">工作流分析</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">文档名称</label>
            <input type="text" value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="输入文档名称" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">工作流角色（逗号分隔）</label>
            <input type="text" value={workflowInput} onChange={(e) => setWorkflowInput(e.target.value)} placeholder="产品经理,设计师,开发,测试" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <button onClick={handleAnalyze} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loading ? '分析中...' : '开始分析'}
          </button>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {data && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">文档摘要</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{data.documentSummary}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> 岗位流转</h3>
                <div className="space-y-2">
                  {data.roleFlow.stages.map((stage, i) => (
                    <div key={i} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg">
                      <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{stage.role}</span>
                      <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">{stage.stageGoal}</p>
                      {stage.watchPoints.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{stage.watchPoints.map((wp, j) => <span key={j} className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">{wp}</span>)}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 任务安排</h3>
                <div className="space-y-1">
                  {data.taskSchedule.map((task) => (
                    <div key={task.step} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded">
                      <span className="text-xs font-mono text-gray-500 w-6">{task.step}</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded">{task.owner}</span>
                      <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1">{task.goal}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 12: 创建 CopilotPanel 组件

**Files:**
- Create: `src/components/CopilotPanel.tsx`

- [ ] **Step 1: 完整实现**

```tsx
'use client';

import { useState } from 'react';
import { X, BrainCircuit, Loader2, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import { useCopilot } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import type { CopilotResponse } from '@/lib/ai';

interface CopilotPanelProps { isOpen: boolean; onClose: () => void; }

export default function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
  const [action, setAction] = useState<'plan_next' | 'plan_finalize' | 'critique_generate'>('plan_next');
  const [userMessage, setUserMessage] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const { loading, error, execute } = useCopilot();
  const blocks = useBlockStore((state) => state.blocks);

  const handleSubmit = async () => {
    const content = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
    const res = await execute({ action, documentName: '当前文档', documentContent: content.slice(0, 5000), workflow: ['作者', '审阅者'], userMessage: userMessage || undefined, qaHistory: qaHistory.length > 0 ? qaHistory : undefined });
    if (res) {
      setResult(res);
      if (action === 'plan_next' && 'nextQuestion' in res && res.nextQuestion) {
        setQaHistory((prev) => [...prev, { question: userMessage || '开始计划', answer: res.understandingSummary }]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">AI Copilot</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="flex gap-2">
            {[{ key: 'plan_next' as const, label: '计划' }, { key: 'plan_finalize' as const, label: '定稿' }, { key: 'critique_generate' as const, label: '审阅' }].map((item) => (
              <button key={item.key} onClick={() => { setAction(item.key); setResult(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${action === item.key ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}>{item.label}</button>
            ))}
          </div>

          {action === 'plan_next' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">补充信息（可选）</label>
              <textarea value={userMessage} onChange={(e) => setUserMessage(e.target.value)} placeholder="描述你的需求或目标..." rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? '处理中...' : action === 'critique_generate' ? '生成审阅' : '生成计划'}
          </button>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {result && result.action === 'critique_generate' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 审阅概览</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{result.overview}</p>
              </div>
              {result.issues.map((issue) => (
                <div key={issue.id} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${issue.severity === 'high' ? 'bg-red-100 text-red-700' : issue.severity === 'low' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{issue.severity}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{issue.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{issue.reason}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">建议：{issue.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {result && (result.action === 'plan_next' || result.action === 'plan_finalize') && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 理解摘要</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{'understandingSummary' in result ? result.understandingSummary : result.summary}</p>
              </div>
              {'draftMarkdown' in result && result.draftMarkdown && <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"><h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">草稿</h3><pre className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{result.draftMarkdown}</pre></div>}
              {'finalMarkdown' in result && result.finalMarkdown && <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"><h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">最终计划</h3><pre className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{result.finalMarkdown}</pre></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 13: 修改 Toolbar 组件

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: 添加新图标导入和 Props**

```typescript
import { Bot, Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle, Search, Download, Upload, CopyPlus, Wand2, Layers, Sun, Moon, History, Users, LogOut, UserCircle, LayoutGrid, FileText, Command, BarChart3, BrainCircuit } from 'lucide-react';

interface ToolbarProps {
  // ... 原有 props ...
  onToggleCopilot: () => void;
  onToggleAnalyze: () => void;
}
```

- [ ] **Step 2: 解构新 props 并添加按钮**

```typescript
export default function Toolbar({
  // ... 原有 props ...
  onToggleCopilot, onToggleAnalyze,
}: ToolbarProps) {
  // ... 原有逻辑 ...
```

在 AI Group 区域添加两个按钮：

```tsx
{/* AI Group */}
<button onClick={onToggleAIAssistant} className={iconBtnBlue} title="AI 助手"><Sparkles className="w-4 h-4" /></button>
<button onClick={onToggleCopilot} className={iconBtnBlue} title="AI Copilot"><BrainCircuit className="w-4 h-4" /></button>
<button onClick={onToggleAnalyze} className={iconBtnBlue} title="工作流分析"><BarChart3 className="w-4 h-4" /></button>
<button onClick={toggleAgent} className={agentEnabled ? iconBtnActive : iconBtn} title="Agent"><Bot className="w-4 h-4" /></button>
```

- [ ] **Step 3: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 14: 修改 BlockOSApp 组件

**Files:**
- Modify: `src/components/BlockOSApp.tsx`

- [ ] **Step 1: 导入新组件**

```typescript
import CopilotPanel from '@/components/CopilotPanel';
import AnalyzePanel from '@/components/AnalyzePanel';
```

- [ ] **Step 2: 添加状态**

```typescript
const [showCopilot, setShowCopilot] = useState(false);
const [showAnalyze, setShowAnalyze] = useState(false);
```

- [ ] **Step 3: 传递 Props 给 Toolbar**

```tsx
<Toolbar
  // ... 原有 props ...
  onToggleCopilot={() => setShowCopilot(true)}
  onToggleAnalyze={() => setShowAnalyze(true)}
/>
```

- [ ] **Step 4: 渲染新面板**

```tsx
<CopilotPanel isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
<AnalyzePanel isOpen={showAnalyze} onClose={() => setShowAnalyze(false)} />
```

- [ ] **Step 5: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## Task 15: 配置环境变量

**Files:**
- Modify: `.env.local`（如不存在则创建）

- [ ] **Step 1: 添加 DashScope 配置**

```env
# AI 服务配置（Taoke 移植）
DASHSCOPE_API_KEY=your-dashscope-api-key-here
QWEN_MODEL=qwen-plus
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
DASHSCOPE_TIMEOUT_SECONDS=45
```

- [ ] **Step 2: 质量门禁**

```bash
# 编译检查
cd d:/比赛文件/blockOS && npx tsc --noEmit

# 构建检查
cd d:/比赛文件/blockOS && npx next build
```

---

## 合并后优化方案

### 优化 1: API 错误处理统一中间件

**Files:**
- Create: `src/lib/api-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from './db';

export function withAuth(handler: (req: NextRequest, userId: string) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const userId = await getUserId();
      return handler(req, userId);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  };
}

export function withError(handler: () => Promise<Response>) {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      console.error('API Error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      const code = (error as { code?: string }).code || 'unknown_error';
      const statusCode = (error as { statusCode?: number }).statusCode || 500;
      return NextResponse.json({ error: message, code }, { status: statusCode });
    }
  };
}
```

### 优化 2: AI 服务流式响应

**Files:**
- Modify: `src/lib/ai/client.ts`

添加 `postStreamCompletion` 函数，支持 SSE 流式输出，前端可逐字显示 AI 响应。

### 优化 3: BlockEditor 组件拆分

**Files:**
- Create: `src/components/editor/Canvas.tsx`
- Create: `src/components/editor/BlockNode.tsx`
- Create: `src/hooks/useCanvasPan.ts`
- Create: `src/hooks/useCanvasZoom.ts`
- Create: `src/hooks/useBlockDrag.ts`

将 BlockEditor.tsx（940+ 行）拆分为多个专注单一职责的组件和 Hooks。

### 优化 4: 状态管理精细化

**Files:**
- Modify: `src/store/blockStore.ts`

使用 Zustand 选择器减少重渲染：

```typescript
// 优化前
const blocks = useBlockStore((state) => state.blocks);

// 优化后
const useBlockIds = () => useBlockStore((state) => state.blocks.map(b => b.id));
```

### 优化 5: 数据库 Schema 补全

**Files:**
- Modify: `src/lib/db.ts`

补全 blocks 表缺少的字段：

```sql
ALTER TABLE blocks ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE blocks ADD COLUMN x INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN y INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN width INTEGER DEFAULT 480;
ALTER TABLE blocks ADD COLUMN collapsed INTEGER DEFAULT 0;
```

---

## 最终验证清单

- [ ] `npm run build` 成功无 TypeScript 错误
- [ ] 访问 `/api/ai/analyze` 返回正确 JSON 结构
- [ ] 访问 `/api/ai/copilot` 返回正确 JSON 结构
- [ ] Toolbar 显示「AI Copilot」和「工作流分析」按钮
- [ ] 点击按钮弹出对应面板
- [ ] 面板内功能可正常交互
- [ ] 环境变量配置正确
- [ ] 错误处理覆盖所有边界情况
