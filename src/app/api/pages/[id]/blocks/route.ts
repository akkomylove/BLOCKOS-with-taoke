import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await getDb();

  const pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ?', [id, session.userId]);
  if (pages.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [id]);

  return NextResponse.json({
    blocks: blocks.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title || '',
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
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { blocks } = await req.json();

  await getDb();

  const pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ?', [id, session.userId]);
  if (pages.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  run('DELETE FROM blocks WHERE page_id = ?', [id]);

  for (const b of blocks) {
    run(
      'INSERT INTO blocks (id, page_id, type, content, meta, parent_id, order_index, x, y, width, collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        b.id,
        id,
        b.type,
        b.content || '',
        JSON.stringify(b.meta || {}),
        b.parentId || null,
        b.order ?? 0,
        b.x ?? 0,
        b.y ?? 0,
        b.width ?? 320,
        b.collapsed ? 1 : 0,
        b.createdAt ?? Date.now(),
        b.updatedAt ?? Date.now(),
      ]
    );
  }

  saveDb();
  return NextResponse.json({ success: true, count: blocks.length });
}
