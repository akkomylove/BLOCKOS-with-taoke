import { postJsonCompletion, parseJsonContent, safeText, safeList } from './client';
import type { ReviewEnrichRequest, ReviewEnrichResponse, ReviewEnrichRole } from './types';

const ROLE_PROMPTS: Record<string, { task: string; focus: string; angle: string }> = {
  '产品经理': {
    task: '需求定义、用户调研、功能规划',
    focus: '需求完整性、用户场景覆盖、验收标准',
    angle: '从需求定义和用户价值角度',
  },
  'UI/UX设计师': {
    task: '界面设计、交互原型、用户体验',
    focus: '设计一致性、可用性、视觉规范',
    angle: '从用户体验和交互设计角度',
  },
  '前端开发': {
    task: '页面实现、组件开发、交互逻辑',
    focus: '组件复用、性能优化、响应式适配',
    angle: '从实现可行性和前端架构角度',
  },
  '后端开发': {
    task: 'API开发、数据库设计、服务架构',
    focus: '接口设计、数据模型、并发安全',
    angle: '从系统架构和数据流角度',
  },
  '测试工程师': {
    task: '测试用例、质量保障、缺陷跟踪',
    focus: '覆盖度、边界条件、回归风险',
    angle: '从质量保障和风险识别角度',
  },
  '运维工程师': {
    task: '部署、监控、CI/CD',
    focus: '部署流程、监控告警、容灾备份',
    angle: '从运维稳定性和自动化角度',
  },
  '数据分析师': {
    task: '数据分析、报表、指标监控',
    focus: '指标定义、数据采集、分析维度',
    angle: '从数据驱动和指标验证角度',
  },
  '项目经理': {
    task: '进度管理、资源协调、风险控制',
    focus: '里程碑、资源分配、依赖关系',
    angle: '从项目管理和进度控制角度',
  },
  '技术负责人': {
    task: '架构设计、技术决策、代码审查',
    focus: '技术选型、架构合理性、技术债务',
    angle: '从技术架构和长期演进角度',
  },
  '安全工程师': {
    task: '安全审计、漏洞修复、合规检查',
    focus: '数据安全、访问控制、合规要求',
    angle: '从安全风险和合规性角度',
  },
};

function normalizeReviewPayload(payload: Record<string, unknown>, workflow: string[]): { roles: ReviewEnrichRole[] } {
  const rawRoles = payload.roles;
  const roleMap: Record<string, Record<string, unknown>> = {};
  const roleList = Array.isArray(rawRoles) ? rawRoles : [];

  for (const item of roleList) {
    if (!item || typeof item !== 'object') continue;
    const role = safeText((item as Record<string, unknown>).role);
    if (role) roleMap[role.trim().toLowerCase()] = item as Record<string, unknown>;
  }

  const normalizedRoles: ReviewEnrichRole[] = [];
  for (const role of workflow) {
    const rawRole = roleMap[role.trim().toLowerCase()] || {};
    const viewHints = (rawRole.view_hints as Record<string, unknown>) || {};
    const rolePrompt = ROLE_PROMPTS[role] || { task: `${role}相关任务`, focus: `${role}关注点`, angle: `从${role}角度` };
    normalizedRoles.push({
      role,
      reviewSummary: safeText(rawRole.review_summary, `${role}（${rolePrompt.task}）：${rolePrompt.angle}审阅文档，重点关注${rolePrompt.focus}。`),
      reviewChecklist: safeList(rawRole.review_checklist, [
        `检查 ${role} 所需的输入是否完整`,
        `验证 ${role} 的输出是否符合规范`,
        `识别 ${role} 环节的风险点`,
      ]),
      viewHints: {
        priorityTopics: safeList(viewHints.priority_topics, [rolePrompt.focus]),
        foldableTopics: safeList(viewHints.foldable_topics, ['其他角色细节']),
        reviewKeywords: safeList(viewHints.review_keywords, [role]),
        note: safeText(viewHints.note, `仅用于 ${role} 视图层折叠与高亮提示，不会修改或删除原文。`),
      },
    });
  }

  return { roles: normalizedRoles };
}

export async function reviewEnrich(payload: ReviewEnrichRequest): Promise<ReviewEnrichResponse> {
  const systemPrompt = (
    '你是 FDoc 的角色审阅增强助手。'
    + '只输出合法 JSON，不要 markdown，不要解释。'
    + ` roles 的 role 必须严格按这个顺序输出：${JSON.stringify(payload.workflow)}。`
    + ' 当前任务只生成角色审阅摘要、清单和视图提示，内容要短。'
    + ' 每个角色的审阅内容必须体现该角色的专业视角，不能与其他角色重复。'
  );

  const baseRoles = payload.roles.map((r) => {
    const rp = ROLE_PROMPTS[r.role] || { task: `${r.role}相关任务`, focus: `${r.role}关注点`, angle: `从${r.role}角度` };
    return {
      role: r.role,
      task: r.task || rp.task,
      focus_points: r.focusPoints || [rp.focus],
      brief_summary: r.briefSummary || rp.angle,
      angle: rp.angle,
    };
  });

  const userPrompt = (
    '返回固定 JSON，字段只有 roles。\n'
    + '每个 roles 项只包含 role、review_summary、review_checklist、view_hints。\n'
    + 'view_hints 只包含 priority_topics、foldable_topics、review_keywords、note。\n'
    + '要求：\n'
    + '1. review_summary 每个角色 1 到 2 句话，必须体现该角色的独特视角。\n'
    + '2. review_checklist 每个角色 3 到 5 条，与该角色职责强相关。\n'
    + '3. priority_topics、foldable_topics、review_keywords 尽量短，体现角色差异。\n'
    + '4. note 说明这些提示只用于视图层折叠，不改变原文。\n'
    + '5. 所有角色顺序必须与工作流一致。\n'
    + '6. 不同角色的审阅内容不能重复，必须体现各自的专业关注点。\n\n'
    + `工作流：${JSON.stringify(payload.workflow)}\n`
    + `基础角色分析：${JSON.stringify(baseRoles)}\n`
    + '文档正文：\n'
    + payload.documentContent.slice(0, 5000)
  );

  const rawContent = await postJsonCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.1
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonContent(rawContent);
  } catch {
    parsed = {};
  }

  const normalized = normalizeReviewPayload(parsed, payload.workflow);

  if (normalized.roles.length !== payload.workflow.length) {
    throw new Error('AI 返回的角色审阅数量与工作流不一致');
  }

  const responseRoles = normalized.roles.map((r) => r.role.trim());
  if (JSON.stringify(responseRoles) !== JSON.stringify(payload.workflow)) {
    throw new Error('AI 返回的角色审阅顺序与工作流不一致');
  }

  return normalized;
}
