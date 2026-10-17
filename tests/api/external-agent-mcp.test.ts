import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { NextRequest } from 'next/server';
import { getDb, run, query, saveDb } from '@/lib/db';
import { generateApiKey, verifyApiKeyToken, listApiKeys, revokeApiKey } from '@/lib/api-keys';
import { GET as getKeys, POST as postKeys, DELETE as deleteKeys } from '@/app/api/open/keys/route';
import { GET as getCanvas, POST as postCanvas } from '@/app/api/open/v1/canvas/route';
import { POST as postBlocks, PATCH as patchBlocks, DELETE as deleteBlocks } from '@/app/api/open/v1/blocks/route';
import { POST as postMcp } from '@/app/api/open/v1/mcp/route';
import { nanoid } from 'nanoid';

describe('External Agent Integration: API Keys, Open API & MCP Server', () => {
  const TEST_USER_ID = 'demo-admin-001';
  let testPageId: string;

  beforeEach(async () => {
    await getDb();
    testPageId = `page_test_${nanoid(8)}`;
    const now = Date.now();

    // 创建测试页面
    run(
      `INSERT OR REPLACE INTO pages (id, user_id, title, version, created_at, updated_at) 
       VALUES (?, ?, '测试外部 Agent 画布', 1, ?, ?)`,
      [testPageId, TEST_USER_ID, now, now]
    );
    saveDb();
  });

  describe('1. API Key Lifecycle & Verification', () => {
    it('should generate a valid bk_live_ API key and verify its hash', async () => {
      const keyObj = await generateApiKey(TEST_USER_ID, 'Claude Desktop Agent', ['read', 'write'], 30);
      expect(keyObj.rawKey).toMatch(/^bk_live_[a-f0-9]{64}$/);
      expect(keyObj.name).toBe('Claude Desktop Agent');
      expect(keyObj.userId).toBe(TEST_USER_ID);

      // 验证 Key
      const verified = await verifyApiKeyToken(keyObj.rawKey);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(TEST_USER_ID);
      expect(verified?.permissions).toContain('write');
    });

    it('should reject invalid, forged, or revoked API keys', async () => {
      const forgedKey = 'bk_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const verifyForged = await verifyApiKeyToken(forgedKey);
      expect(verifyForged).toBeNull();

      // 生成后撤销
      const keyObj = await generateApiKey(TEST_USER_ID, 'Temporary Agent', ['read']);
      await revokeApiKey(keyObj.id, TEST_USER_ID);

      const verifyRevoked = await verifyApiKeyToken(keyObj.rawKey);
      expect(verifyRevoked).toBeNull();
    });

    it('should list all API keys belonging to the user', async () => {
      await generateApiKey(TEST_USER_ID, 'Agent 1');
      await generateApiKey(TEST_USER_ID, 'Agent 2');

      const keys = await listApiKeys(TEST_USER_ID);
      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys.some((k) => k.name === 'Agent 1')).toBe(true);
      expect(keys.some((k) => k.name === 'Agent 2')).toBe(true);
    });
  });

  describe('2. Open API Endpoints with Bearer Token', () => {
    let rawApiKey: string;

    beforeEach(async () => {
      const generated = await generateApiKey(TEST_USER_ID, 'E2E Probe Agent', ['read', 'write']);
      rawApiKey = generated.rawKey;
    });

    it('should reject unauthenticated requests without Bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/open/v1/canvas', {
        method: 'GET',
      });
      const res = await getCanvas(req);
      expect(res.status).toBe(401);
    });

    it('should allow external Agent to create block and child block via /api/open/v1/blocks', async () => {
      // 1. 创建父 Block
      const createParentReq = new NextRequest('http://localhost:3000/api/open/v1/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          pageId: testPageId,
          type: 'text',
          title: 'PRD 需求母卡片',
          content: '核心目标：为外部 Agent 提供统一操作端点',
        }),
      });

      const parentRes = await postBlocks(createParentReq);
      expect(parentRes.status).toBe(201);
      const parentData = await parentRes.json();
      const parentId = parentData.block.id;
      expect(parentId).toBeTruthy();

      // 2. 创建子 Block（挂载在 parentId 下）
      const createChildReq = new NextRequest('http://localhost:3000/api/open/v1/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          pageId: testPageId,
          type: 'todo',
          title: '子任务 1',
          content: '外部 Agent 自动化验收子项',
          parentId,
        }),
      });

      const childRes = await postBlocks(createChildReq);
      expect(childRes.status).toBe(201);
      const childData = await childRes.json();
      expect(childData.block.parentId).toBe(parentId);

      // 3. 读取画布，验证 blockTree 中的父子嵌套结构
      const getCanvasReq = new NextRequest(`http://localhost:3000/api/open/v1/canvas?pageId=${testPageId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawApiKey}` },
      });
      const canvasRes = await getCanvas(getCanvasReq);
      expect(canvasRes.status).toBe(200);
      const canvasData = await canvasRes.json();

      expect(canvasData.totalCount).toBe(2);
      expect(canvasData.blockTree.length).toBe(1); // 根节点只有父卡片 1 个
      expect(canvasData.blockTree[0].children.length).toBe(1); // 子 Block 挂在 children 下
      expect(canvasData.blockTree[0].children[0].id).toBe(childData.block.id);
    });

    it('should patch block to decouple subblock', async () => {
      // 创建父与子
      const pId = `p_${nanoid(8)}`;
      const cId = `c_${nanoid(8)}`;
      const now = Date.now();
      run(
        `INSERT INTO blocks (id, page_id, type, title, content, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at) 
         VALUES (?, ?, 'text', 'P', 'P content', NULL, 0, 40, 40, 400, 200, 0, 1, ?, ?),
                (?, ?, 'text', 'C', 'C content', ?, 1, 480, 40, 400, 200, 0, 1, ?, ?)`,
        [pId, testPageId, now, now, cId, testPageId, pId, now, now]
      );
      saveDb();

      // PATCH 解除子 Block
      const patchReq = new NextRequest('http://localhost:3000/api/open/v1/blocks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          id: cId,
          parentId: null,
        }),
      });

      const patchRes = await patchBlocks(patchReq);
      expect(patchRes.status).toBe(200);

      const check = query(`SELECT parent_id FROM blocks WHERE id = ?`, [cId]);
      expect(check[0].parent_id).toBeNull();
    });
  });

  describe('3. Model Context Protocol (MCP) Standard Server Endpoint', () => {
    let rawApiKey: string;

    beforeEach(async () => {
      const generated = await generateApiKey(TEST_USER_ID, 'MCP Agent Client', ['read', 'write']);
      rawApiKey = generated.rawKey;
    });

    it('should respond to MCP initialize method', async () => {
      const req = new NextRequest('http://localhost:3000/api/open/v1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.serverInfo.name).toBe('blockos-mcp-server');
    });

    it('should list all MCP tools via tools/list', async () => {
      const req = new NextRequest('http://localhost:3000/api/open/v1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('read_canvas');
      expect(toolNames).toContain('create_block');
      expect(toolNames).toContain('set_subblock');
      expect(toolNames).toContain('batch_create_hierarchy');
      expect(toolNames).toContain('create_link');
    });

    it('should execute batch_create_hierarchy tool call to create parent and subblocks', async () => {
      const req = new NextRequest('http://localhost:3000/api/open/v1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'batch_create_hierarchy',
            arguments: {
              pageId: testPageId,
              parentBlock: {
                title: '【Agent 自动化需求】',
                content: '由外部 Claude Agent 通过 MCP 协议批量注入的顶层需求',
                type: 'text',
              },
              subBlocks: [
                { title: '子任务 A', content: '自动化数据管道对接', type: 'todo' },
                { title: '子任务 B', content: '自动化单元测试覆盖', type: 'todo' },
              ],
            },
          },
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      const contentText = data.result.content[0].text;
      const parsedResult = JSON.parse(contentText);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.subBlocks.length).toBe(2);
      expect(parsedResult.parentId).toBeTruthy();

      // 验证数据库真实持久化并带有正确的 parent_id
      const subRows = query(`SELECT id, parent_id FROM blocks WHERE parent_id = ?`, [parsedResult.parentId]);
      expect(subRows.length).toBe(2);
    });

    it('should execute set_subblock tool call to set an existing block as child', async () => {
      const pId = `parent_mcp_${nanoid(6)}`;
      const cId = `child_mcp_${nanoid(6)}`;
      const now = Date.now();
      run(
        `INSERT INTO blocks (id, page_id, type, title, content, parent_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at) 
         VALUES (?, ?, 'text', 'Parent', 'Content', NULL, 0, 40, 40, 400, 200, 0, 1, ?, ?),
                (?, ?, 'text', 'Child', 'Content', NULL, 1, 40, 300, 400, 200, 0, 1, ?, ?)`,
        [pId, testPageId, now, now, cId, testPageId, now, now]
      );
      saveDb();

      const req = new NextRequest('http://localhost:3000/api/open/v1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'set_subblock',
            arguments: {
              blockId: cId,
              parentId: pId,
            },
          },
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      const parsed = JSON.parse(data.result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.parentId).toBe(pId);

      const check = query(`SELECT parent_id FROM blocks WHERE id = ?`, [cId]);
      expect(check[0].parent_id).toBe(pId);
    });
  });
});
