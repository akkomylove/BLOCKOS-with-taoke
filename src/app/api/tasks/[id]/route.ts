import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

function normalizeTask(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    startDate: row.start_date,
    dueDate: row.due_date,
    dod: row.dod,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeName: row.assignee_name,
    assigneeEmail: row.assignee_email,
    assigneeAvatar: row.assignee_avatar,
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

    const tasks = query(`
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email, u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [id]);

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = tasks[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, userId as string]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const subtasks = query(`
      SELECT st.*, 
        u.name as assignee_name, u.email as assignee_email, u.avatar as assignee_avatar
      FROM tasks st
      LEFT JOIN users u ON st.assignee_id = u.id
      WHERE st.parent_id = ?
      ORDER BY st.order_index ASC, st.created_at DESC
    `, [id]);

    return NextResponse.json({ task: normalizeTask(task), subtasks: subtasks.map(normalizeTask) });
  } catch (err) {
    console.error('GET /api/tasks/[id] error:', err);
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
    const { title, description, status, priority, assigneeId, startDate, dueDate, dod, orderIndex, parentId } = body;

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();
    const tasks = query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = tasks[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, userId as string]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    if ('parentId' in body && parentId !== task.parent_id) {
      const parentTask = query('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [parentId, task.project_id]);
      if (parentTask.length === 0) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
      if (parentId === id) {
        return NextResponse.json({ error: 'Cannot set self as parent' }, { status: 400 });
      }

      const visited = new Set<string>();
      visited.add(id);
      let currentParentId: string | null = parentId;
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 });
        }
        visited.add(currentParentId);
        const parentCheck = query('SELECT * FROM tasks WHERE id = ?', [currentParentId]);
        if (parentCheck.length === 0) {
          break;
        }
        currentParentId = parentCheck[0].parent_id as string | null;
      }
    }

    const updates: string[] = [];
    const updateParams: (string | number | null)[] = [];

    if ('title' in body) {
      updates.push('title = ?');
      updateParams.push(title);
    }
    if ('description' in body) {
      updates.push('description = ?');
      updateParams.push(description);
    }
    if ('status' in body) {
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
      if (typeof status !== 'string' || !validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Status must be one of: todo, in_progress, review, done' }, { status: 400 });
      }
      updates.push('status = ?');
      updateParams.push(status);
    }
    if ('priority' in body) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (typeof priority !== 'string' || !validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Priority must be one of: low, medium, high, urgent' }, { status: 400 });
      }
      updates.push('priority = ?');
      updateParams.push(priority);
    }
    if ('assigneeId' in body) {
      if (assigneeId !== null) {
        const memberCheck = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, assigneeId]);
        if (memberCheck.length === 0) {
          return NextResponse.json({ error: 'Assignee must be a project member' }, { status: 400 });
        }
      }
      updates.push('assignee_id = ?');
      updateParams.push(assigneeId);
    }
    if ('startDate' in body) {
      updates.push('start_date = ?');
      updateParams.push(startDate);
    }
    if ('dueDate' in body) {
      updates.push('due_date = ?');
      updateParams.push(dueDate);
    }
    if ('dod' in body) {
      updates.push('dod = ?');
      updateParams.push(dod);
    }
    if ('orderIndex' in body) {
      updates.push('order_index = ?');
      updateParams.push(orderIndex);
    }
    if ('parentId' in body) {
      updates.push('parent_id = ?');
      updateParams.push(parentId);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    updates.push('updated_at = ?');
    updateParams.push(Date.now());
    updateParams.push(id);

    run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, updateParams);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/tasks/[id] error:', err);
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

    const tasks = query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = tasks[0];
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id as string, userId as string]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    run('DELETE FROM tasks WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tasks/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
