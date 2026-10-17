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

  it('should prevent IDOR block deletion on permanent delete by non-owner', async () => {
    // User A creates page and block
    const userAPageId = 'page-owner-a-' + nanoid(6);
    const userABlockId = 'block-owner-a-' + nanoid(6);
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [userAPageId, testUserId, 'Owner A Page', '📄', 0, Date.now(), Date.now()]
    );
    run(
      'INSERT INTO blocks (id, page_id, type, title, content, meta, parent_id, group_id, order_index, x, y, width, height, collapsed, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userABlockId, userAPageId, 'text', 'User A Data', 'Secret Content', '{}', null, null, 0, 0, 0, 320, 200, 0, 1, Date.now(), Date.now()]
    );

    // Attacker User B attempts to permanently delete User A's page
    const attackerUserId = 'attacker-user-' + nanoid(6);
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(attackerUserId);

    const delReq = new NextRequest(`http://localhost:3000/api/pages/${userAPageId}?permanent=true`, { method: 'DELETE' });
    const delRes = await deletePage(delReq, { params: Promise.resolve({ id: userAPageId }) });
    expect(delRes.status).toBe(404);

    // Verify User A's blocks are still completely safe and NOT deleted
    const db = await getDb();
    const blocksResult = db.exec(`SELECT * FROM blocks WHERE page_id = '${userAPageId}'`);
    expect(blocksResult.length).toBe(1);
    expect(blocksResult[0].values.length).toBe(1);
  });

  it('should handle multi-tenant doc-guide page ID collision safely without 500 error', async () => {
    // User A has doc-guide
    run(
      'INSERT OR IGNORE INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      ['doc-guide', testUserId, 'User A Guide', '👋', 0, Date.now(), Date.now()]
    );

    // User B tries to sync doc-guide in PUT /api/pages
    const userBId = 'user-b-' + nanoid(6);
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(userBId);
    run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      userBId, `${userBId}@test.com`, 'User B', 'test', userBId, Date.now()
    ]);

    const putReq = new NextRequest('http://localhost:3000/api/pages', {
      method: 'PUT',
      body: JSON.stringify({
        pages: [{ id: 'doc-guide', title: 'User B Guide', icon: '👋' }],
      }),
    });
    const putRes = await syncPages(putReq);
    expect(putRes.status).toBe(200);

    // Check that User B has a page record without throwing constraint error
    const listRes = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    expect(listRes.status).toBe(200);
    const { pages } = await listRes.json();
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should permanently delete page so that re-login or sync does not resurrect it or duplicate guide', async () => {
    const userCId = 'user-c-' + nanoid(6);
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(userCId);
    run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      userCId, `${userCId}@test.com`, 'User C', 'test', userCId, Date.now()
    ]);

    // 1. Create 3 pages: 1 guide and 2 custom
    const p1Id = nanoid();
    const p2Id = nanoid();
    const syncReq = new NextRequest('http://localhost:3000/api/pages', {
      method: 'PUT',
      body: JSON.stringify({
        pages: [
          { id: 'doc-guide', title: '👋 欢迎使用 BlockOS ｜ 新手快速入门指南', icon: '👋' },
          { id: p1Id, title: '协同白板与流程图', icon: '🎨' },
          { id: p2Id, title: '架构推演', icon: '💻' },
        ],
      }),
    });
    const syncRes = await syncPages(syncReq);
    expect(syncRes.status).toBe(200);

    // Verify 3 pages in list
    const listRes1 = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    const { pages: initialPages } = await listRes1.json();
    expect(initialPages.length).toBe(3);

    // 2. User deletes p1Id and p2Id permanently
    const del1 = await deletePage(
      new NextRequest(`http://localhost:3000/api/pages/${p1Id}?permanent=true`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: p1Id }) }
    );
    expect(del1.status).toBe(200);

    const del2 = await deletePage(
      new NextRequest(`http://localhost:3000/api/pages/${p2Id}?permanent=true`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: p2Id }) }
    );
    expect(del2.status).toBe(200);

    // 3. Re-login / subsequent GET /api/pages
    const listRes2 = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    const { pages: afterDeletePages } = await listRes2.json();
    expect(afterDeletePages.length).toBe(1);
    expect(afterDeletePages[0].title).toContain('新手快速入门指南');
    expect(afterDeletePages.find((p: any) => p.id === p1Id)).toBeUndefined();
    expect(afterDeletePages.find((p: any) => p.id === p2Id)).toBeUndefined();

    // 4. Test guide deduplication: if multiple guide records exist with similar title, only 1 is returned
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [`doc-guide-dup-${userCId}`, userCId, '👋 欢迎使用 BlockOS ｜ 新手快速入门指南 (副本)', '👋', 1, Date.now(), Date.now()]
    );
    const listRes3 = await getPages(new NextRequest('http://localhost:3000/api/pages'));
    const { pages: deduplicatedPages } = await listRes3.json();
    expect(deduplicatedPages.length).toBe(1);
    expect(deduplicatedPages.filter((p: any) => p.title.includes('新手快速入门指南') || p.title.includes('欢迎使用 BlockOS')).length).toBe(1);
  });
});
