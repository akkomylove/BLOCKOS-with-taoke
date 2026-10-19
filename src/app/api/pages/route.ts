import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { nanoid } from 'nanoid';
import { parseChapters, validateChapters } from '@/lib/document-outline';

async function GETDatabaseHandler(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    await getDb();
    const sql = includeDeleted
      ? 'SELECT * FROM pages WHERE user_id = ? ORDER BY order_index'
      : 'SELECT * FROM pages WHERE user_id = ? AND (deleted_at IS NULL OR deleted_at = 0) ORDER BY order_index';

    const pages = query(sql, [userId]);
    const mappedPages = pages.map((p) => ({
      id: p.id,
      userId: p.user_id,
      title: p.title || '无标题',
      icon: p.icon || '📄',
      folderId: p.folder_id || undefined,
      chapters: p.chapters === null ? undefined : parseChapters(p.chapters),
      kind: p.kind || 'document',
      orderIndex: p.order_index ?? 0,
      version: p.version ?? 1,
      deletedAt: p.deleted_at || null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    // 防御性去重：若历史数据中存在多个指南副本（如 doc-guide 与 doc-guide-userId），仅保留唯一有效的一份
    const seenIds = new Set<string>();
    let hasGuide = false;
    const deduplicatedPages = mappedPages.filter((p) => {
      if (seenIds.has(p.id as string)) return false;
      seenIds.add(p.id as string);
      const titleStr = typeof p.title === 'string' ? p.title : '';
      const isGuide =
        p.id === 'doc-guide' ||
        (typeof p.id === 'string' && p.id.startsWith('doc-guide-')) ||
        titleStr.includes('新手快速入门指南') ||
        titleStr.includes('欢迎使用 BlockOS');
      if (isGuide) {
        if (hasGuide) return false;
        hasGuide = true;
      }
      return true;
    });

    return NextResponse.json({
      folders: query('SELECT id, name, created_at FROM folders WHERE user_id = ? ORDER BY created_at', [userId])
        .map((folder) => ({ id: folder.id, name: folder.name, createdAt: folder.created_at, collapsed: false })),
      pages: deduplicatedPages,
    });
  } catch (err) {
    console.error('GET /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error', pages: [] }, { status: 500 });
  }
}

async function POSTDatabaseHandler(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reqId, title, icon, orderIndex, folderId, chapters, kind } = await req.json();
    if (chapters !== undefined) {
      const error = validateChapters(chapters);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }
    let id = reqId || nanoid();
    const now = Date.now();

    await getDb();
    const conflict = query('SELECT user_id FROM pages WHERE id = ?', [id]);
    if (conflict.length > 0 && conflict[0].user_id !== userId) {
      id = `${id}-${userId}`;
    }

    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, deleted_at, created_at, updated_at, folder_id, chapters, kind) VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?, ?, ?, ?)',
      [id, userId, title || '无标题', icon || '📄', typeof orderIndex === 'number' ? orderIndex : 0, now, now,
        typeof folderId === 'string' ? folderId : null, chapters === undefined ? null : JSON.stringify(chapters), kind === 'inbox' ? 'inbox' : 'document']
    );
    saveDb();

    return NextResponse.json({ id, version: 1 });
  } catch (err) {
    console.error('POST /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function PUTDatabaseHandler(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pages, folders } = body;

    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: 'pages must be an array' }, { status: 400 });
    }
    for (const page of pages) {
      if (page.chapters !== undefined) {
        const error = validateChapters(page.chapters);
        if (error) return NextResponse.json({ error }, { status: 400 });
      }
    }

    await getDb();
    const now = Date.now();

    transaction(() => {
      if (Array.isArray(folders)) {
        const validFolderIds = folders.map((f) => f.id).filter(Boolean);
        if (validFolderIds.length > 0) {
          run(
            `DELETE FROM folders WHERE user_id = ? AND id NOT IN (${validFolderIds.map(() => '?').join(',')})`,
            [userId, ...validFolderIds]
          );
        } else {
          run('DELETE FROM folders WHERE user_id = ?', [userId]);
        }
        for (const folder of folders) {
          if (typeof folder.id !== 'string' || typeof folder.name !== 'string') continue;
          const owner = query('SELECT user_id FROM folders WHERE id = ?', [folder.id]);
          if (owner.length && owner[0].user_id !== userId) continue;
          run('INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name',
            [folder.id, userId, folder.name.slice(0, 200), folder.createdAt || now]);
        }
      }
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        if (!p.id) continue;

        const existing = query('SELECT id, version FROM pages WHERE id = ? AND user_id = ?', [p.id, userId]);
        if (existing.length > 0) {
          const currentVersion = (existing[0].version as number) || 1;
          const nextVersion = currentVersion + 1;
          run(
            'UPDATE pages SET title = ?, icon = ?, order_index = ?, version = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [p.title || '无标题', p.icon || '📄', i, nextVersion, now, p.id, userId]
          );
        } else {
          // 多租户隔离防护：如果客户端传入的 p.id 已被其他用户占用（如固定的 doc-guide），自动分派租户级后缀
          let insertId = p.id;
          const conflict = query('SELECT user_id FROM pages WHERE id = ?', [p.id]);
          if (conflict.length > 0 && conflict[0].user_id !== userId) {
            insertId = `${p.id}-${userId}`;
          }

          const targetExists = query('SELECT id FROM pages WHERE id = ? AND user_id = ?', [insertId, userId]);
          if (targetExists.length > 0) {
            run(
              'UPDATE pages SET title = ?, icon = ?, order_index = ?, updated_at = ? WHERE id = ? AND user_id = ?',
              [p.title || '无标题', p.icon || '📄', i, now, insertId, userId]
            );
          } else {
            run(
              'INSERT INTO pages (id, user_id, title, icon, order_index, version, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)',
              [insertId, userId, p.title || '无标题', p.icon || '📄', i, now, now]
            );
          }
        }
        const metadataId = query('SELECT id FROM pages WHERE id = ? AND user_id = ?', [p.id, userId]).length ? p.id : `${p.id}-${userId}`;
        run('UPDATE pages SET folder_id = ?, kind = COALESCE(?, kind) WHERE id = ? AND user_id = ?',
          [typeof p.folderId === 'string' ? p.folderId : null, p.kind === 'inbox' ? 'inbox' : p.kind === 'document' ? 'document' : null, metadataId, userId]);
        if (p.chapters !== undefined) run('UPDATE pages SET chapters = ? WHERE id = ? AND user_id = ?', [JSON.stringify(p.chapters), metadataId, userId]);
      }
    });

    saveDb();
    return NextResponse.json({ success: true, count: pages.length });
  } catch (err) {
    console.error('PUT /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
export const POST = withDatabaseRequest(POSTDatabaseHandler);
export const PUT = withDatabaseRequest(PUTDatabaseHandler);
