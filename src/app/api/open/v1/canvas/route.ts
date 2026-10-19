import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface CanvasBlockNode {
  id: string;
  type: string;
  title: string;
  content: string;
  parentId: string | null;
  meta: Record<string, unknown>;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  children?: CanvasBlockNode[];
}

async function GETDatabaseHandler(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Valid API Key or Session required' }, { status: 401 });
  }

  try {
    await getDb();
    const url = new URL(req.url);
    let pageId = url.searchParams.get('pageId');

    // 如果未传 pageId，默认读取该用户最新的活跃文档
    if (!pageId) {
      const userPages = query(
        `SELECT id, title FROM pages WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      );
      if (userPages.length > 0) {
        pageId = userPages[0].id as string;
      }
    }

    if (!pageId) {
      return NextResponse.json({ error: 'No active canvas found for this user' }, { status: 404 });
    }

    const pageRows = query(`SELECT id, title, version, updated_at FROM pages WHERE id = ?`, [pageId]);
    const page = pageRows[0] || { id: pageId, title: '当前画布', version: 1 };

    const rawBlocks = query(
      `SELECT id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed 
       FROM blocks WHERE page_id = ? ORDER BY order_index ASC`,
      [pageId]
    );

    const blocks: CanvasBlockNode[] = rawBlocks.map((b) => ({
      id: b.id as string,
      type: b.type as string,
      title: (b.title as string) || '',
      content: (b.content as string) || '',
      parentId: (b.parent_id as string) || null,
      meta: JSON.parse((b.meta as string) || '{}'),
      order: Number(b.order_index || 0),
      x: Number(b.x || 0),
      y: Number(b.y || 0),
      width: Number(b.width || 400),
      height: Number(b.height || 200),
      collapsed: Boolean(b.collapsed),
    }));

    // 组装父子树结构 (Parent-Child Hierarchy Tree)
    const blockMap = new Map<string, CanvasBlockNode>();
    blocks.forEach((b) => blockMap.set(b.id, { ...b, children: [] }));

    const rootBlocks: CanvasBlockNode[] = [];
    blocks.forEach((b) => {
      const node = blockMap.get(b.id)!;
      if (b.parentId && blockMap.has(b.parentId)) {
        blockMap.get(b.parentId)!.children!.push(node);
      } else {
        rootBlocks.push(node);
      }
    });

    return NextResponse.json({
      success: true,
      page,
      totalCount: blocks.length,
      blocks,
      blockTree: rootBlocks,
    });
  } catch (error) {
    console.error('GET /api/open/v1/canvas error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function POSTDatabaseHandler(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Valid API Key or Session required' }, { status: 401 });
  }

  try {
    await getDb();
    const body = await req.json();
    const { pageId, blocks: inputBlocks } = body;

    if (!pageId || !Array.isArray(inputBlocks)) {
      return NextResponse.json({ error: 'pageId and blocks array are required' }, { status: 400 });
    }

    const now = Date.now();
    const createdBlocks = [];

    for (let i = 0; i < inputBlocks.length; i++) {
      const item = inputBlocks[i];
      const id = item.id || `blk_${nanoid(16)}`;
      const type = item.type || 'text';
      const title = item.title || '';
      const content = item.content || '';
      const parentId = item.parentId || null;
      const meta = JSON.stringify(item.meta || {});
      const order = typeof item.order === 'number' ? item.order : i;
      const x = typeof item.x === 'number' ? item.x : 40;
      const y = typeof item.y === 'number' ? item.y : 40 + i * 220;
      const width = typeof item.width === 'number' ? item.width : 420;
      const height = typeof item.height === 'number' ? item.height : 220;

      run(
        `INSERT OR REPLACE INTO blocks (
          id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        [id, pageId, type, title, content, meta, parentId, order, x, y, width, height, now, now]
      );

      createdBlocks.push({ id, type, title, content, parentId, order });
    }

    // 更新页面更新时间
    run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);
    saveDb();

    return NextResponse.json({
      success: true,
      message: `Successfully created/updated ${createdBlocks.length} blocks`,
      blocks: createdBlocks,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/open/v1/canvas error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
export const POST = withDatabaseRequest(POSTDatabaseHandler);
