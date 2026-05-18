import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
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
    const rows = query(
      'SELECT user_id, display_name, title, functions, bio, updated_at FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        userId,
        displayName: '',
        title: '',
        functions: [],
        bio: '',
        updatedAt: 0,
      });
    }

    const row = rows[0];
    let functions: string[] = [];
    try { functions = JSON.parse(String(row.functions)); } catch { /* ignore */ }

    return NextResponse.json({
      userId: row.user_id,
      displayName: String(row.display_name || ''),
      title: String(row.title || ''),
      functions,
      bio: String(row.bio || ''),
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