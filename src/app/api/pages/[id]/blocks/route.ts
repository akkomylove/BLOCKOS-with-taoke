import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
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

    const pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [id, userId]);
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [id]);

    return NextResponse.json({
      blocks: blocks.map((b) => ({
        id: b.id,
        type: b.type,
        title: (b.title as string) || '',
        content: b.content || '',
        meta: JSON.parse((b.meta as string) || '{}'),
        parentId: b.parent_id || null,
        groupId: b.group_id || null,
        order: b.order_index ?? 0,
        x: (b.x as number) ?? 0,
        y: (b.y as number) ?? 0,
        width: (b.width as number) ?? 320,
        height: (b.height as number) ?? 200,
        collapsed: b.collapsed === 1,
        version: (b.version as number) ?? 1,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
      pageVersion: pages[0].version ?? 1,
    });
  } catch (err) {
    console.error('GET /api/pages/[id]/blocks error:', err);
    return NextResponse.json({ error: 'Internal Server Error', blocks: [] }, { status: 500 });
  }
}

async function handleSaveBlocks(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { blocks, version } = body;

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks must be an array' }, { status: 400 });
    }

    await getDb();

    const pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [id, userId]);
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const currentPageVersion = (pages[0].version as number) || 1;
    if (typeof version === 'number' && version !== currentPageVersion) {
      return NextResponse.json(
        { error: 'Conflict: Page has been modified concurrently', currentVersion: currentPageVersion },
        { status: 409 }
      );
    }

    const now = Date.now();
    const nextPageVersion = currentPageVersion + 1;

    transaction(() => {
      run('DELETE FROM blocks WHERE page_id = ?', [id]);

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b || !b.id) continue;

        run(
          `INSERT INTO blocks (
            id, page_id, type, title, content, meta, parent_id, group_id, 
            order_index, x, y, width, height, collapsed, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            id,
            b.type || 'text',
            b.title || '',
            b.content || '',
            JSON.stringify(b.meta || {}),
            b.parentId || null,
            b.groupId || null,
            typeof b.order === 'number' ? b.order : i,
            typeof b.x === 'number' ? b.x : 0,
            typeof b.y === 'number' ? b.y : 0,
            typeof b.width === 'number' ? b.width : 320,
            typeof b.height === 'number' ? b.height : 200,
            b.collapsed ? 1 : 0,
            (b.version ?? 1) + 1,
            b.createdAt ?? now,
            now,
          ]
        );
      }

      run('UPDATE pages SET version = ?, updated_at = ? WHERE id = ?', [nextPageVersion, now, id]);
    });

    saveDb();
    return NextResponse.json({ success: true, count: blocks.length, pageVersion: nextPageVersion });
  } catch (err) {
    console.error('Save /api/pages/[id]/blocks error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleSaveBlocks(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleSaveBlocks(req, context);
}
