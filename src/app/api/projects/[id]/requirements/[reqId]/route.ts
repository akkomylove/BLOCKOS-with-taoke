import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, reqId } = await params;
    if (!isValidNanoid(id) || !isValidNanoid(reqId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reqRows = query('SELECT * FROM requirements WHERE id = ? AND project_id = ?', [reqId, id]);
    if (reqRows.length === 0) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const r = reqRows[0];
    // 反查所有实现或关联该需求的所有任务
    const linkedTasks = query(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar 
       FROM tasks t 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.requirement_id = ? AND (t.deleted_at IS NULL OR t.deleted_at = 0)
       ORDER BY t.created_at ASC`,
      [reqId]
    );

    // 查询语义关系中与该需求相关的链接
    const relations = query(
      `SELECT * FROM semantic_relations 
       WHERE project_id = ? AND (source_id = ? OR target_id = ?)`,
      [id, reqId, reqId]
    );

    return NextResponse.json({
      requirement: {
        id: r.id,
        projectId: r.project_id,
        code: r.code,
        title: r.title,
        description: r.description || '',
        status: r.status,
        priority: r.priority,
        assigneeId: r.assignee_id,
        version: r.version ?? 1,
        dod: JSON.parse((r.dod as string) || '[]'),
        sourceBlockId: r.source_block_id || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
      linkedTasks: linkedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assignee_id,
        assigneeName: t.assignee_name,
        dod: t.dod,
        reviewedBy: t.reviewed_by,
        reviewedAt: t.reviewed_at,
      })),
      relations,
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/requirements/[reqId] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, reqId } = await params;
    if (!isValidNanoid(id) || !isValidNanoid(reqId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'edit_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden: Read-only members cannot edit requirements' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, status, priority, assigneeId, dod, version } = body;

    const existing = query('SELECT * FROM requirements WHERE id = ? AND project_id = ?', [reqId, id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const currentVersion = (existing[0].version as number) || 1;
    if (typeof version === 'number' && version !== currentVersion) {
      return NextResponse.json(
        { error: 'Conflict: Requirement has been modified concurrently', currentVersion },
        { status: 409 }
      );
    }

    const nextVersion = currentVersion + 1;
    const now = Date.now();

    run(
      `UPDATE requirements 
       SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, dod = ?, version = ?, updated_at = ?
       WHERE id = ? AND project_id = ?`,
      [
        title ?? existing[0].title,
        description ?? existing[0].description,
        status ?? existing[0].status,
        priority ?? existing[0].priority,
        assigneeId !== undefined ? assigneeId : existing[0].assignee_id,
        dod ? JSON.stringify(dod) : existing[0].dod,
        nextVersion,
        now,
        reqId,
        id,
      ]
    );

    saveDb();
    return NextResponse.json({ success: true, version: nextVersion });
  } catch (err) {
    console.error('PUT /api/projects/[id]/requirements/[reqId] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, reqId } = await params;
    if (!isValidNanoid(id) || !isValidNanoid(reqId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'delete_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete requirement' }, { status: 403 });
    }

    // 检查关联影响：是否存在尚未归档/进行中的关联任务
    const activeTasks = query(
      "SELECT id, title FROM tasks WHERE requirement_id = ? AND status != 'done'",
      [reqId]
    );

    run('DELETE FROM requirements WHERE id = ? AND project_id = ?', [reqId, id]);
    // 清理或解绑关联关系
    run('DELETE FROM semantic_relations WHERE source_id = ? OR target_id = ?', [reqId, reqId]);
    run('UPDATE tasks SET requirement_id = NULL WHERE requirement_id = ?', [reqId]);
    saveDb();

    return NextResponse.json({
      success: true,
      affectedTaskCount: activeTasks.length,
      warning: activeTasks.length > 0 ? `警告：有 ${activeTasks.length} 个进行中任务已与该需求解除绑定` : null,
    });
  } catch (err) {
    console.error('DELETE /api/projects/[id]/requirements/[reqId] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
