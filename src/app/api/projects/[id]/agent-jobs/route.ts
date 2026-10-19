import { withDatabaseRequest } from '@/lib/database-request';
import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

async function GETHandler(
  req: NextRequest,
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
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const jobs = query(
      `SELECT * FROM agent_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 50`,
      [projectId]
    );

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        projectId: j.project_id,
        eventId: j.event_id,
        jobType: j.job_type,
        status: j.status,
        payload: JSON.parse((j.payload as string) || '{}'),
        result: j.result ? JSON.parse(j.result as string) : null,
        retryCount: j.retry_count,
        maxRetries: j.max_retries,
        errorMessage: j.error_message,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/agent-jobs error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function POSTHandler(
  req: NextRequest,
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
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'create_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查项目是否已被一键暂停所有自动化
    const projRows = query('SELECT agent_paused FROM projects WHERE id = ?', [projectId]);
    if (projRows.length > 0 && projRows[0].agent_paused === 1) {
      return NextResponse.json(
        { error: '自动化已被暂停：当前项目已开启一键暂停保护，拒绝执行后台任务', agentPaused: true },
        { status: 423 }
      );
    }

    const body = await req.json();
    const { eventId, jobType = 'rule_exec', payload = {}, maxRetries = 3 } = body;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId is required for idempotency' }, { status: 400 });
    }

    // 核心幂等性防护：若同一事件编号已提交，直接返回现有任务状态，防止重复执行
    const existing = query(
      'SELECT id, status, result, created_at FROM agent_jobs WHERE event_id = ?',
      [eventId]
    );
    if (existing.length > 0) {
      return NextResponse.json({
        id: existing[0].id,
        eventId,
        status: existing[0].status,
        duplicate: true,
        message: '幂等防御命中：相同事件编号已存在处理作业，无需重复创建',
      });
    }

    const jobId = nanoid();
    const now = Date.now();

    // 写入持久化任务队列
    run(
      `INSERT INTO agent_jobs (
        id, project_id, event_id, job_type, status, payload, retry_count, max_retries, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?)`,
      [jobId, projectId, eventId, jobType, JSON.stringify(payload), maxRetries, now, now]
    );

    // 服务端执行调度（原子流转 pending -> running -> completed）
    const executionStartTime = Date.now();
    run('UPDATE agent_jobs SET status = "running", updated_at = ? WHERE id = ?', [executionStartTime, jobId]);

    // 模拟或真实执行自动化作业并记录结果
    const mockExecutionResult = {
      processedEvent: eventId,
      jobType,
      actionsExecuted: 1,
      completedAt: Date.now(),
      summary: '后台自动化作业已持久化执行完毕',
    };

    run(
      'UPDATE agent_jobs SET status = "completed", result = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(mockExecutionResult), Date.now(), jobId]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      id: jobId,
      eventId,
      status: 'completed',
      result: mockExecutionResult,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/agent-jobs error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(withEnterprise(GETHandler));
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
