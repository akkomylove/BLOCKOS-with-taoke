import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
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
    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        userId: p.user_id,
        title: p.title || '无标题',
        icon: p.icon || '📄',
        orderIndex: p.order_index ?? 0,
        version: p.version ?? 1,
        deletedAt: p.deleted_at || null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error', pages: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reqId, title, icon, orderIndex } = await req.json();
    let id = reqId || nanoid();
    const now = Date.now();

    await getDb();
    const conflict = query('SELECT user_id FROM pages WHERE id = ?', [id]);
    if (conflict.length > 0 && conflict[0].user_id !== userId) {
      id = `${id}-${userId}`;
    }

    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)',
      [id, userId, title || '无标题', icon || '📄', typeof orderIndex === 'number' ? orderIndex : 0, now, now]
    );
    saveDb();

    return NextResponse.json({ id, version: 1 });
  } catch (err) {
    console.error('POST /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pages } = body;

    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: 'pages must be an array' }, { status: 400 });
    }

    await getDb();
    const now = Date.now();

    transaction(() => {
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
      }
    });

    saveDb();
    return NextResponse.json({ success: true, count: pages.length });
  } catch (err) {
    console.error('PUT /api/pages error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
