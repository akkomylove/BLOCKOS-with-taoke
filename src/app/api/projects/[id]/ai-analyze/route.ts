import { withEnterprise } from '@/lib/enterprise-access';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';
import { NextResponse } from 'next/server';
import { normalizeProjectAnalysis } from '@/lib/project-analysis';

interface ProjectMemberInfo {
  user_id: string;
  role: string;
  name: string;
  email: string;
  title: string | null;
  functions: string | null;
}

interface ExistingTaskInfo {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

function matchMemberForFunction(
  suggestedFunction: string | undefined,
  members: ProjectMemberInfo[]
): { id: string | null; name: string | null; reason: string } {
  if (!suggestedFunction || members.length === 0) {
    return { id: null, name: null, reason: '未指定职能或当前项目无成员，设为待分配' };
  }

  const normalized = suggestedFunction.toLowerCase().replace(/[\s\/]/g, '');

  for (const m of members) {
    // 匹配 title (例如 前端工程师)
    const title = (m.title || '').toLowerCase().replace(/[\s\/]/g, '');
    if (title && (normalized.includes(title) || title.includes(normalized))) {
      return { id: m.user_id, name: m.name, reason: `匹配项目成员岗位: ${m.title}` };
    }

    // 匹配 functions (例如 ["前端开发", "React"])
    let fns: string[] = [];
    try {
      fns = JSON.parse(m.functions || '[]');
    } catch {
      /* ignore */
    }
    for (const fn of (Array.isArray(fns) ? fns : [])) {
      if (typeof fn !== 'string') continue;
      const fnNorm = fn.toLowerCase().replace(/[\s\/]/g, '');
      if (fnNorm && (normalized.includes(fnNorm) || fnNorm.includes(normalized))) {
        return { id: m.user_id, name: m.name, reason: `匹配项目成员技能职能: ${fn}` };
      }
    }

    // 匹配姓名或邮箱前缀
    const nameNorm = (m.name || '').toLowerCase().replace(/\s/g, '');
    if (nameNorm && normalized.includes(nameNorm)) {
      return { id: m.user_id, name: m.name, reason: `精准匹配成员名称: ${m.name}` };
    }
  }

  return { id: null, name: null, reason: `项目内未找到具备【${suggestedFunction}】职能的成员，保留为待分配` };
}

function detectDuplicates(
  taskTitle: string,
  existingTasks: ExistingTaskInfo[]
): { isDuplicate: boolean; duplicateOfTaskId?: string; duplicateTitle?: string } {
  const normNew = taskTitle.trim().toLowerCase();
  for (const ext of existingTasks) {
    const normExt = ext.title.trim().toLowerCase();
    if (normNew === normExt || (normNew.length > 4 && normExt.includes(normNew)) || (normExt.length > 4 && normNew.includes(normExt))) {
      return { isDuplicate: true, duplicateOfTaskId: ext.id, duplicateTitle: ext.title };
    }
  }
  return { isDuplicate: false };
}

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid Project ID' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // 查询当前项目成员（限定只能在本项目内推荐）
    const memberRows = (query(
      `SELECT pm.user_id, pm.role, u.name, u.email, up.title, up.functions 
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.id
       LEFT JOIN user_profiles up ON pm.user_id = up.user_id
       WHERE pm.project_id = ?`,
      [projectId]
    ) as unknown) as ProjectMemberInfo[];

    // 查询已有任务，用于查重与合并提示
    const existingTasks = (query(
      `SELECT id, title, description, status 
       FROM tasks 
       WHERE project_id = ? AND (deleted_at IS NULL OR deleted_at = 0)`,
      [projectId]
    ) as unknown) as ExistingTaskInfo[];

    const memberRosterDescription = memberRows.length > 0
      ? memberRows.map((m) => `${m.name}（角色: ${m.role}, 岗位: ${m.title || '通用'}, 职能: ${m.functions || '[]'}）`).join('；')
      : '本项目暂无额外成员';

    const apiKey =
      process.env.ZHIPU_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      process.env.SILICONFLOW_API_KEY;
    const baseUrl =
      process.env.ZHIPU_BASE_URL ||
      process.env.DASHSCOPE_BASE_URL ||
      process.env.SILICONFLOW_BASE_URL ||
      'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.AI_MODEL || 'glm-4-flash';

interface RawAnalyzedTask {
  title: string;
  description?: string;
  priority?: string;
  suggestedAssigneeFunction?: string;
  sourceSnippet?: string;
  deliverables?: string[];
  dod?: string[];
  clarificationQuestions?: string[];
  estimatedDays?: number;
  subtasks?: Array<{ title: string; description?: string }>;
}

interface RawReviewData {
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  riskPoints?: string[];
}

interface RawWorkflowStage {
  phase: string;
  description?: string;
  order?: number;
  estimatedDays?: number;
  assigneeFunction?: string;
  tasks?: string[];
}

    let rawTasks: RawAnalyzedTask[] = [];
    let review: RawReviewData | null = null;
    let workflow: RawWorkflowStage[] = [];

    if (apiKey) {
      const prompt = `你是一个资深产品交付专家。请深入分析以下项目计划书/PRD，并输出高品质、可执行的结构化拆解结果（只返回合法JSON，严禁 markdown 代码块以外的解释）。

当前项目可用成员花名册（严禁指派非本项目成员！如无人匹配必须标注待分配）：
${memberRosterDescription}

待分析文档内容：
${content.slice(0, 8000)}

请返回以下JSON格式：
{
  "tasks": [
    {
      "title": "任务标题（清晰具体）",
      "description": "任务实施说明",
      "priority": "low|medium|high|urgent",
      "suggestedAssigneeFunction": "建议岗位/成员姓名（如：前端开发、UI设计等）",
      "sourceSnippet": "对应文档中的原始段落依据或摘要引用",
      "deliverables": ["具体交付物清单1", "交付物2"],
      "dod": ["验收条件1", "验收条件2"],
      "clarificationQuestions": ["待向业务方或产品澄清的问题（若有）"],
      "estimatedDays": 预计天数(number, 如2)
    }
  ],
  "review": {
    "strengths": ["优势与亮点"],
    "weaknesses": ["待补齐短板"],
    "suggestions": ["改进建议"],
    "riskPoints": ["核心风险与依赖点"]
  },
  "workflow": [
    {
      "phase": "阶段名称（需求梳理/原型设计/技术开发/集成验收）",
      "description": "阶段目标",
      "order": 1,
      "estimatedDays": 3,
      "assigneeFunction": "负责人岗位或成员姓名",
      "tasks": ["核心事项1", "核心事项2"]
    }
  ]
}`;

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: '你是一个专业的项目拆解专家，必须只返回合法 JSON。' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiContent = data.choices?.[0]?.message?.content || '';
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
          const normalized = normalizeProjectAnalysis(parsed);
          rawTasks = normalized.tasks;
          review = normalized.review;
          workflow = normalized.workflow;
        }
      } catch (e) {
        console.warn('AI API call failed, falling back to heuristic task parser:', e);
      }
    }

    // 启发式安全回退（若无 API Key 或大模型调用超时，保证工程级健壮可用）
    if (rawTasks.length === 0) {
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      const extractedHeadings = lines.filter((l) => l.startsWith('#') || l.startsWith('-') || /^[0-9]+[、.]/.test(l));

      const sampleItems = extractedHeadings.length > 0 ? extractedHeadings.slice(0, 8) : lines.slice(0, 5);
      rawTasks = sampleItems.map((item, idx) => {
        const cleanTitle = item.replace(/^#+\s*|^[-*]\s*|^[0-9]+[、.]\s*/, '');
        return {
          title: cleanTitle || `任务 ${idx + 1}`,
          description: `基于文档提取的需求事项：${cleanTitle}`,
          priority: idx === 0 ? 'urgent' : idx < 3 ? 'high' : 'medium',
          suggestedAssigneeFunction: idx % 2 === 0 ? '前端开发' : '后端开发',
          sourceSnippet: item,
          deliverables: [`${cleanTitle} 交付文档/代码`],
          dod: ['代码通过单元测试', '功能点通过交互验收'],
          clarificationQuestions: ['业务边界与边缘异常处理流程待确认'],
          estimatedDays: 2,
        };
      });

      review = {
        strengths: ['文档包含结构化需求目录', '目标明确'],
        weaknesses: ['部分细化交互条件待进一步补充'],
        suggestions: ['建议补充字段级异常流定义'],
        riskPoints: ['需求跨模块关联较多，需注意协同交付排期'],
      };

      workflow = [
        { phase: '需求确认与对齐', description: '核验业务范围与DoD', order: 1, estimatedDays: 2, assigneeFunction: '产品经理', tasks: ['对齐业务范围', '确认验收准则'] },
        { phase: '核心功能研发', description: '代码实现与单元测试', order: 2, estimatedDays: 5, assigneeFunction: '研发团队', tasks: ['核心接口联调', '前端功能实现'] },
        { phase: '测试验收与交付', description: '集成测试与上线部署', order: 3, estimatedDays: 2, assigneeFunction: '测试工程师', tasks: ['功能验收测试', '生产发布部署'] },
      ];
    }

    // 强化后处理：注入负责人范围限定（只允许项目成员）、查重预警、估时待确认标识
    const processedTasks = rawTasks.map((task) => {
      const dupCheck = detectDuplicates(task.title, existingTasks);
      const assigneeMatch = matchMemberForFunction(task.suggestedAssigneeFunction, memberRows);

      return {
        ...task,
        sourceSnippet: task.sourceSnippet || '引自需求文档',
        deliverables: Array.isArray(task.deliverables) ? task.deliverables : ['功能模块交付代码'],
        dod: Array.isArray(task.dod) ? task.dod : ['功能通过测试', '满足验收准则'],
        clarificationQuestions: Array.isArray(task.clarificationQuestions) ? task.clarificationQuestions : [],
        estimatedDays: task.estimatedDays || 2,
        isEstimatePendingConfirmation: true, // 明确标注为建议估时，需团队确认
        // 查重与合并提示
        isDuplicate: dupCheck.isDuplicate,
        duplicateWarning: dupCheck.isDuplicate ? `与项目已有任务【${dupCheck.duplicateTitle}】高度相似，建议核实合并` : null,
        duplicateOfTaskId: dupCheck.duplicateOfTaskId || null,
        // 限定在项目成员内的分配建议
        suggestedAssigneeId: assigneeMatch.id,
        suggestedAssigneeName: assigneeMatch.name,
        assigneeRecommendationReason: assigneeMatch.reason,
      };
    });

    const processedWorkflow = (workflow || []).map((w, idx) => ({
      phase: w.phase || `阶段 ${idx + 1}`,
      description: w.description || '',
      order: typeof w.order === 'number' ? w.order : idx + 1,
      estimatedDays: typeof w.estimatedDays === 'number' ? w.estimatedDays : 2,
      assigneeFunction: (w as any).assigneeFunction || (w as any).assignee || '通用岗位',
      tasks: Array.isArray((w as any).tasks) ? (w as any).tasks : [],
    }));

    const processedReview = {
      strengths: Array.isArray(review?.strengths) ? review.strengths : ['文档结构完整', '目标清晰'],
      weaknesses: Array.isArray(review?.weaknesses) ? review.weaknesses : [],
      suggestions: Array.isArray(review?.suggestions) ? review.suggestions : [],
      riskPoints: Array.isArray(review?.riskPoints) ? review.riskPoints : [],
    };

    return NextResponse.json({
      success: true,
      analysis: {
        tasks: processedTasks,
        review: processedReview,
        workflow: processedWorkflow,
        projectMemberCount: memberRows.length,
        existingTaskCount: existingTasks.length,
      },
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-analyze error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withEnterprise(POSTHandler);
