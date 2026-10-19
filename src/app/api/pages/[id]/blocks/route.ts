import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';
import { getPresetDocumentBlocks, PRESET_DOCUMENTS } from '@/config/presetDocuments';

async function GETDatabaseHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const isGuideRequest = id === 'doc-guide' || id === `doc-guide-${userId}` || id.includes('guide');
    const isProducerRequest = id === 'doc-producers' || id === `doc-producers-${userId}` || id.includes('producer');
    let targetPageId = id;

    let pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [id, userId]);

    // 如果直接查找未找到且为指南或制作人文档请求，再查找该用户拥有的带用户后缀的页面
    if (pages.length === 0 && (isGuideRequest || isProducerRequest)) {
      const matchPrefix = isGuideRequest ? 'doc-guide' : 'doc-producers';
      const userMatchedPages = query(
        'SELECT * FROM pages WHERE (id = ? OR id = ?) AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)',
        [matchPrefix, `${matchPrefix}-${userId}`, userId]
      );
      if (userMatchedPages.length > 0) {
        pages = userMatchedPages;
        targetPageId = pages[0].id as string;
      }
    }

    if (pages.length === 0) {
      if (isGuideRequest) {
        const now = Date.now();
        const docGuideTaken = query('SELECT user_id FROM pages WHERE id = ?', ['doc-guide']);
        targetPageId = (docGuideTaken.length === 0 || docGuideTaken[0].user_id === userId) ? 'doc-guide' : `doc-guide-${userId}`;

        run(
          'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [targetPageId, userId, '👋 欢迎使用 BlockOS ｜ 新手快速入门指南', '👋', 0, 1, now, now]
        );
        pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [targetPageId, userId]);
      } else if (isProducerRequest) {
        const now = Date.now();
        const producerDoc = PRESET_DOCUMENTS.find(d => d.id === 'doc-producers');
        const docProducerTaken = query('SELECT user_id FROM pages WHERE id = ?', ['doc-producers']);
        targetPageId = (docProducerTaken.length === 0 || docProducerTaken[0].user_id === userId) ? 'doc-producers' : `doc-producers-${userId}`;

        run(
          'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at, chapters, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [targetPageId, userId, producerDoc?.title || 'Block OS 团队制作人文档', producerDoc?.icon || '📓', 1, 1, now, now, JSON.stringify(producerDoc?.chapters || []), 'document']
        );
        pages = query('SELECT * FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [targetPageId, userId]);
      } else {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    } else {
      targetPageId = pages[0].id as string;
    }

    let blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [targetPageId]);

    if (isGuideRequest && blocks.length === 0) {
      const presetBlocks = getPresetDocumentBlocks('doc-guide');
      const now = Date.now();
      transaction(() => {
        for (let i = 0; i < presetBlocks.length; i++) {
          const b = presetBlocks[i];
          let blockId = b.id;
          const blockTaken = query('SELECT page_id FROM blocks WHERE id = ?', [b.id]);
          if (blockTaken.length > 0 && blockTaken[0].page_id !== targetPageId) {
            blockId = `${b.id}-${userId}`;
          }

          const metaObj = { ...(b.meta || {}), tourId: b.id };
          run(
            `INSERT INTO blocks (
              id, page_id, type, title, content, meta, parent_id, group_id,
              order_index, x, y, width, height, collapsed, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              blockId,
              targetPageId,
              b.type,
              b.title || '',
              b.content || '',
              JSON.stringify(metaObj),
              b.parentId || null,
              b.groupId || null,
              typeof b.order === 'number' ? b.order : i,
              typeof b.x === 'number' ? b.x : 100,
              typeof b.y === 'number' ? b.y : 40,
              typeof b.width === 'number' ? b.width : 760,
              typeof b.height === 'number' ? b.height : 200,
              b.collapsed ? 1 : 0,
              1,
              now + i,
              now + i,
            ]
          );
        }
      });
      saveDb();
      blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [targetPageId]);
    }

    if (isProducerRequest && blocks.length === 0) {
      const presetBlocks = getPresetDocumentBlocks('doc-producers');
      const now = Date.now();
      transaction(() => {
        for (let i = 0; i < presetBlocks.length; i++) {
          const b = presetBlocks[i];
          let blockId = b.id;
          const blockTaken = query('SELECT page_id FROM blocks WHERE id = ?', [b.id]);
          if (blockTaken.length > 0 && blockTaken[0].page_id !== targetPageId) {
            blockId = `${b.id}-${userId}`;
          }

          const parentId = b.parentId ? (blockTaken.length > 0 && blockTaken[0].page_id !== targetPageId ? `${b.parentId}-${userId}` : b.parentId) : null;
          const metaObj = { ...(b.meta || {}) };
          if (metaObj.links && Array.isArray(metaObj.links)) {
            metaObj.links = metaObj.links.map((linkId: string) => (blockTaken.length > 0 && blockTaken[0].page_id !== targetPageId ? `${linkId}-${userId}` : linkId));
          }

          run(
            `INSERT INTO blocks (
              id, page_id, type, title, content, meta, parent_id, group_id,
              order_index, x, y, width, height, collapsed, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              blockId,
              targetPageId,
              b.type,
              b.title || '',
              b.content || '',
              JSON.stringify(metaObj),
              parentId,
              b.groupId || null,
              typeof b.order === 'number' ? b.order : i,
              typeof b.x === 'number' ? b.x : 40,
              typeof b.y === 'number' ? b.y : 40,
              typeof b.width === 'number' ? b.width : 720,
              typeof b.height === 'number' ? b.height : 200,
              b.collapsed ? 1 : 0,
              1,
              now + i,
              now + i,
            ]
          );
        }
      });
      saveDb();
      blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index', [targetPageId]);
    }

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

        let blockId = b.id;
        const blockTaken = query('SELECT page_id FROM blocks WHERE id = ?', [b.id]);
        if (blockTaken.length > 0 && blockTaken[0].page_id !== id) {
          blockId = `${b.id}-${userId}`;
        }

        const metaObj = { ...(b.meta || {}) };
        if (b.id.startsWith('guide-') && !metaObj.tourId) {
          metaObj.tourId = b.id;
        }

        run(
          `INSERT INTO blocks (
            id, page_id, type, title, content, meta, parent_id, group_id, 
            order_index, x, y, width, height, collapsed, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            blockId,
            id,
            b.type || 'text',
            b.title || '',
            b.content || '',
            JSON.stringify(metaObj),
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

async function POSTDatabaseHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleSaveBlocks(req, context);
}

async function PUTDatabaseHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleSaveBlocks(req, context);
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
export const POST = withDatabaseRequest(POSTDatabaseHandler);
export const PUT = withDatabaseRequest(PUTDatabaseHandler);
