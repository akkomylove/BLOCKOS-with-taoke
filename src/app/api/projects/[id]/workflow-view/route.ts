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

    const analysisRows = query(
      `SELECT * FROM workflow_analyses WHERE project_id = ? AND created_by = ? ORDER BY created_at DESC LIMIT 1`,
      [projectId, userId]
    );

    const taskRows = query(
      `SELECT t.*, wt.role as workflow_role, wt.step_number, wt.analysis_id
       FROM tasks t
       LEFT JOIN workflow_tasks wt ON wt.task_id = t.id
       WHERE t.project_id = ?
       ORDER BY wt.step_number ASC, t.order_index ASC`,
      [projectId]
    );

    let workflowRoles: string[] = [];
    let roleFlowStages: { role: string; stageGoal: string; watchPoints: string[] }[] = [];

    if (analysisRows.length > 0) {
      const analysis = analysisRows[0];
      const roles = JSON.parse(String(analysis.workflow_roles || '[]'));
      workflowRoles = Array.isArray(roles) ? roles : [];
      const roleFlow = JSON.parse(String(analysis.role_flow || 'null'));
      roleFlowStages = roleFlow?.stages || [];
    }

    const tasks = taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assignee_id,
      workflowRole: row.workflow_role,
      stepNumber: row.step_number,
      analysisId: row.analysis_id,
    }));

    const tasksByRole: Record<string, typeof tasks> = {};
    for (const role of workflowRoles) {
      tasksByRole[role] = tasks.filter((t) => t.workflowRole === role || (!t.workflowRole && roleFlowStages.find((s) => s.role === role)));
    }
    const unassigned = tasks.filter((t) => !t.workflowRole);

    return NextResponse.json({
      projectId,
      workflowRoles,
      roleFlowStages,
      tasksByRole,
      unassigned,
      hasAnalysis: analysisRows.length > 0,
    });
  } catch (error) {
    console.error('Workflow view error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow view' }, { status: 500 });
  }
}
