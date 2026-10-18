import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

async function GETHandler(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    await getDb();
    const now = Date.now();
    const invites = query(
      `SELECT pi.*, p.name as project_name, p.description as project_description, u.name as inviter_name
       FROM project_invites pi
       INNER JOIN projects p ON pi.project_id = p.id
       LEFT JOIN users u ON pi.inviter_id = u.id
       WHERE pi.code = ?`,
      [code]
    );

    if (invites.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const inv = invites[0];
    const isExpired = now > (inv.expires_at as number);

    return NextResponse.json({
      code: inv.code,
      projectId: inv.project_id,
      projectName: inv.project_name,
      projectDescription: inv.project_description,
      inviterName: inv.inviter_name,
      role: inv.role,
      expiresAt: inv.expires_at,
      isExpired,
    });
  } catch (err) {
    console.error('GET /api/invites/[code] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function POSTHandler(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    await getDb();
    const now = Date.now();
    const invites = query(
      `SELECT * FROM project_invites WHERE code = ?`,
      [code]
    );

    if (invites.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const inv = invites[0];
    if (now > (inv.expires_at as number)) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 410 });
    }

    const projectId = inv.project_id as string;
    const role = (inv.role as string) || 'member';

    // 检查是否已经是该项目成员
    const existingMember = query(
      `SELECT * FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, userId]
    );

    if (existingMember.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        projectId,
        role: existingMember[0].role,
        message: '您已经是该项目成员',
      });
    }

    // 加入项目成员
    run(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)`,
      [nanoid(), projectId, userId, role, now]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      joined: true,
      projectId,
      role,
      message: '成功加入项目',
    });
  } catch (err) {
    console.error('POST /api/invites/[code] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withEnterprise(GETHandler);
export const POST = withEnterprise(POSTHandler);
