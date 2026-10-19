import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
import * as authUtils from '@/lib/auth-utils';
import { getDb, run } from '@/lib/db';
import { GET, PUT, DELETE } from '@/app/api/workspace/activity/route';
import { nanoid } from 'nanoid';
let userId: string, pageId: string;
beforeEach(async () => {
  await getDb(); userId = nanoid(); pageId = nanoid();
  run('INSERT INTO users (id, email, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?)', [userId, `${userId}@example.test`, 'test', userId, 1]);
  run('INSERT INTO pages (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [pageId, userId, 'test', 1, 1]);
  vi.spyOn(authUtils, 'getUserId').mockResolvedValue(userId);
});
const request = (body: unknown) => new Request('http://localhost/api/workspace/activity', { method: 'PUT', body: JSON.stringify(body) });
const read = () => GET(new Request('http://localhost/api/workspace/activity'));
describe('account activity storage', () => {
  it('stores snapshots, undo cursor and logs independently of browser storage, with retry deduplication', async () => {
    const payload = { logs: [{ id: 'log-a', timestamp: 1, result: 'created', ruleId: 'CanvasAgent', blockId: 'b' }], history: [{ id: 'version-a', pageId, timestamp: 1, blocks: [], action: 'before' }, { id: 'version-b', pageId, timestamp: 2, blocks: [{ id: 'b' }], action: 'after' }], cursorId: 'version-a' };
    expect((await PUT(request(payload))).status).toBe(200);
    expect((await PUT(request(payload))).status).toBe(200);
    const data = await (await read()).json();
    expect(data.logs).toHaveLength(1); expect(data.history).toHaveLength(2);
    expect(data.cursors[pageId]).toBe('version-a');
  });
  it('never returns another account activity or accepts snapshots for a foreign page', async () => {
    await PUT(request({ logs: [{ id: 'private-log', timestamp: 1, result: 'private' }], history: [{ id: 'foreign', pageId: 'not-owned', timestamp: 1, blocks: [] }] }));
    expect((await (await read()).json()).history).toHaveLength(0);
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue('another-user');
    expect((await (await read()).json()).logs).toHaveLength(0);
  });
  it('explicit clearing affects only logs, keeping history', async () => {
    await PUT(request({ logs: [{ id: 'log', timestamp: 1, result: 'log' }], history: [{ id: 'history', pageId, timestamp: 1, blocks: [] }] }));
    await DELETE(new Request('http://localhost/api/workspace/activity', { method: 'DELETE' }));
    // A second device's stale cache cannot resurrect a cleared log.
    await PUT(request({ logs: [{ id: 'log', timestamp: 1, result: 'log' }], history: [] }));
    const data = await (await read()).json();
    expect(data.logs).toHaveLength(0); expect(data.history).toHaveLength(1);
  });
});
