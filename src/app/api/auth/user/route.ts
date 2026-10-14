import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';
import { DEMO_USERS, isDemoAdmin } from '@/lib/demo-users';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getDb();
    const users = query('SELECT id, email, name, avatar FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    return NextResponse.json({
      ...users[0],
      role,
      isAdmin,
    });
  } catch (err) {
    console.error('Get user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

