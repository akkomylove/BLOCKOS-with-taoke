import { getUserId } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getDb();
    const summaries = query(`
      SELECT
        p.id as project_id,
        p.name as project_name,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.assignee_id = ?
      GROUP BY p.id
      ORDER BY p.name
    `, [userId]);

    const result = [];
    for (const s of summaries) {
      const tasks = query(`
        SELECT id, project_id, parent_id, title, description, status, priority, assignee_id, due_date, dod, order_index, created_at, updated_at
        FROM tasks
        WHERE project_id = ? AND assignee_id = ?
        ORDER BY order_index, created_at
      `, [String(s.project_id), userId]);

      result.push({
        projectId: s.project_id,
        projectName: s.project_name,
        totalTasks: Number(s.total_tasks),
        completedTasks: Number(s.completed_tasks),
        tasks: tasks.map(t => ({
          id: t.id,
          projectId: t.project_id,
          parentId: t.parent_id || undefined,
          title: String(t.title),
          description: t.description ? String(t.description) : undefined,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assignee_id || undefined,
          startDate: t.start_date ? Number(t.start_date) : undefined,
          dueDate: t.due_date ? Number(t.due_date) : undefined,
          dod: t.dod ? String(t.dod) : undefined,
          orderIndex: Number(t.order_index),
          createdAt: Number(t.created_at),
          updatedAt: Number(t.updated_at),
        })),
      });
    }

    return NextResponse.json({ summaries: result });
  } catch (err) {
    console.error('GET /api/user/tasks error:', err);
    return NextResponse.json({ error: 'Internal Server Error', summaries: [] }, { status: 500 });
  }
}