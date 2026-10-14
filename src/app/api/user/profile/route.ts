import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { DEMO_USERS, isDemoAdmin } from '@/lib/demo-users';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getDb();

    const demoUser = DEMO_USERS.find((u) => u.id === userId);
    const adminMembership = query(
      "SELECT role FROM project_members WHERE user_id = ? AND (role = 'admin' OR role = 'owner') LIMIT 1",
      [userId]
    );
    const teamAdminMembership = query(
      "SELECT role FROM team_members WHERE user_id = ? AND (role = 'admin' OR role = 'owner') LIMIT 1",
      [userId]
    );
    const isAdmin = Boolean(
      demoUser?.role === 'admin' ||
      isDemoAdmin(userId) ||
      adminMembership.length > 0 ||
      teamAdminMembership.length > 0
    );
    const role = isAdmin ? 'admin' : (demoUser?.role || 'employee');

    const rows = query(
      'SELECT user_id, display_name, title, functions, bio, updated_at FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        userId,
        displayName: demoUser?.name || '',
        title: demoUser?.title || '',
        functions: demoUser?.functions || [],
        bio: '',
        role,
        isAdmin,
        updatedAt: 0,
      });
    }

    const row = rows[0];
    let functions: string[] = [];
    try { functions = JSON.parse(String(row.functions)); } catch { /* ignore */ }

    return NextResponse.json({
      userId: row.user_id,
      displayName: String(row.display_name || demoUser?.name || ''),
      title: String(row.title || demoUser?.title || ''),
      functions: functions.length > 0 ? functions : (demoUser?.functions || []),
      bio: String(row.bio || ''),
      role,
      isAdmin,
      updatedAt: Number(row.updated_at),
    });
  } catch (err) {
    console.error('GET /api/user/profile error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, title, functions, bio } = body;
    await getDb();
    const now = Date.now();

    const existing = query('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      run(
        `UPDATE user_profiles SET display_name = ?, title = ?, functions = ?, bio = ?, updated_at = ? WHERE user_id = ?`,
        [displayName || null, title || null, JSON.stringify(functions || []), bio || null, now, userId]
      );
    } else {
      run(
        `INSERT INTO user_profiles (user_id, display_name, title, functions, bio, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, displayName || null, title || null, JSON.stringify(functions || []), bio || null, now]
      );
    }

    saveDb();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/user/profile error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}