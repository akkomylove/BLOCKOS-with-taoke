import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const userExists = query('SELECT * FROM users WHERE id = ?', [userId]);
    if (userExists.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const membership = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [id, currentUserId]);
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [id, userId]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Member already exists' }, { status: 400 });
    }

    const memberId = nanoid();
    run(
      'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      [memberId, id, userId, role, Date.now()]
    );
    saveDb();

    return NextResponse.json({ id: memberId });
  } catch (err) {
    console.error('POST /api/teams/[id]/members error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
