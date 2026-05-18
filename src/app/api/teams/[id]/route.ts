import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const membership = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [id, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const teams = query('SELECT * FROM teams WHERE id = ?', [id]);
    if (teams.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const members = query(`
      SELECT tm.*, u.name, u.email, u.avatar,
        up.title, up.functions
      FROM team_members tm 
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN user_profiles up ON tm.user_id = up.user_id
      WHERE tm.team_id = ?
    `, [id]);

    return NextResponse.json({
      team: teams[0],
      members: members.map(m => ({
        id: m.id,
        userId: m.user_id,
        teamId: m.team_id,
        role: m.role,
        joinedAt: m.joined_at,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        title: m.title || '',
        functions: parseJsonArray(m.functions),
      }))
    });
  } catch (err) {
    console.error('GET /api/teams/[id] error:', err);
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
    const ownership = query('SELECT * FROM teams WHERE id = ? AND owner_id = ?', [id, userId]);
    if (ownership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: string[] = [];
    const updateParams: (string | number | null)[] = [];

    if ('name' in body) {
      updates.push('name = ?');
      updateParams.push(body.name || '未命名团队');
    }
    if ('description' in body) {
      updates.push('description = ?');
      updateParams.push(body.description || null);
    }
    if ('avatar' in body) {
      updates.push('avatar = ?');
      updateParams.push(body.avatar || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    updates.push('updated_at = ?');
    updateParams.push(Date.now());
    updateParams.push(id);

    run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, updateParams);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/teams/[id] error:', err);
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
    const ownership = query('SELECT * FROM teams WHERE id = ? AND owner_id = ?', [id, userId]);
    if (ownership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projects = query('SELECT id FROM projects WHERE team_id = ?', [id]) as Array<{ id: string }>;
    transaction(() => {
      for (const project of projects) {
        run('DELETE FROM tasks WHERE project_id = ?', [project.id]);
        run('DELETE FROM milestones WHERE project_id = ?', [project.id]);
        run('DELETE FROM project_members WHERE project_id = ?', [project.id]);
      }
      run('DELETE FROM projects WHERE team_id = ?', [id]);
      run('DELETE FROM team_members WHERE team_id = ?', [id]);
      run('DELETE FROM teams WHERE id = ?', [id]);
    });
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/teams/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
