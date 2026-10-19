import { withDatabaseRequest } from '@/lib/database-request';
import { getUserId } from '@/lib/auth-utils';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { createHash } from 'node:crypto';

async function read() {
  const userId = await getUserId();
  await getDb();
  return Response.json({
    logs: query("SELECT payload FROM workspace_activity WHERE user_id = ? AND kind = 'log' ORDER BY created_at DESC LIMIT 100", [userId]).map(row => JSON.parse(String(row.payload))),
    history: query("SELECT payload FROM workspace_activity WHERE user_id = ? AND kind = 'history' ORDER BY created_at DESC LIMIT 50", [userId]).map(row => JSON.parse(String(row.payload))).reverse(),
    cursors: Object.fromEntries(query('SELECT page_id, snapshot_id FROM workspace_cursors WHERE user_id = ?', [userId]).map(row => [row.page_id, row.snapshot_id])),
    clearedLogIds: query("SELECT id FROM workspace_activity WHERE user_id = ? AND kind = 'log_tombstone'", [userId]).map(row => row.id),
  });
}

async function write(request: Request) {
  const userId = await getUserId();
  const raw = await request.text();
  if (raw.length > 8_000_000) return Response.json({ error: '历史记录过大，请分段保存' }, { status: 413 });
  const body = JSON.parse(raw);
  if (!Array.isArray(body.logs) || !Array.isArray(body.history) || body.logs.length > 100 || body.history.length > 50) return Response.json({ error: '记录格式无效' }, { status: 400 });
  await getDb();
  const pages = new Set(query('SELECT id FROM pages WHERE user_id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [userId]).map(row => row.id));
  const clearedLogs = new Set(query("SELECT id FROM workspace_activity WHERE user_id = ? AND kind = 'log_tombstone'", [userId]).map(row => row.id));
  transaction(() => {
    for (const log of body.logs) {
      if (!log || typeof log.id !== 'string' || typeof log.result !== 'string' || !Number.isFinite(log.timestamp) || clearedLogs.has(log.id)) continue;
      const payload = { id: log.id, timestamp: log.timestamp, result: log.result, ruleId: String(log.ruleId || ''), blockId: String(log.blockId || '') };
      run("INSERT OR IGNORE INTO workspace_activity (user_id, id, kind, page_id, payload, created_at) VALUES (?, ?, 'log', NULL, ?, ?)", [userId, log.id, JSON.stringify(payload), log.timestamp]);
    }
    for (const entry of body.history) {
      if (!entry || !pages.has(entry.pageId) || !Array.isArray(entry.blocks) || !Number.isFinite(entry.timestamp)) continue;
      const id = typeof entry.id === 'string' ? entry.id : createHash('sha256').update(JSON.stringify(entry)).digest('hex');
      const payload = { id, pageId: entry.pageId, blocks: entry.blocks, timestamp: entry.timestamp, action: String(entry.action || '编辑'), blockCount: entry.blocks.length };
      run("INSERT OR IGNORE INTO workspace_activity (user_id, id, kind, page_id, payload, created_at) VALUES (?, ?, 'history', ?, ?, ?)", [userId, id, entry.pageId, JSON.stringify(payload), entry.timestamp]);
    }
    // Only remove snapshots that this device previously loaded, then explicitly
    // dropped when branching its own undo timeline. Other devices' entries survive.
    if (Array.isArray(body.removedHistoryIds)) for (const id of body.removedHistoryIds.slice(0, 100)) {
      if (typeof id === 'string') run("DELETE FROM workspace_activity WHERE user_id = ? AND kind = 'history' AND id = ?", [userId, id]);
    }
    const cursor = body.history.find((entry: { id?: string }) => entry.id === body.cursorId);
    if (cursor && pages.has(cursor.pageId)) run('INSERT OR REPLACE INTO workspace_cursors (user_id, page_id, snapshot_id) VALUES (?, ?, ?)', [userId, cursor.pageId, cursor.id]);
    if (body.cursors && typeof body.cursors === 'object') for (const [pageId, id] of Object.entries(body.cursors)) {
      if (pages.has(pageId) && typeof id === 'string' && body.history.some((entry: { pageId: string; id: string }) => entry.pageId === pageId && entry.id === id)) run('INSERT OR REPLACE INTO workspace_cursors (user_id, page_id, snapshot_id) VALUES (?, ?, ?)', [userId, pageId, id]);
    }
    for (const kind of ['log', 'history']) run('DELETE FROM workspace_activity WHERE user_id = ? AND kind = ? AND id NOT IN (SELECT id FROM workspace_activity WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT ?)', [userId, kind, userId, kind, kind === 'log' ? 100 : 50]);
  });
  saveDb();
  return Response.json({ success: true });
}

async function clear() {
  const userId = await getUserId();
  await getDb();
  transaction(() => {
    for (const row of query("SELECT id FROM workspace_activity WHERE user_id = ? AND kind = 'log'", [userId])) run("INSERT OR IGNORE INTO workspace_activity (user_id, id, kind, payload, created_at) VALUES (?, ?, 'log_tombstone', '{}', ?)", [userId, String(row.id), Date.now()]);
    run("DELETE FROM workspace_activity WHERE user_id = ? AND kind = 'log'", [userId]);
  });
  saveDb();
  return Response.json({ success: true });
}
function authenticated(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith('Unauthorized')) return Response.json({ error: '请先登录' }, { status: 401 });
      throw error;
    }
  };
}
export const GET = withDatabaseRequest(authenticated(read));
export const PUT = withDatabaseRequest(authenticated(write));
export const DELETE = withDatabaseRequest(authenticated(clear));
