import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ?', [id, userId]);
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [id]);

    return NextResponse.json({
      page: pages[0],
      blocks: blocks.map((b) => ({
        id: b.id,
        type: b.type,
        title: (b.title as string) || '',
        content: b.content || '',
        meta: JSON.parse((b.meta as string) || '{}'),
        parentId: b.parent_id || null,
        order: b.order_index ?? 0,
        x: (b.x as number) ?? 0,
        y: (b.y as number) ?? 0,
        width: (b.width as number) ?? 320,
        collapsed: b.collapsed === 1,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/pages/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error', blocks: [] }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title, icon } = await req.json();

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();
    run(
      'UPDATE pages SET title = ?, icon = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [title, icon || '📄', Date.now(), id, userId]
    );
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT /api/pages/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    run('DELETE FROM pages WHERE id = ? AND user_id = ?', [id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/pages/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
