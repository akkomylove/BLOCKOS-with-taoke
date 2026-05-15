import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getDb();
    const pages = query('SELECT * FROM pages WHERE user_id = ? ORDER BY order_index', [session.userId]);
    return NextResponse.json({ pages });
  } catch (err) {
    console.error('GET /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error', pages: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, icon } = await req.json();
    const id = nanoid();
    const now = Date.now();

    await getDb();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, session.userId, title || '无标题', icon || '📄', 0, now, now]
    );
    saveDb();

    return NextResponse.json({ id });
  } catch (err) {
    console.error('POST /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
