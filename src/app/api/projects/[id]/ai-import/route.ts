import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

function findAssigneeId(suggestedFunction: string | undefined, userProfiles: Record<string, unknown>[]): string | null {
  if (!suggestedFunction) return null;
  const normalized = suggestedFunction.toLowerCase().replace(/[\s\/]/g, '');

  for (const profile of userProfiles) {
    const functionsStr = String(profile.functions || '[]');
    let functions: string[] = [];
    try { functions = JSON.parse(functionsStr); } catch { /* ignore */ }

    for (const fn of functions) {
      const fnNormalized = fn.toLowerCase().replace(/[\s\/]/g, '');
      if (normalized.includes(fnNormalized) || fnNormalized.includes(normalized)) {
        return String(profile.user_id);
      }
    }

    const title = String(profile.title || '');
    const titleNormalized = title.toLowerCase().replace(/[\s\/]/g, '');
    if (normalized.includes(titleNormalized) || titleNormalized.includes(normalized)) {
      return String(profile.user_id);
    }
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { tasks, workflow } = await request.json();
    await getDb();
    const now = Date.now();

    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const userProfiles = query('SELECT user_id, title, functions FROM user_profiles');
    const createdTaskIds: Record<string, string> = {};

    transaction(() => {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskId = nanoid();
        const dueDate = task.estimatedDays ? now + task.estimatedDays * 86400000 : null;
        const assigneeId = findAssigneeId(task.suggestedAssigneeFunction, userProfiles);
        run(
          `INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, due_date, order_index, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`,
          [taskId, projectId, task.title, task.description || '', task.priority || 'medium', assigneeId, dueDate, i, now, now]
        );
        createdTaskIds[task.title] = taskId;

        if (task.subtasks && Array.isArray(task.subtasks)) {
          for (let j = 0; j < task.subtasks.length; j++) {
            const sub = task.subtasks[j];
            const subId = nanoid();
            run(
              `INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, due_date, order_index, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'todo', 'medium', NULL, NULL, ?, ?, ?)`,
              [subId, projectId, taskId, sub.title, sub.description || '', j, now, now]
            );
          }
        }
      }

      if (workflow && Array.isArray(workflow) && workflow.length > 0) {
        for (const phase of workflow) {
          const phaseDueDate = now + (phase.estimatedDays || 7) * 86400000;
          run(
            `INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
            [nanoid(), projectId, phase.phase, phase.description || '', phaseDueDate, now]
          );
        }
      }
    });

    saveDb();

    return NextResponse.json({
      success: true,
      taskCount: tasks.length,
      milestoneCount: workflow?.length || 0,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-import error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}