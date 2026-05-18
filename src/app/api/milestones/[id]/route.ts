import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

function normalizeMilestone(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
  };
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
    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();

    const milestones = query('SELECT * FROM milestones WHERE id = ?', [id]);
    if (milestones.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const milestone = milestones[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [milestone.project_id as string, userId as string]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    return NextResponse.json({ milestone: normalizeMilestone(milestone) });
  } catch (err) {
    console.error('GET /api/milestones/[id] error:', err);
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
    const { name, description, dueDate, status } = await req.json();

    await getDb();
    const milestones = query('SELECT * FROM milestones WHERE id = ?', [id]);
    if (milestones.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (typeof status !== 'string' || !validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Status must be one of: pending, in_progress, completed' }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const updateParams: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      updateParams.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      updateParams.push(description);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      updateParams.push(dueDate);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      updateParams.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    const milestone = milestones[0];
    const project = query('SELECT p.*, t.owner_id as team_owner_id FROM projects p JOIN teams t ON p.team_id = t.id WHERE p.id = ?', [milestone.project_id as string]);
    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const isProjectOwner = project[0].owner_id === userId;
    const isTeamOwner = project[0].team_owner_id === userId;
    if (!isProjectOwner && !isTeamOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    updateParams.push(id);

    run(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`, updateParams);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/milestones/[id] error:', err);
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

    const milestones = query('SELECT * FROM milestones WHERE id = ?', [id]);
    if (milestones.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const milestone = milestones[0];
    const project = query('SELECT p.*, t.owner_id as team_owner_id FROM projects p JOIN teams t ON p.team_id = t.id WHERE p.id = ?', [milestone.project_id as string]);
    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const isProjectOwner = project[0].owner_id === userId;
    const isTeamOwner = project[0].team_owner_id === userId;
    if (!isProjectOwner && !isTeamOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    run('DELETE FROM milestones WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/milestones/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
