import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
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

    const tasks = query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = tasks[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const comments = query(`
      SELECT tc.*, 
        u.name as author_name, u.email as author_email, u.avatar as author_avatar
      FROM task_comments tc
      JOIN users u ON tc.author_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [id]);

    return NextResponse.json({ comments });
  } catch (err) {
    console.error('GET /api/tasks/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal Server Error', comments: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content, mentions } = await req.json();

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    await getDb();
    const tasks = query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = tasks[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const commentId = nanoid();
    const now = Date.now();

    run(
      'INSERT INTO task_comments (id, task_id, author_id, content, mentions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [commentId, id, userId, content, JSON.stringify(mentions || []), now, now]
    );
    saveDb();

    return NextResponse.json({ id: commentId });
  } catch (err) {
    console.error('POST /api/tasks/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
