import { NextRequest, NextResponse } from 'next/server';
import { getDb, query, run, saveDb } from '@/lib/db';
import { getUserId } from '@/lib/auth-utils';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id: analysisId } = await params;
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    await getDb();

    const analysisRows = query(
      `SELECT * FROM workflow_analyses WHERE id = ? AND created_by = ?`,
      [analysisId, userId]
    );
    if (analysisRows.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const analysis = analysisRows[0];
    const taskSchedule = JSON.parse(String(analysis.task_schedule || '[]'));
    const roleFlow = JSON.parse(String(analysis.role_flow || 'null'));

    if (!Array.isArray(taskSchedule) || taskSchedule.length === 0) {
      return NextResponse.json({ error: 'No task schedule found' }, { status: 400 });
    }

    const stages = roleFlow?.stages || [];
    const now = Date.now();
    const createdTasks: { id: string; title: string; step: number }[] = [];

    for (let i = 0; i < taskSchedule.length; i++) {
      const item = taskSchedule[i];
      const stage = stages.find((s: { role: string }) => s.role === item.owner);
      const description = stage
        ? `${stage.stageGoal || ''}\n\n关注点：${(stage.watchPoints || []).join('、')}`
        : item.goal;

      const taskId = nanoid();
      run(
        `INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, order_index, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [taskId, projectId, item.goal, description, 'todo', item.priority || 'medium', i, now, now]
      );

      const linkId = nanoid();
      run(
        `INSERT INTO workflow_tasks (id, analysis_id, task_id, step_number, role, goal) VALUES (?, ?, ?, ?, ?, ?)`,
        [linkId, analysisId, taskId, item.step || i + 1, item.owner, item.goal]
      );

      createdTasks.push({ id: taskId, title: item.goal, step: item.step || i + 1 });
    }

    run(
      `UPDATE workflow_analyses SET project_id = ? WHERE id = ?`,
      [projectId, analysisId]
    );

    saveDb();

    return NextResponse.json({ success: true, tasks: createdTasks });
  } catch (error) {
    console.error('Create tasks from analysis error:', error);
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
  }
}
