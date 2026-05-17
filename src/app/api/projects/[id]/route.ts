import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [id, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const projects = query('SELECT * FROM projects WHERE id = ?', [id]);
    if (projects.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const members = query(`
      SELECT pm.*, u.name, u.email, u.avatar 
      FROM project_members pm 
      JOIN users u ON pm.user_id = u.id 
      WHERE pm.project_id = ?
    `, [id]);

    return NextResponse.json({
      project: projects[0],
      members: members.map(m => ({
        id: m.id,
        userId: m.user_id,
        projectId: m.project_id,
        role: m.role,
        joinedAt: m.joined_at,
        name: m.name,
        email: m.email,
        avatar: m.avatar
      }))
    });
  } catch (err) {
    console.error('GET /api/projects/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();
    const ownership = query('SELECT * FROM projects WHERE id = ? AND owner_id = ?', [id, userId]);
    if (ownership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: string[] = [];
    const updateParams: (string | number | null)[] = [];

    if ('name' in body) {
      updates.push('name = ?');
      updateParams.push(body.name || '未命名项目');
    }
    if ('description' in body) {
      updates.push('description = ?');
      updateParams.push(body.description || null);
    }
    if ('icon' in body) {
      updates.push('icon = ?');
      updateParams.push(body.icon || null);
    }
    if ('color' in body) {
      updates.push('color = ?');
      updateParams.push(body.color || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    updates.push('updated_at = ?');
    updateParams.push(Date.now());
    updateParams.push(id);

    run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, updateParams);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/projects/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const ownership = query('SELECT * FROM projects WHERE id = ? AND owner_id = ?', [id, userId]);
    if (ownership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    transaction(() => {
      run('DELETE FROM tasks WHERE project_id = ?', [id]);
      run('DELETE FROM milestones WHERE project_id = ?', [id]);
      run('DELETE FROM project_members WHERE project_id = ?', [id]);
      run('DELETE FROM projects WHERE id = ?', [id]);
    });
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/projects/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
