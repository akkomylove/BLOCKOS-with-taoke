import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { GET as getPages, POST as createPage, PUT as syncPages } from '@/app/api/pages/route';
import { GET as getPageDetail, PUT as updatePage, DELETE as deletePage } from '@/app/api/pages/[id]/route';
import { GET as getPageBlocks, PUT as saveBlocks } from '@/app/api/pages/[id]/blocks/route';
import { POST as restorePage } from '@/app/api/pages/[id]/restore/route';
import * as authUtils from '@/lib/auth-utils';
import { getDb, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('Pages and Blocks Sync Pipeline API', () => {
  const testUserId = 'test-user-sync-' + nanoid(6);

  beforeEach(async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(testUserId);
    await getDb();
    run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      testUserId,
      `${testUserId}@test.com`,
      'Sync Tester',
      'test',
      testUserId,
      Date.now(),
    ]);
  });

  it('should create, list, and batch update pages via PUT /api/pages', async () => {
    // 1. Create page
    const createReq = new NextRequest('http://localhost:3000/api/pages', {
      method: 'POST',
      body: JSON.stringify({ title: '主页面', icon: '🚀' }),
    });
    const createRes = await createPage(createReq);
    expect(createRes.status).toBe(200);
    const { id: pageId, version } = await createRes.json();
    expect(pageId).toBeDefined();
    expect(version).toBe(1);

    // 2. List pages
    const listReq = new NextRequest('http://localhost:3000/api/pages');
    const listRes = await getPages(listReq);
    expect(listRes.status).toBe(200);
    const { pages } = await listRes.json();
    const created = pages.find((p: any) => p.id === pageId);
    expect(created).toBeDefined();
    expect(created.title).toBe('主页面');

    // 3. Batch sync via PUT
    const putReq = new NextRequest('http://localhost:3000/api/pages', {
      method: 'PUT',
      body: JSON.stringify({
        pages: [
          { id: pageId, title: '更新后的主页面', icon: '⭐' },
          { id: nanoid(), title: '新子页面', icon: '📝' },
        ],
      }),
    });
    const putRes = await syncPages(putReq);
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.success).toBe(true);

    // Verify detail
    const detailReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}`);
    const detailRes = await getPageDetail(detailReq, { params: Promise.resolve({ id: pageId }) });
    const detailData = await detailRes.json();
    expect(detailData.page.title).toBe('更新后的主页面');
    expect(detailData.page.icon).toBe('⭐');
    expect(detailData.page.version).toBeGreaterThan(1);
  });

  it('should save and retrieve blocks with full layout, coordinates, and metadata', async () => {
    const pageId = nanoid();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [pageId, testUserId, '画板页面', '🎨', 0, Date.now(), Date.now()]
    );

    const block1Id = nanoid();
    const block2Id = nanoid();
    const mockBlocks = [
      {
        id: block1Id,
        type: 'text',
        title: '产品需求概述',
        content: '# 需求文档内容',
        meta: { tags: ['prd', 'v1'], highlight: 'yellow' },
        parentId: null,
        groupId: 'group-1',
        order: 0,
        x: 120,
        y: 240,
        width: 450,
        height: 280,
        collapsed: false,
        version: 1,
      },
      {
        id: block2Id,
        type: 'todo',
        title: '待办任务',
        content: '完成保存功能测试',
        meta: { checked: true },
        parentId: block1Id,
        groupId: 'group-1',
        order: 1,
        x: 600,
        y: 240,
        width: 320,
        height: 180,
        collapsed: true,
        version: 1,
      },
    ];

    // Save blocks via PUT
    const saveReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ blocks: mockBlocks }),
    });
    const saveRes = await saveBlocks(saveReq, { params: Promise.resolve({ id: pageId }) });
    expect(saveRes.status).toBe(200);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(true);
    expect(saveData.count).toBe(2);

    // Read back blocks via GET
    const getReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}/blocks`);
    const getRes = await getPageBlocks(getReq, { params: Promise.resolve({ id: pageId }) });
    expect(getRes.status).toBe(200);
    const { blocks: loadedBlocks } = await getRes.json();
    expect(loadedBlocks.length).toBe(2);

    const b1 = loadedBlocks.find((b: any) => b.id === block1Id);
    expect(b1.title).toBe('产品需求概述');
    expect(b1.x).toBe(120);
    expect(b1.y).toBe(240);
    expect(b1.width).toBe(450);
    expect(b1.height).toBe(280);
    expect(b1.collapsed).toBe(false);
    expect(b1.groupId).toBe('group-1');
    expect(b1.meta.tags).toEqual(['prd', 'v1']);

    const b2 = loadedBlocks.find((b: any) => b.id === block2Id);
    expect(b2.collapsed).toBe(true);
    expect(b2.meta.checked).toBe(true);
  });

  it('should detect concurrency version conflict and reject stale updates', async () => {
    const pageId = nanoid();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 5, ?, ?)',
      [pageId, testUserId, '并发版本测试页', '⚡', 0, Date.now(), Date.now()]
    );

    // Try to update with stale version 4
    const staleReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: '旧版本提交', version: 4 }),
    });
    const staleRes = await updatePage(staleReq, { params: Promise.resolve({ id: pageId }) });
    expect(staleRes.status).toBe(409);
    const errData = await staleRes.json();
    expect(errData.error).toContain('Conflict');
    expect(errData.currentVersion).toBe(5);

    // Concurrent block update with stale version
    const staleBlocksReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ blocks: [], version: 2 }),
    });
    const staleBlocksRes = await saveBlocks(staleBlocksReq, { params: Promise.resolve({ id: pageId }) });
    expect(staleBlocksRes.status).toBe(409);
  });

  it('should soft delete page and restore from trash', async () => {
    const pageId = nanoid();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [pageId, testUserId, '将被删除的页面', '🗑️', 0, Date.now(), Date.now()]
    );

    // Soft delete
    const delReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}`);
    const delRes = await deletePage(delReq, { params: Promise.resolve({ id: pageId }) });
    expect(delRes.status).toBe(200);

    // Default list should NOT include it
    const listRes = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    const { pages } = await listRes.json();
    expect(pages.find((p: any) => p.id === pageId)).toBeUndefined();

    // Include deleted should show it
    const trashRes = await getPages(new NextRequest('http://localhost:3000/api/pages?includeDeleted=true'));
    const trashData = await trashRes.json();
    const inTrash = trashData.pages.find((p: any) => p.id === pageId);
    expect(inTrash).toBeDefined();
    expect(inTrash.deletedAt).toBeGreaterThan(0);

    // Restore page
    const restoreReq = new NextRequest(`http://localhost:3000/api/pages/${pageId}/restore`, { method: 'POST' });
    const restoreRes = await restorePage(restoreReq, { params: Promise.resolve({ id: pageId }) });
    expect(restoreRes.status).toBe(200);

    // Now it should be back in the normal list
    const finalListRes = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    const { pages: finalPages } = await finalListRes.json();
    expect(finalPages.find((p: any) => p.id === pageId)).toBeDefined();
  });
});
