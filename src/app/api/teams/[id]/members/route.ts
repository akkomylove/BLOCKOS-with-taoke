import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let currentUserId: string;
    try {
      currentUserId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const { userId, role = 'member' } = await req.json();

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    await getDb();

    const membership = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [id, currentUserId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(String(membership[0].role))) return NextResponse.json({ error: '只有团队管理员可以添加成员' }, { status: 403 });
    if (!['member', 'admin'].includes(role)) return NextResponse.json({ error: '成员角色无效' }, { status: 400 });

    const targetInput = userId.trim();
    const targetUsers = query(
      'SELECT id, name, email FROM users WHERE id = ? OR lower(email) = lower(?)',
      [targetInput, targetInput]
    );

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: '未找到该用户，请核对用户 ID 或注册邮箱' }, { status: 404 });
    }

    const targetUser = targetUsers[0] as { id: string; name?: string; email: string };
    const actualTargetUserId = targetUser.id;

    const existing = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [id, actualTargetUserId]);
    if (existing.length > 0) {
      return NextResponse.json({ error: '该成员已在团队中' }, { status: 409 });
    }

    const memberId = nanoid();
    run(
      'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      [memberId, id, actualTargetUserId, role, Date.now()]
    );
    saveDb();

    return NextResponse.json({ id: memberId, userId: actualTargetUserId, user: targetUser });
  } catch (err) {
    console.error('POST /api/teams/[id]/members error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let currentUserId: string;
    try {
      currentUserId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { userId, role } = await req.json();

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const validRoles = ['owner', 'admin', 'member'];
    if (typeof role !== 'string' || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role must be one of: owner, admin, member' }, { status: 400 });
    }

    await getDb();
    const ownership = query('SELECT * FROM teams WHERE id = ? AND owner_id = ?', [id, currentUserId]);
    if (ownership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    run(
      'UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?',
      [role, id, userId]
    );
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/teams/[id]/members error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let currentUserId: string;
    try {
      currentUserId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { userId } = await req.json();

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    await getDb();
    const ownership = query('SELECT * FROM teams WHERE id = ? AND owner_id = ?', [id, currentUserId]);
    if (ownership.length === 0 && userId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userId === currentUserId) {
      const isOwner = query('SELECT * FROM teams WHERE id = ? AND owner_id = ?', [id, currentUserId]);
      if (isOwner.length > 0) {
        return NextResponse.json({ error: 'Owner cannot leave team' }, { status: 400 });
      }
    }

    run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/teams/[id]/members error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withEnterprise(POSTHandler);
export const PATCH = withEnterprise(PATCHHandler);
export const DELETE = withEnterprise(DELETEHandler);
