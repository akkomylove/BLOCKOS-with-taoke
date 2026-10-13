import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';
import { nanoid } from 'nanoid';
import type { AIModificationChange } from '../route';

type DbRecord = Record<string, string | number | null>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; previewId: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, previewId } = await params;
    if (!isValidNanoid(projectId) || !isValidNanoid(previewId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'edit_task');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const previewRows = query(
      'SELECT * FROM ai_modifications WHERE id = ? AND project_id = ?',
      [previewId, projectId]
    );
    if (previewRows.length === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    const preview = previewRows[0];
    const changes: AIModificationChange[] = JSON.parse((preview.changes as string) || '[]');
    const body = await req.json();
    const { action, itemIndexes } = body; // action: 'apply' | 'revert' | 'reject'

    if (!['apply', 'revert', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be apply, revert, or reject' }, { status: 400 });
    }

    const now = Date.now();

    if (action === 'reject') {
      run('UPDATE ai_modifications SET status = "rejected", updated_at = ? WHERE id = ?', [now, previewId]);
      saveDb();
      return NextResponse.json({ success: true, status: 'rejected', message: '已拒绝并丢弃 AI 修改建议' });
    }

    if (action === 'apply') {
      if (preview.status === 'accepted') {
        return NextResponse.json({ error: 'This modification has already been applied' }, { status: 400 });
      }

      const indicesToApply = Array.isArray(itemIndexes) && itemIndexes.length > 0
        ? itemIndexes
        : changes.map((_, i) => i);

      transaction(() => {
        for (const idx of indicesToApply) {
          const ch = changes[idx];
          if (!ch) continue;

          if (ch.entityType === 'task') {
            if (ch.action === 'create') {
              const taskId = ch.entityId || nanoid();
              ch.entityId = taskId;
              run(
                `INSERT INTO tasks (id, project_id, title, description, status, priority, order_index, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  taskId,
                  projectId,
                  String(ch.after.title || '新任务'),
                  String(ch.after.description || ''),
                  String(ch.after.status || 'todo'),
                  String(ch.after.priority || 'medium'),
                  Number(ch.after.orderIndex || 0),
                  now,
                  now,
                ]
              );
            } else if (ch.action === 'update' && ch.entityId) {
              const currentTask = query('SELECT * FROM tasks WHERE id = ?', [ch.entityId]);
              if (currentTask.length > 0) {
                const taskRow = currentTask[0] as unknown as DbRecord;
                ch.before = taskRow;
                const newTitle = String(ch.after?.title !== undefined ? ch.after.title : taskRow.title);
                const newDesc = String(ch.after?.description !== undefined ? ch.after.description : (taskRow.description || ''));
                const newStatus = String(ch.after?.status !== undefined ? ch.after.status : taskRow.status);
                run(
                  'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?',
                  [newTitle, newDesc, newStatus, now, ch.entityId]
                );
              }
            } else if (ch.action === 'delete' && ch.entityId) {
              const currentTask = query('SELECT * FROM tasks WHERE id = ?', [ch.entityId]);
              if (currentTask.length > 0) {
                ch.before = currentTask[0];
                run('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, ch.entityId]);
              }
            }
          } else if (ch.entityType === 'block') {
            if (ch.action === 'create') {
              const blockId = ch.entityId || nanoid();
              ch.entityId = blockId;
              run(
                `INSERT INTO blocks (id, page_id, type, title, content, meta, order_index, x, y, width, height, collapsed, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
                [
                  blockId,
                  String(ch.after.pageId || 'default-page'),
                  String(ch.after.type || 'text'),
                  String(ch.after.title || ''),
                  String(ch.after.content || ''),
                  JSON.stringify(ch.after.meta || {}),
                  Number(ch.after.orderIndex || 0),
                  Number(ch.after.x || 0),
                  Number(ch.after.y || 0),
                  Number(ch.after.width || 320),
                  Number(ch.after.height || 200),
                  now,
                  now,
                ]
              );
            } else if (ch.action === 'update' && ch.entityId) {
              const currentBlock = query('SELECT * FROM blocks WHERE id = ?', [ch.entityId]);
              if (currentBlock.length > 0) {
                const blockRow = currentBlock[0] as unknown as DbRecord;
                ch.before = blockRow;
                const newContent = String(ch.after?.content !== undefined ? ch.after.content : (blockRow.content || ''));
                const newTitle = String(ch.after?.title !== undefined ? ch.after.title : (blockRow.title || ''));
                run(
                  'UPDATE blocks SET title = ?, content = ?, updated_at = ? WHERE id = ?',
                  [newTitle, newContent, now, ch.entityId]
                );
              }
            } else if (ch.action === 'delete' && ch.entityId) {
              const currentBlock = query('SELECT * FROM blocks WHERE id = ?', [ch.entityId]);
              if (currentBlock.length > 0) {
                ch.before = currentBlock[0];
                run('DELETE FROM blocks WHERE id = ?', [ch.entityId]);
              }
            }
          }
        }

        run(
          'UPDATE ai_modifications SET status = "accepted", changes = ?, applied_at = ? WHERE id = ?',
          [JSON.stringify(changes), now, previewId]
        );
      });

      saveDb();
      return NextResponse.json({
        success: true,
        status: 'accepted',
        appliedCount: indicesToApply.length,
        message: '已成功应用 AI 修改并沉淀版本快照，支持随时一键回滚',
      });
    }

    if (action === 'revert') {
      if (preview.status !== 'accepted') {
        return NextResponse.json({ error: 'Only accepted modifications can be reverted' }, { status: 400 });
      }

      transaction(() => {
        // 反向操作：按相反顺序回滚所有项
        for (let i = changes.length - 1; i >= 0; i--) {
          const ch = changes[i];
          if (!ch) continue;

          if (ch.entityType === 'task') {
            if (ch.action === 'create' && ch.entityId) {
              run('DELETE FROM tasks WHERE id = ?', [ch.entityId]);
            } else if (ch.action === 'update' && ch.entityId && ch.before) {
              const b = ch.before as unknown as DbRecord;
              run(
                'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?',
                [b.title, b.description, b.status, now, ch.entityId]
              );
            } else if (ch.action === 'delete' && ch.entityId && ch.before) {
              run('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, ch.entityId]);
            }
          } else if (ch.entityType === 'block') {
            if (ch.action === 'create' && ch.entityId) {
              run('DELETE FROM blocks WHERE id = ?', [ch.entityId]);
            } else if (ch.action === 'update' && ch.entityId && ch.before) {
              const b = ch.before as unknown as DbRecord;
              run(
                'UPDATE blocks SET title = ?, content = ?, updated_at = ? WHERE id = ?',
                [b.title, b.content, now, ch.entityId]
              );
            } else if (ch.action === 'delete' && ch.entityId && ch.before) {
              const b = ch.before as unknown as DbRecord;
              run(
                `INSERT OR REPLACE INTO blocks (id, page_id, type, title, content, meta, order_index, x, y, width, height, collapsed, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  ch.entityId,
                  b.page_id,
                  b.type,
                  b.title,
                  b.content,
                  b.meta,
                  b.order_index,
                  b.x,
                  b.y,
                  b.width,
                  b.height,
                  b.collapsed,
                  b.created_at,
                  now,
                ]
              );
            }
          }
        }

        run('UPDATE ai_modifications SET status = "reverted" WHERE id = ?', [previewId]);
      });

      saveDb();
      return NextResponse.json({
        success: true,
        status: 'reverted',
        message: '已成功执行一键回滚，全部数据已完整还原至 AI 修改前状态',
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-preview/[previewId] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
