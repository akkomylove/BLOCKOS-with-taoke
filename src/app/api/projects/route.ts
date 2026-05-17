import { NextRequest, NextResponse } from 'next/server';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getUserId } from '@/lib/auth-utils';

/**
 * GET /api/projects - 获取用户所属项目列表
 * @param req - Next.js 请求对象
 * @param page - 页码 (默认 1)
 * @param limit - 每页数量 (默认 20)
 * @returns 项目列表及分页信息
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    await getDb();
    const totalResult = query(`
      SELECT COUNT(*) as total FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
    `, [userId]);
    const total = totalResult[0]?.total || 0;

    const projects = query(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    return NextResponse.json({ projects, total, page, limit });
  } catch (err) {
    console.error('GET /api/projects error:', err);
    return NextResponse.json({ error: 'Internal Server Error', projects: [] }, { status: 500 });
  }
}

/**
 * POST /api/projects - 创建新项目
 * @param req - Next.js 请求对象
 * @param teamId - 团队 ID (必填)
 * @param name - 项目名称 (默认 '未命名项目')
 * @param description - 项目描述 (可选)
 * @param icon - 项目图标 (可选)
 * @param color - 项目颜色 (可选)
 * @returns 创建的项目 ID
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, icon, color, teamId } = await req.json();

    if (typeof teamId !== 'string' || !teamId) {
      return NextResponse.json({ error: 'Valid teamId is required' }, { status: 400 });
    }

    const id = nanoid();
    const now = Date.now();

    await getDb();
    
    const teamMembership = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
    if (teamMembership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    transaction(() => {
      run(
        'INSERT INTO projects (id, team_id, name, description, icon, color, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, teamId, name || '未命名项目', description || null, icon || null, color || null, userId, now, now]
      );
      run(
        'INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
        [nanoid(), id, userId, 'owner', now]
      );
    });
    saveDb();

    return NextResponse.json({ id });
  } catch (err) {
    console.error('POST /api/projects error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
