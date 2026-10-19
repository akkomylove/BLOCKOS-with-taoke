import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const cloud = vi.hoisted(() => ({ row: null as null | { payload: string; revision: number }, failRead: false, failWrite: false, writes: 0, gate: null as null | (() => Promise<void>) }));
vi.mock('@neondatabase/serverless', () => ({ neon: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = strings.join('?');
  if (sql.startsWith('SELECT payload')) { if (cloud.failRead) throw new Error('offline'); return cloud.row ? [{ ...cloud.row }] : []; }
  if (sql.startsWith('UPDATE blockos_db_sync') || sql.startsWith('INSERT INTO blockos_db_sync')) {
    if (cloud.gate) await cloud.gate();
    if (cloud.failWrite) throw new Error('commit failed');
    if (sql.startsWith('UPDATE') ? cloud.row?.revision !== values[2] : !!cloud.row) return [];
    cloud.row = { payload: String(values[0]), revision: (cloud.row?.revision || 0) + 1 };
    cloud.writes++;
    return [{ revision: cloud.row.revision }];
  }
  return [];
} }));
import { databaseRequest, getDb, run, query, saveDb, DatabaseConflict } from '@/lib/db';
import { withDatabaseRequest } from '@/lib/database-request';
const add = async (id: string) => { await getDb(); run('INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)', [id, 'demo-admin-001', id, 1]); saveDb(); return Response.json({ success: true }); };
beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('POSTGRES_URL', 'postgres://local-test.invalid/database');
  cloud.row = null; cloud.failRead = false; cloud.failWrite = false; cloud.writes = 0; cloud.gate = null;
  await databaseRequest(async () => { await getDb(); return Response.json({}); });
});
afterEach(() => vi.unstubAllEnvs());

describe('cloud snapshot request durability', () => {
  it('does not acknowledge success before the remote commit completes', async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    cloud.gate = () => { entered(); return new Promise<void>(resolve => { release = resolve; }); };
    let done = false;
    const pending = databaseRequest(() => add('delayed')).then(result => { done = true; return result; });
    await started;
    expect(done).toBe(false);
    cloud.gate = null; release();
    expect((await pending).status).toBe(200);
    await databaseRequest(async () => { await getDb(); expect(query('SELECT id FROM folders WHERE id = ?', ['delayed'])).toHaveLength(1); return Response.json({}); });
  });
  it('rejects an out-of-order stale snapshot and preserves both batches after retry', async () => {
    let release!: () => void;
    let loaded!: () => void;
    const started = new Promise<void>(resolve => { loaded = resolve; });
    const stale = databaseRequest(async () => { await add('batch-a'); loaded(); await new Promise<void>(resolve => { release = resolve; }); return Response.json({}); });
    const observed = stale.catch(error => error);
    await started;
    await databaseRequest(() => add('batch-b'));
    release();
    expect(await observed).toBeInstanceOf(DatabaseConflict);
    await databaseRequest(() => add('batch-a'));
    await databaseRequest(async () => { await getDb(); expect(query("SELECT id FROM folders WHERE id IN ('batch-a', 'batch-b')")).toHaveLength(2); return Response.json({}); });
  });
  it('returns 503 on commit failure without publishing the in-memory mutation', async () => {
    const before = cloud.row!.payload;
    cloud.failWrite = true;
    const result = await withDatabaseRequest(() => add('lost'))();
    expect(result.status).toBe(503);
    expect(cloud.row!.payload).toBe(before);
    cloud.failWrite = false;
    await databaseRequest(async () => { await getDb(); expect(query('SELECT id FROM folders WHERE id = ?', ['lost'])).toHaveLength(0); return Response.json({}); });
  });
  it('fails closed when cloud loading fails, rather than uploading a seeded database', async () => {
    cloud.failRead = true;
    const result = await withDatabaseRequest(() => add('offline'))();
    expect(result.status).toBe(503);
    expect(cloud.writes).toBe(1);
  });
  it('does not publish another snapshot for an unchanged read-only request', async () => {
    const count = cloud.writes;
    await databaseRequest(async () => { await getDb(); return Response.json({}); });
    expect(cloud.writes).toBe(count);
  });
});
