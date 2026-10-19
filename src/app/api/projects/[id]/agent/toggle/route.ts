import { withDatabaseRequest } from '@/lib/database-request';
import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
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

    const rows = query('SELECT agent_paused FROM projects WHERE id = ?', [projectId]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      projectId,
      agentPaused: Boolean(rows[0].agent_paused),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/agent/toggle error:', err);
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
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to toggle automation' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { paused } = body;

    const targetState = typeof paused === 'boolean' ? (paused ? 1 : 0) : 1;
    run('UPDATE projects SET agent_paused = ?, updated_at = ? WHERE id = ?', [targetState, Date.now(), projectId]);
    saveDb();

    return NextResponse.json({
      success: true,
      projectId,
      agentPaused: targetState === 1,
      message: targetState === 1 ? '已紧急暂停项目所有 Agent 自动化' : '已恢复项目 Agent 自动化执行',
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/agent/toggle error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(withEnterprise(GETHandler));
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
