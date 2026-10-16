import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
import * as authUtils from '@/lib/auth-utils';
import { getDb, run } from '@/lib/db';
import { GET as listPages, POST as createPage, PUT as syncPages } from '@/app/api/pages/route';
import { GET as getPage, PUT as editPage } from '@/app/api/pages/[id]/route';
import { PUT as saveBlocks } from '@/app/api/pages/[id]/blocks/route';

describe('Mobile shared documents, outline and inbox API', () => {
  const userId = `mobile-${nanoid()}`;
  beforeEach(async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(userId);
    await getDb();
    run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, `${userId}@test.invalid`, 'Mobile reader', 'test', userId, Date.now()]);
  });
  const request = (path: string, body: unknown) => new NextRequest(`http://localhost${path}`, { method: 'PUT', body: JSON.stringify(body) });

  it('stores a multi-block outline without changing any desktop layout fields', async () => {
    const id = nanoid(); const now = Date.now();
    const created = await createPage(request('/api/pages', { id, title: '退款文档' }));
    expect(created.status).toBe(200);
    const blocks = ['a', 'b'].map((suffix, index) => ({ id: `${id}-${suffix}`, type: 'text', title: suffix, content: '原文', meta: { tags: ['需求'] }, parentId: null, order: index, x: 600 - index * 400, y: 900, width: 500, height: 300, createdAt: now, updatedAt: now }));
    const saved = await saveBlocks(request(`/api/pages/${id}/blocks`, { blocks, version: 1 }), { params: Promise.resolve({ id }) });
    const version = (await saved.json()).pageVersion;
    const chapters = [{ id: 'refund', title: '退款规则', blockIds: blocks.map((block) => block.id).reverse() }];
    const updated = await editPage(request(`/api/pages/${id}`, { chapters, version }), { params: Promise.resolve({ id }) });
    expect(updated.status).toBe(200);
    const result = await getPage(new NextRequest(`http://localhost/api/pages/${id}`), { params: Promise.resolve({ id }) });
    const data = await result.json();
    expect(data.page.chapters).toEqual(chapters);
    expect(data.blocks[0]).toMatchObject({ x: 600, y: 900, width: 500, height: 300, content: '原文' });
    const stale = await editPage(request(`/api/pages/${id}`, { chapters, version }), { params: Promise.resolve({ id }) });
    expect(stale.status).toBe(409);
  });

  it('rejects an outline that references content from another document', async () => {
    const id = nanoid();
    await createPage(request('/api/pages', { id, title: '文档' }));
    const result = await editPage(request(`/api/pages/${id}`, { version: 1, chapters: [{ id: 'one', title: '章节', blockIds: ['foreign-block'] }] }), { params: Promise.resolve({ id }) });
    expect(result.status).toBe(400);
  });

  it('persists folder navigation and an inbox using the same documents API', async () => {
    const folderId = nanoid(), id = nanoid(), inboxId = nanoid();
    await syncPages(request('/api/pages', { folders: [{ id: folderId, name: '需求资料', createdAt: Date.now() }], pages: [{ id, title: '需求说明', folderId }] }));
    await createPage(request('/api/pages', { id: inboxId, title: '随手记收件箱', kind: 'inbox' }));
    const response = await listPages(new NextRequest('http://localhost/api/pages'));
    const data = await response.json();
    expect(data.folders).toEqual(expect.arrayContaining([expect.objectContaining({ id: folderId, name: '需求资料' })]));
    expect(data.pages).toEqual(expect.arrayContaining([expect.objectContaining({ id, folderId }), expect.objectContaining({ id: inboxId, kind: 'inbox' })]));
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue('someone-else');
    const other = await getPage(new NextRequest(`http://localhost/api/pages/${inboxId}`), { params: Promise.resolve({ id: inboxId }) });
    expect(other.status).toBe(404);
  });
});
