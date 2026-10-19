import { withDatabaseRequest } from '@/lib/database-request';
import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const reqRows = query(
      `SELECT r.*, u.name as assignee_name, u.avatar as assignee_avatar,
        (SELECT COUNT(*) FROM tasks t WHERE t.requirement_id = r.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.requirement_id = r.id AND t.status = 'done') as completed_task_count
       FROM requirements r
       LEFT JOIN users u ON r.assignee_id = u.id
       WHERE r.project_id = ?
       ORDER BY r.created_at ASC`,
      [id]
    );

    return NextResponse.json({
      requirements: reqRows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        code: r.code,
        title: r.title,
        description: r.description || '',
        status: r.status,
        priority: r.priority,
        assigneeId: r.assignee_id,
        assigneeName: r.assignee_name,
        assigneeAvatar: r.assignee_avatar,
        version: r.version ?? 1,
        dod: JSON.parse((r.dod as string) || '[]'),
        sourceBlockId: r.source_block_id || null,
        taskCount: r.task_count ?? 0,
        completedTaskCount: r.completed_task_count ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/requirements error:', err);
    return NextResponse.json({ error: 'Internal Server Error', requirements: [] }, { status: 500 });
  }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'create_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden: Read-only members cannot create requirements' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, priority = 'P1', assigneeId, dod = [], sourceBlockId, customCode } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Requirement title is required' }, { status: 400 });
    }

    // 自动分配稳定自增编号: REQ-001, REQ-002
    let code = customCode;
    if (!code) {
      const countRes = query('SELECT COUNT(*) as total FROM requirements WHERE project_id = ?', [id]);
      const nextNum = ((countRes[0]?.total as number) || 0) + 1;
      code = `REQ-${String(nextNum).padStart(3, '0')}`;
    }

    const reqId = nanoid();
    const now = Date.now();

    run(
      `INSERT INTO requirements (
        id, project_id, code, title, description, status, priority, 
        assignee_id, version, dod, source_block_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, 1, ?, ?, ?, ?)`,
      [
        reqId,
        id,
        code,
        title.trim(),
        description || '',
        priority,
        assigneeId || null,
        JSON.stringify(Array.isArray(dod) ? dod : []),
        sourceBlockId || null,
        now,
        now,
      ]
    );

    saveDb();
    return NextResponse.json({ id: reqId, code, success: true });
  } catch (err) {
    console.error('POST /api/projects/[id]/requirements error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(withEnterprise(GETHandler));
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
