import { withDatabaseRequest } from '@/lib/database-request';
import { withEnterprise } from '@/lib/enterprise-access';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';
import { createHash } from 'node:crypto';

async function POSTHandler(
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
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid Project ID' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'create_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const { tasks = [], workflow = [], requirementId, skipDuplicates = false, requestId } = await request.json();
    if (!Array.isArray(tasks) || !tasks.length || tasks.length > 100 || tasks.some(task => !task || typeof task.title !== 'string' || !task.title.trim()) || !Array.isArray(workflow) || workflow.length > 100) {
      return NextResponse.json({ error: '请提供 1–100 条有效任务' }, { status: 400 });
    }
    if (requestId !== undefined && (typeof requestId !== 'string' || !/^[\w-]{8,100}$/.test(requestId))) return NextResponse.json({ error: '导入批次编号无效' }, { status: 400 });
    const payloadHash = createHash('sha256').update(JSON.stringify({ tasks, workflow, requirementId, skipDuplicates })).digest('hex');
    // Legacy clients also receive deduplication for identical plan content.
    const batchId = requestId || payloadHash;
    const previous = query('SELECT payload_hash, result FROM plan_imports WHERE project_id = ? AND user_id = ? AND request_id = ?', [projectId, userId, batchId])[0];
    if (previous) {
      if (previous.payload_hash !== payloadHash) return NextResponse.json({ error: '同一导入批次不能修改内容，请重新分析' }, { status: 409 });
      return NextResponse.json({ ...JSON.parse(String(previous.result)), replayed: true });
    }
    const now = Date.now();

    // 确保仅允许指派给当前项目的真实成员
    const memberRows = query(
      'SELECT user_id FROM project_members WHERE project_id = ?',
      [projectId]
    );
    const validMemberIds = new Set(memberRows.map((m) => m.user_id as string));

    // 获取项目现有任务，用于可选的去重跳过
    const existingTitles = new Set(
      query(
        'SELECT title FROM tasks WHERE project_id = ? AND (deleted_at IS NULL OR deleted_at = 0)',
        [projectId]
      ).map((t) => (t.title as string).trim().toLowerCase())
    );

    const createdTaskIds: string[] = [];
    let skippedCount = 0;
    let result: Record<string, unknown>;

    transaction(() => {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const trimmedTitle = (task.title || '').trim();

        if (skipDuplicates && existingTitles.has(trimmedTitle.toLowerCase())) {
          skippedCount++;
          continue;
        }

        const taskId = nanoid();
        const dueDate = task.estimatedDays ? now + task.estimatedDays * 86400000 : null;

        // 严格限定指派人必须在本项目成员内，否则保留为 null（待分配）
        const candidateAssignee = task.suggestedAssigneeId || task.assigneeId;
        const assigneeId = candidateAssignee && validMemberIds.has(candidateAssignee) ? candidateAssignee : null;

        const deliverablesStr = JSON.stringify(Array.isArray(task.deliverables) ? task.deliverables : []);
        const dodStr = Array.isArray(task.dod) ? task.dod.join('; ') : (task.dod || '');
        const sourceSnippet = task.sourceSnippet || null;
        const linkedReqId = task.requirementId || requirementId || null;

        run(
          `INSERT INTO tasks (
            id, project_id, parent_id, title, description, status, priority, 
            assignee_id, due_date, dod, order_index, requirement_id, 
            deliverables, source_snippet, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, 'todo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            projectId,
            trimmedTitle,
            task.description || '',
            task.priority || 'medium',
            assigneeId,
            dueDate,
            dodStr,
            i,
            linkedReqId,
            deliverablesStr,
            sourceSnippet,
            now,
            now,
          ]
        );

        createdTaskIds.push(taskId);

        // 如果有关联需求，自动在 semantic_relations 中插入 implements 关系
        if (linkedReqId) {
          run(
            `INSERT INTO semantic_relations (
              id, project_id, source_id, source_type, target_id, target_type, relation_type, description, created_at
            ) VALUES (?, ?, ?, 'task', ?, 'requirement', 'implements', 'AI 导入生成实现任务', ?)`,
            [nanoid(), projectId, taskId, linkedReqId, now]
          );
        }

        // 处理子任务
        if (task.subtasks && Array.isArray(task.subtasks)) {
          for (let j = 0; j < task.subtasks.length; j++) {
            const sub = task.subtasks[j];
            const subId = nanoid();
            run(
              `INSERT INTO tasks (
                id, project_id, parent_id, title, description, status, priority, 
                assignee_id, due_date, order_index, requirement_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, 'todo', 'medium', NULL, NULL, ?, ?, ?, ?)`,
              [subId, projectId, taskId, (sub.title || '').trim(), sub.description || '', j, linkedReqId, now, now]
            );
          }
        }
      }

      // 处理阶段里程碑
      if (workflow && Array.isArray(workflow) && workflow.length > 0) {
        for (const phase of workflow) {
          const phaseDueDate = now + (phase.estimatedDays || 7) * 86400000;
          run(
            `INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
            [nanoid(), projectId, phase.phase || phase.name || '阶段', phase.description || '', phaseDueDate, now]
          );
        }
      }
      result = { success: true, requestId: batchId, importedCount: createdTaskIds.length, skippedCount, milestoneCount: workflow.length, taskIds: createdTaskIds };
      run('INSERT INTO plan_imports (project_id, user_id, request_id, payload_hash, result, created_at) VALUES (?, ?, ?, ?, ?, ?)', [projectId, userId, batchId, payloadHash, JSON.stringify(result), now]);
    });

    saveDb();

    return NextResponse.json(result!);
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-import error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
export const GET = withDatabaseRequest(withEnterprise(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getUserId();
  const { id: projectId } = await params;
  await getDb();
  const permission = checkProjectPermission(userId, projectId, 'create_task');
  if (!permission.allowed) return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: 403 });
  const requestId = new URL(request.url).searchParams.get('requestId') || '';
  const receipt = query('SELECT result FROM plan_imports WHERE project_id = ? AND user_id = ? AND request_id = ?', [projectId, userId, requestId])[0];
  return NextResponse.json(receipt ? { found: true, ...JSON.parse(String(receipt.result)) } : { found: false });
}));
