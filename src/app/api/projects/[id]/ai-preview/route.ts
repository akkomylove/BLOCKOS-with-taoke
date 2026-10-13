import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

export interface AIModificationChange {
  action: 'create' | 'update' | 'delete';
  entityType: 'block' | 'task';
  entityId?: string;
  before?: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string;
}

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
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const previews = query(
      `SELECT * FROM ai_modifications WHERE project_id = ? ORDER BY created_at DESC LIMIT 20`,
      [projectId]
    );

    return NextResponse.json({
      previews: previews.map((p) => ({
        id: p.id,
        projectId: p.project_id,
        sourceModel: p.source_model,
        promptSummary: p.prompt_summary,
        inputVersion: p.input_version,
        status: p.status,
        changes: JSON.parse((p.changes as string) || '[]'),
        createdAt: p.created_at,
        appliedAt: p.applied_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/ai-preview error:', err);
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
    const perm = checkProjectPermission(userId, projectId, 'create_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { sourceModel = 'glm-4-flash', promptSummary, inputVersion = 1, changes = [] } = body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ error: 'changes array must not be empty' }, { status: 400 });
    }

    // 字段校验与引用的实体完整性校验
    const validatedChanges: AIModificationChange[] = [];
    for (const ch of changes) {
      if (!['create', 'update', 'delete'].includes(ch.action) || !['block', 'task'].includes(ch.entityType)) {
        return NextResponse.json({ error: `Invalid change definition: ${JSON.stringify(ch)}` }, { status: 400 });
      }

      let beforeData = ch.before;
      if (ch.action === 'update' || ch.action === 'delete') {
        if (!ch.entityId) {
          return NextResponse.json({ error: `entityId required for action ${ch.action}` }, { status: 400 });
        }
        // 查询数据库中当前原值，填充 before 快照
        if (ch.entityType === 'task') {
          const tRow = query('SELECT * FROM tasks WHERE id = ?', [ch.entityId]);
          if (tRow.length > 0) {
            beforeData = beforeData || tRow[0];
          }
        } else if (ch.entityType === 'block') {
          const bRow = query('SELECT * FROM blocks WHERE id = ?', [ch.entityId]);
          if (bRow.length > 0) {
            beforeData = beforeData || bRow[0];
          }
        }
      }

      validatedChanges.push({
        action: ch.action,
        entityType: ch.entityType,
        entityId: ch.entityId,
        before: beforeData,
        after: ch.after || {},
        reason: ch.reason || 'AI 智能优化建议',
      });
    }

    const previewId = nanoid();
    const now = Date.now();

    run(
      `INSERT INTO ai_modifications (
        id, project_id, source_model, prompt_summary, input_version, changes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [previewId, projectId, sourceModel, promptSummary || 'AI 批量修改计划', inputVersion, JSON.stringify(validatedChanges), now]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      previewId,
      summary: `已生成 AI 修改预览，包含 ${validatedChanges.length} 项变更，等待用户逐项核验`,
      changesCount: validatedChanges.length,
      changes: validatedChanges,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-preview error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
