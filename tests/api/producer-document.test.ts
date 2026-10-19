import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { GET as getBlocks, PUT as saveBlocks } from '@/app/api/pages/[id]/blocks/route';
import { GET as getPage, PUT as updatePage } from '@/app/api/pages/[id]/route';
import { GET as getPages, PUT as syncPages } from '@/app/api/pages/route';
import { getDb, query, run } from '@/lib/db';
import * as authUtils from '@/lib/auth-utils';
import { useBlockStore } from '@/store/blockStore';

describe('Producer Document Cloud Rendering & Synchronization Tests', () => {
  let currentUserId = 'test-user-1';

  beforeEach(async () => {
    vi.spyOn(authUtils, 'getUserId').mockImplementation(async () => currentUserId);
    await getDb();
    run('DELETE FROM blocks');
    run('DELETE FROM pages');
    run('DELETE FROM folders');
    currentUserId = 'test-user-1';
  });

  it('provisions producer document with 100% matched parentId for nested sub-blocks', async () => {
    // User 1 requests doc-producers blocks
    currentUserId = 'test-user-1';
    const req1 = new NextRequest('http://localhost:3000/api/pages/doc-producers/blocks');
    const res1 = await getBlocks(req1, { params: Promise.resolve({ id: 'doc-producers' }) });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(Array.isArray(data1.blocks)).toBe(true);
    expect(data1.blocks.length).toBeGreaterThan(0);

    // Verify all children with parentId have a parent that exists in the returned blocks
    const blockIds1 = new Set(data1.blocks.map((b: any) => b.id));
    for (const b of data1.blocks) {
      if (b.parentId) {
        expect(blockIds1.has(b.parentId)).toBe(true);
      }
      if (typeof b.content === 'string') {
        expect(b.content.startsWith('data:image')).toBe(false);
      }
    }

    // Now User 2 visits (simulating multi-tenant ID conflict)
    currentUserId = 'test-user-2';
    const req2 = new NextRequest('http://localhost:3000/api/pages/doc-producers/blocks');
    const res2 = await getBlocks(req2, { params: Promise.resolve({ id: 'doc-producers' }) });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.blocks.length).toBe(data1.blocks.length);

    // Critical assertion: for User 2, all parentIds must match User 2 assigned block IDs
    const blockIds2 = new Set(data2.blocks.map((b: any) => b.id));
    for (const b of data2.blocks) {
      if (b.parentId) {
        expect(blockIds2.has(b.parentId)).toBe(true);
      }
      if (typeof b.content === 'string') {
        expect(b.content.startsWith('data:image')).toBe(false);
      }
    }
  });

  it('handles PUT /api/pages/doc-producers/blocks gracefully without 404 even with tenant suffix in DB', async () => {
    currentUserId = 'tenant-999';
    const now = Date.now();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['doc-producers-tenant-999', 'tenant-999', 'Block OS 团队制作人文档', '📓', 1, 1, now, now]
    );

    // Client sends PUT to /api/pages/doc-producers/blocks (using original alias id)
    const testBlocks = [
      { id: 'blk-parent', type: 'text', title: '01 想法', content: 'test', parentId: null, order: 0 },
      { id: 'blk-child', type: 'callout', title: '子卡片', content: 'nested', parentId: 'blk-parent', order: 1 }
    ];

    const putReq = new NextRequest('http://localhost:3000/api/pages/doc-producers/blocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: testBlocks })
    });

    const putRes = await saveBlocks(putReq, { params: Promise.resolve({ id: 'doc-producers' }) });
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.success).toBe(true);

    // GET should return the saved blocks under doc-producers-tenant-999
    const getReq = new NextRequest('http://localhost:3000/api/pages/doc-producers/blocks');
    const getRes = await getBlocks(getReq, { params: Promise.resolve({ id: 'doc-producers' }) });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.blocks.length).toBe(2);
    expect(getData.blocks[1].parentId).toBe(getData.blocks[0].id);
  });

  it('self-heals corrupted legacy blocks where parent_id was not suffixed', async () => {
    currentUserId = 'legacy-user';
    const targetPageId = 'doc-producers-legacy-user';
    const now = Date.now();
    run(
      'INSERT INTO pages (id, user_id, title, icon, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [targetPageId, 'legacy-user', 'Block OS 团队制作人文档', '📓', 1, 1, now, now]
    );

    // Insert parent with suffix, but child with unsuffixed parent_id and legacy base64
    run(
      `INSERT INTO blocks (id, page_id, type, title, content, meta, parent_id, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['blk_vLvUjs14LT7UPN5t-legacy-user', targetPageId, 'text', 'Parent', 'content', '{}', null, 0, now, now]
    );
    run(
      `INSERT INTO blocks (id, page_id, type, title, content, meta, parent_id, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['blk_q9aavvabIn8PDj7Y', targetPageId, 'media', 'Child', 'data:image/svg+xml;base64,PHN2Z...', '{}', 'blk_vLvUjs14LT7UPN5t', 1, now, now]
    );

    // Request blocks - self healing should fix parent_id and replace base64 content
    const req = new NextRequest('http://localhost:3000/api/pages/doc-producers/blocks');
    const res = await getBlocks(req, { params: Promise.resolve({ id: 'doc-producers' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.blocks.length).toBe(2);

    const child = data.blocks.find((b: any) => b.id === 'blk_q9aavvabIn8PDj7Y');
    expect(child).toBeDefined();
    expect(child.parentId).toBe('blk_vLvUjs14LT7UPN5t-legacy-user');
    expect(child.content).toBe('/assets/co-creation/blk_q9aavvabIn8PDj7Y.svg');
  });

  it('remaps parentId when creating page from template in blockStore', () => {
    const store = useBlockStore.getState();
    const newPageId = store.addPageFromTemplate('template-producers');
    expect(newPageId).toBeDefined();

    const createdBlocks = useBlockStore.getState().pageBlocks[newPageId];
    expect(createdBlocks).toBeDefined();
    expect(createdBlocks.length).toBeGreaterThan(0);

    const blockIds = new Set(createdBlocks.map(b => b.id));
    for (const b of createdBlocks) {
      if (b.parentId) {
        expect(blockIds.has(b.parentId)).toBe(true);
      }
    }
  });
});
