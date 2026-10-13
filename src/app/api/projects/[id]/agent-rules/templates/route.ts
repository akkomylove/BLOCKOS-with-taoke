import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function GET(
  req: NextRequest,
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
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = query('SELECT * FROM agent_rule_templates ORDER BY is_default DESC, id ASC');

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        triggerType: t.trigger_type,
        triggerCondition: t.trigger_condition,
        actions: JSON.parse((t.actions as string) || '[]'),
        isDefault: t.is_default === 1,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/agent-rules/templates error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
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
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { templateId, mockInput = {} } = body;

    const templateRows = query('SELECT * FROM agent_rule_templates WHERE id = ?', [templateId]);
    if (templateRows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const t = templateRows[0];
    const actions = JSON.parse((t.actions as string) || '[]');

    // 单步沙盒模拟测试（无副作用）
    const simulationResult = {
      templateId,
      templateName: t.name,
      triggerType: t.trigger_type,
      conditionEvaluated: true,
      conditionMatched: true,
      mockInput,
      simulatedActions: actions.map((act: { type: string; config?: Record<string, unknown> }) => ({
        type: act.type,
        status: 'simulated_success',
        previewOutput: `已根据配置触发动作 [${act.type}]，目标通道就绪`,
        config: act.config,
      })),
      testedAt: Date.now(),
      notes: '单步仿真执行完毕，未写入任何物理脏数据',
    };

    return NextResponse.json({
      success: true,
      simulation: simulationResult,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/agent-rules/templates error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
