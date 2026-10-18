import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

async function GETHandler(
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

    const executions = query(
      `SELECT * FROM agent_executions WHERE project_id = ? ORDER BY created_at DESC LIMIT 50`,
      [projectId]
    );

    return NextResponse.json({
      executions: executions.map((e) => ({
        id: e.id,
        projectId: e.project_id,
        ruleId: e.rule_id,
        triggerReason: e.trigger_reason,
        inputSnapshot: JSON.parse((e.input_snapshot as string) || '{}'),
        actionsTaken: JSON.parse((e.actions_taken as string) || '[]'),
        affectedEntities: JSON.parse((e.affected_entities as string) || '[]'),
        durationMs: e.duration_ms,
        status: e.status,
        revertedAt: e.reverted_at,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/agent-executions error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function POSTHandler(
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
    const perm = checkProjectPermission(userId, projectId, 'edit_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { ruleId, triggerReason, inputSnapshot = {}, actionsTaken = [], affectedEntities = [], durationMs = 0 } = body;

    if (!triggerReason) {
      return NextResponse.json({ error: 'triggerReason is required' }, { status: 400 });
    }

    const execId = nanoid();
    const now = Date.now();

    run(
      `INSERT INTO agent_executions (
        id, project_id, rule_id, trigger_reason, input_snapshot, actions_taken, affected_entities, duration_ms, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`,
      [
        execId,
        projectId,
        ruleId || null,
        triggerReason,
        JSON.stringify(inputSnapshot),
        JSON.stringify(actionsTaken),
        JSON.stringify(affectedEntities),
        durationMs,
        now,
      ]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      id: execId,
      createdAt: now,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/agent-executions error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withEnterprise(GETHandler);
export const POST = withEnterprise(POSTHandler);
