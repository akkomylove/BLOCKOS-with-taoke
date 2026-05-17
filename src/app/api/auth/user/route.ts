import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';

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

    return NextResponse.json(users[0]);
  } catch (err) {
    console.error('Get user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

