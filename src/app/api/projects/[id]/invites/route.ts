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
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();
    const invites = query(
      `SELECT pi.*, u.name as inviter_name 
       FROM project_invites pi
       LEFT JOIN users u ON pi.inviter_id = u.id
       WHERE pi.project_id = ? AND pi.expires_at > ?
       ORDER BY pi.created_at DESC`,
      [projectId, now]
    );

    return NextResponse.json({
      invites: invites.map((inv) => ({
        id: inv.id,
        projectId: inv.project_id,
        code: inv.code,
        role: inv.role,
        inviterName: inv.inviter_name,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/invites error:', err);
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
    const perm = checkProjectPermission(userId, projectId, 'manage_members');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden: Insufficient permissions to invite' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { role = 'member', expiresInDays = 7 } = body;

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role must be admin, member, or viewer' }, { status: 400 });
    }

    const inviteId = nanoid();
    const code = nanoid(10);
    const now = Date.now();
    const expiresAt = now + Math.max(1, expiresInDays) * 86400000;

    run(
      `INSERT INTO project_invites (id, project_id, inviter_id, code, role, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inviteId, projectId, userId, code, role, expiresAt, now]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      invite: {
        id: inviteId,
        projectId,
        code,
        role,
        expiresAt,
        inviteUrl: `/invite/${code}`,
      },
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/invites error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(withEnterprise(GETHandler));
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
