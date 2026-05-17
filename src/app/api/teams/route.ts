import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * GET /api/teams - 获取用户所属团队列表
 * @param req - Next.js 请求对象
 * @param page - 页码 (默认 1)
 * @param limit - 每页数量 (默认 20)
 * @returns 团队列表及分页信息
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
      SELECT COUNT(*) as total FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `, [userId]);
    const total = totalResult[0]?.total || 0;

    const teams = query(`
      SELECT t.* FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    return NextResponse.json({ teams, total, page, limit });
  } catch (err) {
    console.error('GET /api/teams error:', err);
    return NextResponse.json({ error: 'Internal Server Error', teams: [] }, { status: 500 });
  }
}

/**
 * POST /api/teams - 创建新团队
 * @param req - Next.js 请求对象
 * @param name - 团队名称 (默认 '未命名团队')
 * @param description - 团队描述 (可选)
 * @param avatar - 团队头像 URL (可选)
 * @returns 创建的团队 ID
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, avatar } = await req.json();
    const id = nanoid();
    const now = Date.now();

    await getDb();
    transaction(() => {
      run(
        'INSERT INTO teams (id, name, description, avatar, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name || '未命名团队', description || null, avatar || null, userId, now, now]
      );
      run(
        'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
        [nanoid(), id, userId, 'owner', now]
      );
    });
    saveDb();

    return NextResponse.json({ id });
  } catch (err) {
    console.error('POST /api/teams error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
