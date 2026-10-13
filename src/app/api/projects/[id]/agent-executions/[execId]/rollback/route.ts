import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, execId } = await params;
    if (!isValidNanoid(projectId) || !isValidNanoid(execId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'edit_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const execRows = query(
      'SELECT * FROM agent_executions WHERE id = ? AND project_id = ?',
      [execId, projectId]
    );
    if (execRows.length === 0) {
      return NextResponse.json({ error: 'Execution record not found' }, { status: 404 });
    }

    const record = execRows[0];
    if (record.reverted_at) {
      return NextResponse.json({ error: 'This execution has already been rolled back' }, { status: 400 });
    }

    const affectedEntities = JSON.parse((record.affected_entities as string) || '[]');
    const inputSnapshot = JSON.parse((record.input_snapshot as string) || '{}');
    const now = Date.now();

    transaction(() => {
      // 遍历所有受影响的实体进行逆向还原
      for (const entity of affectedEntities) {
        if (entity.type === 'task') {
          if (entity.action === 'create' && entity.id) {
            run('DELETE FROM tasks WHERE id = ?', [entity.id]);
          } else if (entity.action === 'update' && entity.id) {
            const before = inputSnapshot.tasks?.[entity.id];
            if (before) {
              run(
                'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = ? WHERE id = ?',
                [before.title, before.description, before.status, before.priority, now, entity.id]
              );
            }
          }
        } else if (entity.type === 'block') {
          if (entity.action === 'create' && entity.id) {
            run('DELETE FROM blocks WHERE id = ?', [entity.id]);
          } else if (entity.action === 'update' && entity.id) {
            const before = inputSnapshot.blocks?.[entity.id];
            if (before) {
              run(
                'UPDATE blocks SET title = ?, content = ?, updated_at = ? WHERE id = ?',
                [before.title, before.content, now, entity.id]
              );
            }
          }
        }
      }

      run('UPDATE agent_executions SET reverted_at = ?, status = "reverted" WHERE id = ?', [now, execId]);
    });

    saveDb();

    return NextResponse.json({
      success: true,
      rolledBackCount: affectedEntities.length,
      message: '已成功执行一键回滚，Agent 产生的变更已全量恢复',
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/agent-executions/[execId]/rollback error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
