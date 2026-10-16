import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';
import { parseChapters, validateChapters } from '@/lib/document-outline';

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
      page: {
        id: pages[0].id,
        userId: pages[0].user_id,
        title: pages[0].title || '无标题',
        icon: pages[0].icon || '📄',
        folderId: pages[0].folder_id || undefined,
        chapters: pages[0].chapters === null ? undefined : parseChapters(pages[0].chapters),
        kind: pages[0].kind || 'document',
        orderIndex: pages[0].order_index ?? 0,
        version: pages[0].version ?? 1,
        deletedAt: pages[0].deleted_at || null,
        createdAt: pages[0].created_at,
        updatedAt: pages[0].updated_at,
      },
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
        version: b.version ?? 1,
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
    const body = await req.json();
    const { title, icon, version, chapters } = body;
    if (chapters !== undefined) {
      const error = validateChapters(chapters);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();

    const existing = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [id, userId]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const currentVersion = (existing[0].version as number) || 1;
    if (chapters !== undefined) {
      const blockIds = new Set(query('SELECT id FROM blocks WHERE page_id = ?', [id]).map((block) => block.id));
      if (parseChapters(chapters).some((chapter) => chapter.blockIds.some((blockId) => !blockIds.has(blockId)))) {
        return NextResponse.json({ error: '章节只能包含当前文档中的内容，请先保存新内容' }, { status: 400 });
      }
    }
    if (typeof version === 'number' && version !== currentVersion) {
      return NextResponse.json(
        { error: 'Conflict: Page has been modified by another operation', currentVersion },
        { status: 409 }
      );
    }

    const nextVersion = currentVersion + 1;
    const now = Date.now();

    run(
      'UPDATE pages SET title = ?, icon = ?, version = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [title ?? existing[0].title, icon ?? existing[0].icon, nextVersion, now, id, userId]
    );
    if (chapters !== undefined) run('UPDATE pages SET chapters = ? WHERE id = ? AND user_id = ?', [JSON.stringify(chapters), id, userId]);
    saveDb();

    return NextResponse.json({ success: true, version: nextVersion });
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
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (!isValidNanoid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await getDb();

    const existingPage = query('SELECT id FROM pages WHERE id = ? AND user_id = ?', [id, userId]);
    if (existingPage.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (permanent) {
      run('DELETE FROM blocks WHERE page_id = ?', [id]);
      run('DELETE FROM pages WHERE id = ? AND user_id = ?', [id, userId]);
    } else {
      run('UPDATE pages SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?', [Date.now(), Date.now(), id, userId]);
    }
    saveDb();

    return NextResponse.json({ success: true, softDeleted: !permanent });
  } catch (err) {
    console.error('DELETE /api/pages/[id] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
