import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }));

import { POST } from '@/app/api/open/v1/mcp/route';
import { generateApiKey } from '@/lib/api-keys';
import { getDb, query, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('MCP protocol and tool boundaries', () => {
  let key: string;
  let page: string;
  let otherPage: string;
  let foreignPage: string;

  const request = (body: unknown, token = key) => POST(new NextRequest('http://localhost/api/open/v1/mcp', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  const rpc = async (method: string, params: unknown = {}, token = key) => {
    const res = await request({ jsonrpc: '2.0', id: 'probe', method, params }, token);
    return { status: res.status, body: await res.json() };
  };
  const call = async (name: string, args: unknown, token = key) => (await rpc('tools/call', { name, arguments: args }, token)).body;
  const create = async (args: Record<string, unknown> = {}) => {
    const res = await call('create_block', { pageId: page, content: 'probe', ...args });
    return JSON.parse(res.result.content[0].text).block.id as string;
  };

  beforeEach(async () => {
    await getDb();
    key = (await generateApiKey('demo-admin-001', 'MCP boundary probe')).rawKey;
    [page, otherPage, foreignPage] = [nanoid(), nanoid(), nanoid()];
    for (const [id, owner] of [[page, 'demo-admin-001'], [otherPage, 'demo-admin-001'], [foreignPage, 'demo-emp-001']]) {
      run('INSERT INTO pages (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [id, owner, 'MCP probe', Date.now(), Date.now()]);
    }
  });

  it('accepts initialized notifications without a JSON-RPC response', async () => {
    const res = await request({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe('');
  });

  it('supports ping and preserves a zero request id', async () => {
    const res = await request({ jsonrpc: '2.0', id: 0, method: 'ping' });
    expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 0, result: {} });
  });

  it('negotiates the Streamable HTTP protocol version', async () => {
    const { body } = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'probe', version: '1' } });
    expect(body.result.protocolVersion).toBe('2025-03-26');
  });

  it.each([null, [], { method: 'ping', id: 1 }, { jsonrpc: '1.0', method: 'ping', id: 1 }].map(payload => ({ payload })))('rejects an invalid JSON-RPC envelope: $payload', async ({ payload }) => {
    const res = await request(payload);
    expect((await res.json()).error.code).toBe(-32600);
  });

  it('reports malformed JSON as a parse error', async () => {
    const res = await POST(new NextRequest('http://localhost/api/open/v1/mcp', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: '{broken',
    }));
    expect((await res.json()).error.code).toBe(-32700);
  });

  it('does not execute a tools/call notification', async () => {
    const res = await request({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'create_block', arguments: { pageId: page, content: 'must not be written' } } });
    expect(res.status).toBe(202);
    expect(query('SELECT id FROM blocks WHERE page_id = ?', [page])).toHaveLength(0);
  });

  it.each([
    ['create_block', {}], ['create_block', { content: 123 }], ['create_block', { content: 'x', type: 'invalid' }],
    ['set_subblock', {}], ['delete_block', {}], ['create_link', { fromBlockId: 'a' }],
    ['batch_create_hierarchy', { parentBlock: { content: 'p' }, subBlocks: [{ content: 'ok' }, {}] }],
  ])('rejects invalid tool arguments without writing: %s %j', async (name, args) => {
    const res = await call(name, { pageId: page, ...args });
    expect(res.error?.code).toBe(-32602);
    expect(res.id).toBe('probe');
    expect(query('SELECT id FROM blocks WHERE page_id = ?', [page])).toHaveLength(0);
  });

  it('returns a protocol error for an unknown tool', async () => {
    expect((await call('missing_tool', {})).error?.code).toBe(-32602);
  });

  it('rolls back the entire batch when a database write fails after creating the parent', async () => {
    run(`CREATE TRIGGER mcp_probe_fail BEFORE INSERT ON blocks
      WHEN NEW.content = 'force rollback' BEGIN SELECT RAISE(ABORT, 'probe failure'); END`);
    try {
      const res = await call('batch_create_hierarchy', {
        pageId: page, parentBlock: { content: 'parent' }, subBlocks: [{ content: 'first child' }, { content: 'force rollback' }],
      });
      expect(res.id).toBe('probe');
      expect(res.result.isError).toBe(true);
      expect(query('SELECT id FROM blocks WHERE page_id = ?', [page])).toHaveLength(0);
    } finally {
      run('DROP TRIGGER mcp_probe_fail');
    }
  });

  it('denies writes using a read-only key', async () => {
    const readKey = (await generateApiKey('demo-admin-001', 'read only', ['read'])).rawKey;
    expect((await call('read_canvas', { pageId: page }, readKey)).result.isError).toBe(false);
    const res = await call('create_block', { pageId: page, content: 'denied' }, readKey);
    expect(res.result.isError).toBe(true);
    expect(query('SELECT id FROM blocks WHERE page_id = ?', [page])).toHaveLength(0);
  });

  it.each(['read_canvas', 'create_block', 'batch_create_hierarchy'])('denies another user\'s canvas: %s', async (name) => {
    const res = await call(name, { pageId: foreignPage, content: 'denied', parentBlock: { content: 'p' }, subBlocks: [] });
    expect(res.result.isError).toBe(true);
    expect(query('SELECT id FROM blocks WHERE page_id = ?', [foreignPage])).toHaveLength(0);
  });

  it.each(['set_subblock', 'delete_block', 'create_link'])('denies another user\'s block: %s', async (name) => {
    const id = nanoid();
    run('INSERT INTO blocks (id, page_id, type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [id, foreignPage, 'text', 'private', Date.now(), Date.now()]);
    const res = await call(name, { blockId: id, fromBlockId: id, toBlockId: id });
    expect(res.result.isError).toBe(true);
    expect(query('SELECT content FROM blocks WHERE id = ?', [id])[0].content).toBe('private');
  });

  it('prevents cross-page parents and links', async () => {
    const first = await create();
    const second = await create({ pageId: otherPage });
    for (const [name, args] of [
      ['create_block', { pageId: page, content: 'x', parentId: second }],
      ['set_subblock', { blockId: first, parentId: second }],
      ['create_link', { fromBlockId: first, toBlockId: second }],
    ] as const) expect((await call(name, args)).result.isError).toBe(true);
  });

  it('prevents ancestor cycles and allows detaching with null', async () => {
    const parent = await create();
    const child = await create({ parentId: parent });
    const grandchild = await create({ parentId: child });
    expect((await call('set_subblock', { blockId: parent, parentId: grandchild })).result.isError).toBe(true);
    expect((await call('set_subblock', { blockId: child, parentId: null })).result.isError).toBe(false);
    expect(query('SELECT parent_id FROM blocks WHERE id = ?', [child])[0].parent_id).toBeNull();
  });

  it('returns missing block errors as tool failures with the original id', async () => {
    const res = await call('delete_block', { blockId: 'missing' });
    expect(res.id).toBe('probe');
    expect(res.result.isError).toBe(true);
  });

  it('creates links and removes dangling links when deleting a parent', async () => {
    const parent = await create();
    const child = await create({ parentId: parent });
    expect((await call('create_link', { fromBlockId: child, toBlockId: parent })).result.isError).toBe(false);
    expect((await call('delete_block', { blockId: parent })).result.isError).toBe(false);
    const row = query('SELECT parent_id, meta FROM blocks WHERE id = ?', [child])[0];
    expect(row.parent_id).toBeNull();
    expect(JSON.parse(row.meta as string).links).toEqual([]);
  });
});
