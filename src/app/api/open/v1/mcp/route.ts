import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { verifyApiKeyToken } from '@/lib/api-keys';
import { nanoid } from 'nanoid';

const BLOCK_TYPES = ['text', 'code', 'table', 'todo', 'whiteboard', 'mindmap'];
type InputSchema = {
  type: string | string[];
  properties?: Record<string, InputSchema>;
  required?: string[];
  items?: InputSchema;
  enum?: string[];
  description?: string;
  default?: string;
};

// MCP 标准工具清单 (Model Context Protocol Tool Definitions)
const MCP_TOOLS: { name: string; description: string; inputSchema: InputSchema }[] = [
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
        type: { type: 'string', enum: BLOCK_TYPES, description: 'Block 类型' },
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
        parentId: { type: ['string', 'null'], description: '目标父 Block ID。传入 null 或留空表示移出子 Block（提升为画布独立 Block）' },
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
            type: { type: 'string', enum: BLOCK_TYPES, default: 'text' },
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
              type: { type: 'string', enum: BLOCK_TYPES, default: 'text' },
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
  let permissions: string[] = ['read', 'write'];
  try {
    const authorization = req.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) {
      const verified = await verifyApiKeyToken(authorization.slice(7).trim());
      if (!verified) throw new Error('Unauthorized');
      userId = verified.userId;
      permissions = verified.permissions;
    } else {
      userId = await getUserId(req);
    }
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

  let rpc: unknown;
  try {
    rpc = await req.json();
  } catch {
    return rpcError(null, -32700, 'Parse error', 400);
  }
  if (!isObject(rpc) || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string'
    || ('id' in rpc && typeof rpc.id !== 'string' && (typeof rpc.id !== 'number' || !Number.isFinite(rpc.id)))) {
    return rpcError(null, -32600, 'Invalid Request', 400);
  }
  // Notifications never produce responses or execute request-only tool calls.
  if (!('id' in rpc)) return new NextResponse(null, { status: 202 });
  const id = rpc.id as string | number;
  const { method, params = {} } = rpc;
  if (!isObject(params)) return rpcError(id, -32602, 'params must be an object');

  try {
    await getDb();

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'].includes(String(params.protocolVersion))
            ? params.protocolVersion : '2025-03-26',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'blockos-mcp-server', version: '1.0.0' },
        },
      });
    }

    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} });
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
      const tool = MCP_TOOLS.find((item) => item.name === name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(name)}`);
      const validationError = validateInput(args, tool.inputSchema, 'arguments');
      if (validationError) return rpcError(id, -32602, validationError);
      let toolResult: Record<string, unknown> = {};
      try {
        const permission = name === 'read_canvas' ? 'read' : 'write';
        if (!permissions.includes(permission)) throw new Error(`API Key 缺少 ${permission} 权限`);
        if (permission === 'read') {
          toolResult = handleMcpToolCall(tool.name, args as Record<string, unknown>, userId);
        } else {
          transaction(() => { toolResult = handleMcpToolCall(tool.name, args as Record<string, unknown>, userId); });
          saveDb();
        }
      } catch (err) {
        toolResult = { isError: true, error: err instanceof Error ? err.message : '工具执行失败' };
      }
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
    return rpcError(id, -32603, 'Internal JSON-RPC error', 500);
  }
}

function rpcError(id: string | number | null, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Validate the same schemas advertised by tools/list, including nested batch entries.
function validateInput(value: unknown, schema: InputSchema, path: string): string | null {
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes(actualType)) return `${path} must be ${types.join(' or ')}`;
  if (schema.enum && !schema.enum.includes(value as string)) return `${path} has an unsupported value`;
  if (isObject(value)) {
    for (const field of schema.required || []) {
      if (!(field in value)) return `${path}.${field} is required`;
    }
    for (const [field, child] of Object.entries(schema.properties || {})) {
      if (field in value) {
        const error = validateInput(value[field], child, `${path}.${field}`);
        if (error) return error;
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      const error = validateInput(value[i], schema.items, `${path}[${i}]`);
      if (error) return error;
    }
  }
  return null;
}

function handleMcpToolCall(name: string, args: Record<string, unknown>, userId: string): Record<string, unknown> {
  const now = Date.now();

  const resolvePageId = (providedPageId?: unknown): string => {
    if (typeof providedPageId === 'string' && providedPageId.trim()) {
      const page = query(`SELECT id FROM pages WHERE id = ? AND user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)`, [providedPageId, userId]);
      if (!page.length) throw new Error('画布不存在或无权访问');
      return providedPageId;
    }
    const userPages = query(
      `SELECT id FROM pages WHERE user_id = ? AND (deleted_at IS NULL OR deleted_at = 0) ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    if (userPages.length > 0) return userPages[0].id as string;
    throw new Error('未找到当前用户的活跃画布，请先创建页面');
  };

  const ownedBlock = (blockId: string) => {
    const rows = query(`SELECT b.* FROM blocks b JOIN pages p ON p.id = b.page_id
      WHERE b.id = ? AND p.user_id = ? AND (p.deleted_at IS NULL OR p.deleted_at = 0)`, [blockId, userId]);
    if (!rows.length) throw new Error('Block 不存在或无权访问');
    return rows[0];
  };

  const samePageBlock = (blockId: string, pageId: string) => {
    const block = ownedBlock(blockId);
    if (block.page_id !== pageId) throw new Error('关联的 Block 必须位于同一画布');
    return block;
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
        const p = samePageBlock(parentId, pageId);
        x = Number(p.x ?? 40) + Number(p.width ?? 420) + 40;
        y = Number(p.y ?? 40);
      }

      run(
        `INSERT INTO blocks (
          id, page_id, type, title, content, meta, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, 420, 200, 0, 1, ?, ?)`,
        [id, pageId, type, title, content, parentId, nextOrder, x, y, now, now]
      );
      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);

      return { success: true, message: 'Block 创建成功', block: { id, pageId, type, title, content, parentId } };
    }

    case 'set_subblock': {
      const blockId = String(args.blockId);
      const parentId = args.parentId ? String(args.parentId) : null;

      if (!blockId) throw new Error('缺少 blockId 参数');
      if (blockId === parentId) throw new Error('不能将 Block 设置为自身的子 Block');

      const existing = ownedBlock(blockId);

      if (parentId) {
        const parent = samePageBlock(parentId, existing.page_id as string);
        const visited = new Set([blockId]);
        let ancestor: typeof parent | null = parent;
        while (ancestor) {
          if (visited.has(ancestor.id as string)) throw new Error('不能创建循环父子关系');
          visited.add(ancestor.id as string);
          ancestor = ancestor.parent_id ? samePageBlock(ancestor.parent_id as string, existing.page_id as string) : null;
        }
        // 自动贴合在父 Block 侧翼
        const newX = Number(parent.x ?? 40) + Number(parent.width ?? 420) + 40;
        const newY = Number(parent.y ?? 40);
        run(`UPDATE blocks SET parent_id = ?, x = ?, y = ?, updated_at = ? WHERE id = ?`, [parentId, newX, newY, now, blockId]);
      } else {
        run(`UPDATE blocks SET parent_id = NULL, updated_at = ? WHERE id = ?`, [now, blockId]);
      }

      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, existing.page_id as string]);

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
      const source = ownedBlock(fromId);
      samePageBlock(toId, source.page_id as string);

      const meta = JSON.parse((source.meta as string) || '{}');
      const links = Array.isArray(meta.links) ? meta.links : [];
      if (!links.includes(toId)) {
        links.push(toId);
        meta.links = links;
        run(`UPDATE blocks SET meta = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(meta), now, fromId]);
        run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, source.page_id as string]);
      }

      return { success: true, message: `已在 ${fromId} 与 ${toId} 之间建立拓扑链接`, fromId, toId };
    }

    case 'delete_block': {
      const blockId = String(args.blockId);
      const block = ownedBlock(blockId);
      const pageId = block.page_id as string;
      run(`UPDATE blocks SET parent_id = NULL, updated_at = ? WHERE parent_id = ? AND page_id = ?`, [now, blockId, pageId]);
      for (const linked of query('SELECT id, meta FROM blocks WHERE page_id = ?', [pageId])) {
        const meta = JSON.parse((linked.meta as string) || '{}');
        if (Array.isArray(meta.links) && meta.links.includes(blockId)) {
          meta.links = meta.links.filter((link: unknown) => link !== blockId);
          run('UPDATE blocks SET meta = ?, updated_at = ? WHERE id = ?', [JSON.stringify(meta), now, linked.id as string]);
        }
      }
      run(`DELETE FROM blocks WHERE id = ?`, [blockId]);
      run(`UPDATE pages SET updated_at = ? WHERE id = ?`, [now, pageId]);
      return { success: true, message: `已删除 Block ${blockId}`, deletedId: blockId };
    }

    default:
      return { isError: true, error: `不支持的 MCP 工具名: ${name}` };
  }
}
