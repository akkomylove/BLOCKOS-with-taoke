import { NextRequest, NextResponse } from 'next/server';
import { getDb, query, run, saveDb } from '@/lib/db';
import { getUserId } from '@/lib/auth-utils';
import { nanoid } from 'nanoid';
import type { AnalyzeResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const { projectId, documentName, documentSummary, workflowRoles, roleFlow, taskSchedule } = body;

    if (!documentName || !workflowRoles?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await getDb();
    const id = nanoid();
    const now = Date.now();

    run(
      `INSERT INTO workflow_analyses (id, project_id, document_name, document_summary, workflow_roles, role_flow, task_schedule, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId || null, documentName, documentSummary || null, JSON.stringify(workflowRoles), JSON.stringify(roleFlow || null), JSON.stringify(taskSchedule || null), now, userId]
    );
    saveDb();

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Save analysis error:', error);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    await getDb();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const sql = projectId
      ? `SELECT * FROM workflow_analyses WHERE project_id = ? AND created_by = ? ORDER BY created_at DESC`
      : `SELECT * FROM workflow_analyses WHERE created_by = ? ORDER BY created_at DESC`;
    const params = projectId ? [projectId, userId] : [userId];

    const rows = query(sql, params);
    const items = rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      documentName: row.document_name,
      documentSummary: row.document_summary,
      workflowRoles: JSON.parse(String(row.workflow_roles || '[]')),
      roleFlow: JSON.parse(String(row.role_flow || 'null')),
      taskSchedule: JSON.parse(String(row.task_schedule || 'null')),
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch analyses error:', error);
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }
}
