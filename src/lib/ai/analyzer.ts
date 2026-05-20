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

const ROLE_RESPONSIBILITIES: Record<string, string> = {
  '产品经理': '负责需求分析、产品规划、PRD撰写、项目管理、与业务方沟通',
  'UI/UX设计师': '负责界面设计、交互设计、用户体验、视觉规范、原型制作',
  '前端开发': '负责前端开发、组件封装、页面实现、响应式适配、性能优化',
  '后端开发': '负责接口开发、数据库设计、业务逻辑实现、系统架构、微服务',
  '测试工程师': '负责功能测试、自动化测试、性能测试、缺陷管理、验收标准',
};

const ROLE_DOC_FOCUS: Record<string, string[]> = {
  '产品经理': ['需求', '功能', '用户', '验收标准', '优先级', '痛点'],
  'UI/UX设计师': ['界面', '交互', '视觉', '用户体验', '设计规范', '组件'],
  '前端开发': ['接口', '组件', '页面', '响应式', '性能', '技术选型'],
  '后端开发': ['架构', '数据库', '接口', '业务逻辑', '安全', '性能'],
  '测试工程师': ['验收标准', '测试用例', '缺陷', '性能指标', '边界条件'],
};

function buildSystemPrompt(workflow: string[]): string {
  const roles = workflow.join('、');
  const responsibilities = Object.entries(ROLE_RESPONSIBILITIES)
    .filter(([role]) => workflow.includes(role))
    .map(([role, resp]) => `${role}：${resp}`)
    .join('\n');
  return (
    `你是 FDoc 的岗位流转分析助手。只输出合法 JSON，不要 markdown，不要解释。\n`
    + `你的核心任务：分析文档内容，将具体任务分配到各岗位。\n\n`
    + `各岗位核心职责：\n${responsibilities}\n\n`
    + `role_flow.stages 和 roles 的 role 必须严格按这个顺序输出：${JSON.stringify(workflow)}\n`
    + `task_schedule.owner 只能从这些岗位中选择。\n`
    + `task_schedule.goal 必须基于文档内容，具体描述该岗位要完成什么任务。`
  );
}

function buildUserPrompt(payload: AnalyzeRequest): string {
  const workflow = payload.workflow;
  const docFocus = workflow
    .filter(role => ROLE_DOC_FOCUS[role])
    .map(role => `${role}关注：${ROLE_DOC_FOCUS[role].join('、')}`)
    .join('\n');

  return (
    '返回固定 JSON，字段只有：document_summary、role_flow、roles、task_schedule。\n\n'
    + '## 任务分配要求：\n'
    + '1. document_summary：1-2句话概括文档核心内容。\n'
    + '2. role_flow.stages：按工作流顺序，每个角色说明其在当前文档项目中的具体目标（必须基于文档内容）。\n'
    + '3. roles：每个角色说明其具体任务（task）和关注重点（focus_points），必须引用文档中的具体内容。\n'
    + '4. task_schedule：生成详细的执行任务列表，每条任务必须包含：\n'
    + '   - goal：具体要完成什么（引用文档中的功能点、需求、指标等）\n'
    + '   - owner：该任务的主要负责人\n'
    + '   - priority：high/medium/low\n\n'
    + '## 文档内容分析重点：\n'
    + '- 从 PRD 中提取：功能清单（P0/P1/P2）、用户故事、验收标准\n'
    + '- 从技术方案中提取：架构设计、API 接口、数据库设计、技术选型\n'
    + '- 从 UI 规范中提取：组件规范、交互要求、视觉规范\n'
    + '- 从数据分析中提取：性能指标、监控要求\n'
    + '- 从测试计划中提取：测试范围、验收标准\n\n'
    + '## 角色分工示例：\n'
    + '- 产品经理：基于"核心功能清单"制定迭代计划，组织需求评审\n'
    + '- UI设计师：基于"功能清单"和"交互要求"完成界面设计\n'
    + '- 前端开发：基于"技术方案"和"API 接口"实现页面和组件\n'
    + '- 后端开发：基于"技术方案"实现接口和业务逻辑\n'
    + '- 测试工程师：基于"验收标准"和"测试用例"准备测试计划\n\n'
    + `## 工作流岗位：${JSON.stringify(workflow)}\n`
    + `## 各岗位关注重点：\n${docFocus}\n\n`
    + `## 文档名称：${payload.documentName}\n`
    + `## 文档正文（请基于此分配任务）：\n${payload.documentContent}`
  );
}
