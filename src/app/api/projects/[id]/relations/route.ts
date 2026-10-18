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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const relations = query(
      `SELECT * FROM semantic_relations WHERE project_id = ? ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({ relations });
  } catch (err) {
    console.error('GET /api/projects/[id]/relations error:', err);
    return NextResponse.json({ error: 'Internal Server Error', relations: [] }, { status: 500 });
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
      return NextResponse.json({ error: 'Forbidden: Read-only members cannot create relations' }, { status: 403 });
    }

    const body = await req.json();
    const { sourceId, sourceType, targetId, targetType, relationType, description } = body;

    const validTypes = ['requirement', 'task', 'block'];
    const validRelations = ['implements', 'verifies', 'depends_on', 'references'];

    if (!sourceId || !targetId || !validTypes.includes(sourceType) || !validTypes.includes(targetType)) {
      return NextResponse.json({ error: 'Invalid source or target parameters' }, { status: 400 });
    }

    if (!validRelations.includes(relationType)) {
      return NextResponse.json(
        { error: 'relationType must be one of: implements, verifies, depends_on, references' },
        { status: 400 }
      );
    }

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'Cannot create relation to self' }, { status: 400 });
    }

    // 防重插入
    const existing = query(
      `SELECT id FROM semantic_relations 
       WHERE project_id = ? AND source_id = ? AND target_id = ? AND relation_type = ?`,
      [id, sourceId, targetId, relationType]
    );
    if (existing.length > 0) {
      return NextResponse.json({ id: existing[0].id, success: true, duplicate: true });
    }

    const relId = nanoid();
    run(
      `INSERT INTO semantic_relations (
        id, project_id, source_id, source_type, target_id, target_type, relation_type, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [relId, id, sourceId, sourceType, targetId, targetType, relationType, description || '', Date.now()]
    );

    // 如果是 Task implements Requirement，自动将 Task 的 requirement_id 回填
    if (relationType === 'implements' && sourceType === 'task' && targetType === 'requirement') {
      run('UPDATE tasks SET requirement_id = ? WHERE id = ?', [targetId, sourceId]);
    }

    saveDb();
    return NextResponse.json({ id: relId, success: true });
  } catch (err) {
    console.error('POST /api/projects/[id]/relations error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const relId = searchParams.get('relationId');

    if (!relId) {
      return NextResponse.json({ error: 'relationId is required' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, id, 'edit_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    run('DELETE FROM semantic_relations WHERE id = ? AND project_id = ?', [relId, id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/projects/[id]/relations error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withEnterprise(GETHandler);
export const POST = withEnterprise(POSTHandler);
export const DELETE = withEnterprise(DELETEHandler);
