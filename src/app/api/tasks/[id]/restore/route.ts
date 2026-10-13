import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [
      task.project_id as string,
      userId as string,
    ]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = (membership[0].role as string) || 'member';
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Read-only members cannot restore tasks' }, { status: 403 });
    }

    run('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?', [Date.now(), id]);
    saveDb();

    return NextResponse.json({ success: true, restored: true });
  } catch (err) {
    console.error('POST /api/tasks/[id]/restore error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
