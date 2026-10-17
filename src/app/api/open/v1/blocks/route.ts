import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Valid API Key or Session required' }, { status: 401 });
  }

  try {
    await getDb();
    const body = await req.json();
    const { type = 'text', title = '', content = '', parentId = null, meta = {}, width, height } = body;
    let { pageId, x, y } = body;

    if (!pageId) {
      const userPages = query(
        `SELECT id FROM pages WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      );
      if (userPages.length > 0) pageId = userPages[0].id as string;
    }

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // 校验如果指定了 parentId，该父 Block 是否存在
    if (parentId) {
      const parentRow = query(`SELECT id, x, y, width, height FROM blocks WHERE id = ?`, [parentId]);
      if (parentRow.length === 0) {
        return NextResponse.json({ error: `Parent block ${parentId} not found` }, { status: 400 });
      }
      // 如果未指定坐标，智能放置在父 Block 的右侧或紧随其后
      if (x === undefined || y === undefined) {
        const p = parentRow[0];
        x = Number(p.x || 40) + Number(p.width || 420) + 40;
        y = Number(p.y || 40);
      }
    }

    const id = body.id || `blk_${nanoid(16)}`;
    const now = Date.now();

    // 计算当前页面最大 order_index
    const maxOrderRows = query(`SELECT MAX(order_index) as max_order FROM blocks WHERE page_id = ?`, [pageId]);
    const nextOrder = (Number(maxOrderRows[0]?.max_order ?? -1)) + 1;

    run(
      `INSERT INTO blocks (
        id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [
        id,
        pageId,
        type,
        title,
        content,
        JSON.stringify(meta),
        parentId,
        nextOrder,
        x ?? 40,
        y ?? (40 + nextOrder * 120),
        width ?? 420,
        height ?? 200,
        now,
        now,
      ]
    );

    run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);
    saveDb();

    return NextResponse.json({
      success: true,
      block: {
        id,
        pageId,
        type,
        title,
        content,
        parentId,
        order: nextOrder,
        x: x ?? 40,
        y: y ?? (40 + nextOrder * 120),
        width: width ?? 420,
        height: height ?? 200,
        createdAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/open/v1/blocks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Valid API Key or Session required' }, { status: 401 });
  }

  try {
    await getDb();
    const body = await req.json();
    const { id, title, content, parentId, meta, x, y, width, height, collapsed } = body;

    if (!id) {
      return NextResponse.json({ error: 'Block id is required' }, { status: 400 });
    }

    const existing = query(`SELECT id, page_id, parent_id FROM blocks WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: `Block ${id} not found` }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    const now = Date.now();

    if (title !== undefined) { updates.push('title = ?'); values.push(String(title)); }
    if (content !== undefined) { updates.push('content = ?'); values.push(String(content)); }
    if (parentId !== undefined) {
      // 允许设为具体 parentId，或传入 null/"" 解除父子关系
      const finalParent = parentId ? String(parentId) : null;
      if (finalParent === id) {
        return NextResponse.json({ error: 'Cannot set block as child of itself' }, { status: 400 });
      }
      updates.push('parent_id = ?');
      values.push(finalParent);
    }
    if (meta !== undefined) { updates.push('meta = ?'); values.push(JSON.stringify(meta)); }
    if (x !== undefined) { updates.push('x = ?'); values.push(Number(x)); }
    if (y !== undefined) { updates.push('y = ?'); values.push(Number(y)); }
    if (width !== undefined) { updates.push('width = ?'); values.push(Number(width)); }
    if (height !== undefined) { updates.push('height = ?'); values.push(Number(height)); }
    if (collapsed !== undefined) { updates.push('collapsed = ?'); values.push(collapsed ? 1 : 0); }

    updates.push('updated_at = ?');
    values.push(now);

    values.push(id);

    run(`UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`, values);
    run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, existing[0].page_id as string]);
    saveDb();

    return NextResponse.json({
      success: true,
      id,
      updatedAt: now,
      message: 'Block updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/open/v1/blocks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Valid API Key or Session required' }, { status: 401 });
  }

  try {
    await getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Block id is required' }, { status: 400 });
    }

    const existing = query(`SELECT id, page_id FROM blocks WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: `Block ${id} not found` }, { status: 404 });
    }

    // 级联处理：若该 Block 有子 Block，将其子 Block 移出至根层级，防止悬空
    run(`UPDATE blocks SET parent_id = NULL WHERE parent_id = ?`, [id]);
    run(`DELETE FROM blocks WHERE id = ?`, [id]);
    run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [Date.now(), existing[0].page_id as string]);
    saveDb();

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: 'Block deleted and children decoupled successfully',
    });
  } catch (error) {
    console.error('DELETE /api/open/v1/blocks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
