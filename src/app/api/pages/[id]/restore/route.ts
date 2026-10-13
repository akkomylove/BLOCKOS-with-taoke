import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const existing = query('SELECT * FROM pages WHERE id = ? AND user_id = ?', [id, userId]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    run('UPDATE pages SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?', [Date.now(), id, userId]);
    saveDb();

    return NextResponse.json({ success: true, restored: true });
  } catch (err) {
    console.error('POST /api/pages/[id]/restore error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
