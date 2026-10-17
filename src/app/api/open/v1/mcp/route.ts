import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

// MCP 标准工具清单 (Model Context Protocol Tool Definitions)
const MCP_TOOLS = [
  {
    name: 'read_canvas',
    description: '读取 BlockOS 画布上的所有原子 Block，包括父子嵌套层级树（blockTree）、标题、内容与元数据。',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: '文档页面 ID，省略时自动获取当前用户最新活跃画布' },
      },
    },
  },
  {
    name: 'create_block',
    description: '在 BlockOS 画布中创建新的 Block 卡片。可通过 parentId 参数直接指定父 Block，将其自动设为子 Block。',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: '文档页面 ID' },
        type: { type: 'string', enum: ['text', 'code', 'table', 'todo', 'whiteboard', 'mindmap'], description: 'Block 类型' },
        title: { type: 'string', description: 'Block 标题' },
        content: { type: 'string', description: 'Block 详细内容' },
        parentId: { type: 'string', description: '父 Block ID，若提供则自动作为子 Block 挂载在父节点下' },
      },
      required: ['content'],
    },
  },
  {
    name: 'set_subblock',
    description: '自动将一个 Block 设置为指定父 Block 的子 Block，或者将其移出提升为独立 Block。',
    inputSchema: {
      type: 'object',
      properties: {
        blockId: { type: 'string', description: '待设置的 Block ID' },
        parentId: { type: 'string', description: '目标父 Block ID。传入 null 或留空表示移出子 Block（提升为画布独立 Block）' },
      },
      required: ['blockId'],
    },
  },
  {
    name: 'batch_create_hierarchy',
    description: '一步创建具备父子层级结构的多个 Block（例如创建一个核心需求父 Block，并自动附带创建多个子 Block）。',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: '文档页面 ID' },
        parentBlock: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string', default: 'text' },
          },
          required: ['content'],
        },
        subBlocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              type: { type: 'string', default: 'text' },
            },
            required: ['content'],
          },
        },
      },
      required: ['parentBlock', 'subBlocks'],
    },
  },
  {
    name: 'create_link',
    description: '在两个 Block 卡片之间建立拓扑关联关系（在右侧小地图和图谱视图中渲染连线）。',
    inputSchema: {
      type: 'object',
      properties: {
        fromBlockId: { type: 'string', description: '源 Block ID' },
        toBlockId: { type: 'string', description: '目标 Block ID' },
      },
      required: ['fromBlockId', 'toBlockId'],
    },
  },
  {
    name: 'delete_block',
    description: '删除指定的 Block 卡片。',
    inputSchema: {
      type: 'object',
      properties: {
        blockId: { type: 'string', description: '待删除的 Block ID' },
      },
      required: ['blockId'],
    },
  },
];

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized: Valid Bearer API Key or Session required' },
        id: null,
      },
      { status: 401 }
    );
  }

  try {
    await getDb();
    const rpc = await req.json();
    const { jsonrpc = '2.0', id = 1, method, params = {} } = rpc;

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'blockos-mcp-server', version: '1.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      const toolResult = await handleMcpToolCall(name, args, userId);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
          isError: toolResult.isError ?? false,
        },
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err) {
    console.error('MCP Server error:', err);
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal JSON-RPC error', data: String(err) },
      id: null,
    }, { status: 500 });
  }
}

async function handleMcpToolCall(name: string, args: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
  const now = Date.now();

  const resolvePageId = (providedPageId?: unknown): string => {
    if (typeof providedPageId === 'string' && providedPageId.trim()) return providedPageId;
    const userPages = query(
      `SELECT id FROM pages WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    if (userPages.length > 0) return userPages[0].id as string;
    throw new Error('未找到当前用户的活跃画布，请先创建页面');
  };

  switch (name) {
    case 'read_canvas': {
      const pageId = resolvePageId(args.pageId);
      const rawBlocks = query(
        `SELECT id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed 
         FROM blocks WHERE page_id = ? ORDER BY order_index ASC`,
        [pageId]
      );

      const blocks = rawBlocks.map((b) => ({
        id: b.id as string,
        type: b.type as string,
        title: (b.title as string) || '',
        content: (b.content as string) || '',
        parentId: (b.parent_id as string) || null,
        meta: JSON.parse((b.meta as string) || '{}'),
      }));

      // 提取树形结构
      const blockMap = new Map<string, Record<string, unknown>>();
      blocks.forEach((b) => blockMap.set(b.id, { ...b, children: [] }));
      const blockTree: unknown[] = [];
      blocks.forEach((b) => {
        const node = blockMap.get(b.id)!;
        if (b.parentId && blockMap.has(b.parentId)) {
          (blockMap.get(b.parentId)!.children as unknown[]).push(node);
        } else {
          blockTree.push(node);
        }
      });

      return { success: true, pageId, totalBlocks: blocks.length, blocks, blockTree };
    }

    case 'create_block': {
      const pageId = resolvePageId(args.pageId);
      const content = String(args.content || '');
      const type = String(args.type || 'text');
      const title = String(args.title || '');
      const parentId = args.parentId ? String(args.parentId) : null;
      const id = `blk_${nanoid(16)}`;

      const maxOrder = query(`SELECT MAX(order_index) as max_order FROM blocks WHERE page_id = ?`, [pageId]);
      const nextOrder = (Number(maxOrder[0]?.max_order ?? -1)) + 1;

      let x = 40;
      let y = 40 + nextOrder * 120;
      if (parentId) {
        const p = query(`SELECT x, y, width FROM blocks WHERE id = ?`, [parentId]);
        if (p.length > 0) {
          x = Number(p[0].x || 40) + Number(p[0].width || 420) + 40;
          y = Number(p[0].y || 40);
        }
      }

      run(
        `INSERT INTO blocks (
          id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, 420, 200, 0, 1, ?, ?)`,
        [id, pageId, type, title, content, parentId, nextOrder, x, y, now, now]
      );
      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);
      saveDb();

      return { success: true, message: 'Block 创建成功', block: { id, pageId, type, title, content, parentId } };
    }

    case 'set_subblock': {
      const blockId = String(args.blockId);
      const parentId = args.parentId ? String(args.parentId) : null;

      if (!blockId) throw new Error('缺少 blockId 参数');
      if (blockId === parentId) throw new Error('不能将 Block 设置为自身的子 Block');

      const existing = query(`SELECT id, page_id FROM blocks WHERE id = ?`, [blockId]);
      if (existing.length === 0) throw new Error(`未找到目标 Block: ${blockId}`);

      if (parentId) {
        const parent = query(`SELECT id, x, y, width FROM blocks WHERE id = ?`, [parentId]);
        if (parent.length === 0) throw new Error(`未找到父 Block: ${parentId}`);
        // 自动贴合在父 Block 侧翼
        const newX = Number(parent[0].x || 40) + Number(parent[0].width || 420) + 40;
        const newY = Number(parent[0].y || 40);
        run(`UPDATE blocks SET parent_id = ?, x = ?, y = ?, updated_at = ? WHERE id = ?`, [parentId, newX, newY, now, blockId]);
      } else {
        run(`UPDATE blocks SET parent_id = NULL, updated_at = ? WHERE id = ?`, [now, blockId]);
      }

      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, existing[0].page_id as string]);
      saveDb();

      return {
        success: true,
        message: parentId ? `已成功将 Block ${blockId} 挂载为 ${parentId} 的子 Block` : `已将 Block ${blockId} 移出子 Block（提升为独立卡片）`,
        blockId,
        parentId,
      };
    }

    case 'batch_create_hierarchy': {
      const pageId = resolvePageId(args.pageId);
      const parentObj = args.parentBlock as { title?: string; content: string; type?: string };
      const subList = (args.subBlocks as Array<{ title?: string; content: string; type?: string }>) || [];

      const parentId = `blk_${nanoid(16)}`;
      const maxOrder = query(`SELECT MAX(order_index) as max_order FROM blocks WHERE page_id = ?`, [pageId]);
      let currentOrder = (Number(maxOrder[0]?.max_order ?? -1)) + 1;

      // 1. 创建父 Block
      const parentX = 40;
      const parentY = 40 + currentOrder * 240;
      run(
        `INSERT INTO blocks (
          id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '{}', NULL, ?, ?, ?, 480, 260, 0, 1, ?, ?)`,
        [parentId, pageId, parentObj.type || 'text', parentObj.title || '核心需求', parentObj.content, currentOrder++, parentX, parentY, now, now]
      );

      // 2. 创建所有子 Block 并绑定 parentId
      const createdSubBlocks = [];
      for (let i = 0; i < subList.length; i++) {
        const sub = subList[i];
        const subId = `blk_${nanoid(16)}`;
        const subX = parentX + 520;
        const subY = parentY + i * 160;

        run(
          `INSERT INTO blocks (
            id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, 380, 140, 0, 1, ?, ?)`,
          [subId, pageId, sub.type || 'text', sub.title || `子项 ${i + 1}`, sub.content, parentId, currentOrder++, subX, subY, now, now]
        );

        createdSubBlocks.push({ id: subId, title: sub.title, parentId });
      }

      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);
      saveDb();

      return {
        success: true,
        message: `成功批量创建 1 个父 Block 与 ${createdSubBlocks.length} 个子 Block 并完成层级挂载`,
        parentId,
        subBlocks: createdSubBlocks,
      };
    }

    case 'create_link': {
      const fromId = String(args.fromBlockId);
      const toId = String(args.toBlockId);
      const source = query(`SELECT id, meta FROM blocks WHERE id = ?`, [fromId]);
      if (source.length === 0) throw new Error(`源 Block ${fromId} 不存在`);

      const meta = JSON.parse((source[0].meta as string) || '{}');
      const links = Array.isArray(meta.links) ? meta.links : [];
      if (!links.includes(toId)) {
        links.push(toId);
        meta.links = links;
        run(`UPDATE blocks SET meta = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(meta), now, fromId]);
        saveDb();
      }

      return { success: true, message: `已在 ${fromId} 与 ${toId} 之间建立拓扑链接`, fromId, toId };
    }

    case 'delete_block': {
      const blockId = String(args.blockId);
      run(`UPDATE blocks SET parent_id = NULL WHERE parent_id = ?`, [blockId]);
      run(`DELETE FROM blocks WHERE id = ?`, [blockId]);
      saveDb();
      return { success: true, message: `已删除 Block ${blockId}`, deletedId: blockId };
    }

    default:
      return { isError: true, error: `不支持的 MCP 工具名: ${name}` };
  }
}
