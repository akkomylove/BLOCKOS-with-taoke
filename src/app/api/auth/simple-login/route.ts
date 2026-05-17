import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const userEmail = email || 'demo@blockos.app';
    
    await getDb();
    
    let userId: string;
    const existingUser = query('SELECT id FROM users WHERE email = ?', [userEmail]);
    
    if (existingUser.length > 0) {
      userId = existingUser[0].id as string;
    } else {
      userId = nanoid();
      run(
        'INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, userEmail, name, null, 'demo', 'demo-' + userId, Date.now()]
      );
      saveDb();
    }

    const cookieStore = await cookies();
    cookieStore.set('demo-session', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}

