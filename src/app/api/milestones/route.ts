import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    await getDb();
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const milestones = query(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );

    return NextResponse.json({ milestones });
  } catch (err) {
    console.error('GET /api/milestones error:', err);
    return NextResponse.json({ error: 'Internal Server Error', milestones: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, name, description, dueDate, status } = await req.json();

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name required' }, { status: 400 });
    }

    await getDb();
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const id = nanoid();
    const now = Date.now();

    run(
      'INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, projectId, name, description || null, dueDate || null, status || 'pending', now]
    );
    saveDb();

    return NextResponse.json({ id });
  } catch (err) {
    console.error('POST /api/milestones error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
