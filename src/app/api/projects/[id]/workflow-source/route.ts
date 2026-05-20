import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/lib/db';
import { getUserId } from '@/lib/auth-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id: projectId } = await params;
    await getDb();

    const projectRows = query(
      `SELECT id FROM projects WHERE id = ?`,
      [projectId]
    );
    if (projectRows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taskRows = query(
      `SELECT title, description, status, priority, assignee_id FROM tasks WHERE project_id = ? ORDER BY order_index ASC`,
      [projectId]
    );

    const milestoneRows = query(
      `SELECT name, description, status, due_date FROM milestones WHERE project_id = ? ORDER BY due_date ASC`,
      [projectId]
    );

    const memberRows = query(
      `SELECT u.id, u.name, up.functions
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE pm.project_id = ?`,
      [projectId]
    );

    const tasks = taskRows.map((row) => ({
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assignee_id,
    }));

    const milestones = milestoneRows.map((row) => ({
      name: row.name,
      description: row.description,
      status: row.status,
      dueDate: row.due_date,
    }));

    const members = memberRows.map((row) => ({
      id: row.id,
      name: row.name,
      functions: row.functions ? JSON.parse(String(row.functions)) : [],
    }));

    const inferredRoles = Array.from(new Set(
      members.flatMap((m) => m.functions || [])
    ));

    return NextResponse.json({
      projectId,
      tasks,
      milestones,
      members,
      inferredRoles,
    });
  } catch (error) {
    console.error('Workflow source error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow source' }, { status: 500 });
  }
}
