import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

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
    depth: row.depth,
  };
}

/**
 * GET /api/tasks - 获取任务列表
 * @param req - Next.js 请求对象
 * @param projectId - 项目 ID (必填)
 * @param parentId - 父任务 ID (可选)
 * @param page - 页码 (默认 1)
 * @param limit - 每页数量 (默认 20)
 * @param includeSubtasks - 是否包含子任务 (默认 false)
 * @returns 任务列表及分页信息
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const parentId = searchParams.get('parentId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const includeSubtasks = searchParams.get('includeSubtasks') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    await getDb();
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    if (includeSubtasks) {
      const allTasks = query(`
        WITH RECURSIVE subtask_tree AS (
          SELECT t.*, 0 as depth FROM tasks t WHERE t.project_id = ? AND t.parent_id IS NULL
          UNION ALL
          SELECT t.*, st.depth + 1 FROM tasks t
          INNER JOIN subtask_tree st ON t.parent_id = st.id
        )
        SELECT subtask_tree.*, 
          u.name as assignee_name, u.email as assignee_email, u.avatar as assignee_avatar
        FROM subtask_tree
        LEFT JOIN users u ON subtask_tree.assignee_id = u.id
        ORDER BY subtask_tree.depth ASC, subtask_tree.order_index ASC, subtask_tree.created_at DESC
      `, [projectId]);
      return NextResponse.json({ tasks: allTasks.map(normalizeTask), total: allTasks.length, page: 1, limit: allTasks.length });
    }

    let countSql = `SELECT COUNT(*) as total FROM tasks t WHERE t.project_id = ?`;
    const countParams: (string | number | null)[] = [projectId];

    if (parentId) {
      countSql += ' AND t.parent_id = ?';
      countParams.push(parentId);
    } else {
      countSql += ' AND t.parent_id IS NULL';
    }

    const totalResult = query(countSql, countParams);
    const total = totalResult[0]?.total || 0;

    let sql = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email, u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = ?
    `;
    const params: (string | number | null)[] = [projectId];

    if (parentId) {
      sql += ' AND t.parent_id = ?';
      params.push(parentId);
    } else {
      sql += ' AND t.parent_id IS NULL';
    }

    sql += ' ORDER BY t.order_index ASC, t.created_at DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tasks = query(sql, params);
    return NextResponse.json({ tasks: tasks.map(normalizeTask), total, page, limit });
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Internal Server Error', tasks: [] }, { status: 500 });
  }
}

/**
 * POST /api/tasks - 创建新任务
 * @param req - Next.js 请求对象，包含任务信息
 * @param projectId - 项目 ID (必填)
 * @param title - 任务标题 (必填，最大 500 字符)
 * @param parentId - 父任务 ID (可选)
 * @param description - 任务描述 (可选)
 * @param status - 任务状态 (默认 "todo")
 * @param priority - 优先级 (默认 "medium")
 * @param assigneeId - 负责人 ID (可选)
 * @param dueDate - 截止日期 (可选，时间戳)
 * @param dod - 完成定义 (可选)
 * @param orderIndex - 排序索引 (默认 0)
 * @returns 创建的任务 ID
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, parentId, title, description, status, priority, assigneeId, startDate, dueDate, dod, orderIndex } = await req.json();

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Project ID and title required' }, { status: 400 });
    }

    if (typeof title !== 'string' || title.length > 500 || !title.trim()) {
      return NextResponse.json({ error: 'Title must be a non-empty string with maximum 500 characters' }, { status: 400 });
    }

    await getDb();
    const membership = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    if (parentId) {
      const parentTask = query('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [parentId, projectId]);
      if (parentTask.length === 0) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
    }

    const id = nanoid();
    const now = Date.now();
    const trimmedTitle = title.trim();

    run(
      'INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, start_date, due_date, dod, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, projectId, parentId || null, trimmedTitle, description || null, status || 'todo', priority || 'medium', assigneeId || null, startDate || null, dueDate || null, dod || null, orderIndex || 0, now, now]
    );
    saveDb();

    return NextResponse.json({ id });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
