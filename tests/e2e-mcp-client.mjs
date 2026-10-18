// Official SDK integration test. Starts a local Next server with an isolated DB.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs({ locateFile: () => path.resolve('node_modules/sql.js/dist/sql-wasm.wasm') });

const portProbe = createServer();
await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const endpoint = `${base}/api/open/v1/mcp`;
const dbDir = await mkdtemp(path.join(tmpdir(), 'blockos-mcp-e2e-'));
await mkdir('scratch', { recursive: true });
const tsconfigPath = `scratch/tsconfig.mcp-${process.pid}.json`;
await writeFile(tsconfigPath, JSON.stringify({ extends: path.resolve('tsconfig.json'), compilerOptions: { baseUrl: process.cwd(), paths: { '@/*': ['src/*'] } }, include: [path.resolve('src/**/*.ts'), path.resolve('src/**/*.tsx')], exclude: [path.resolve('node_modules')] }));
const env = {
  ...process.env, NODE_ENV: 'development', BLOCKOS_DB_PATH: path.join(dbDir, 'test.db'),
  BLOCKOS_BUILD_DIR: `scratch/mcp-next-${process.pid}`, BLOCKOS_TSCONFIG_PATH: tsconfigPath,
  POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', STORAGE_URL: '', VERCEL: '',
  AUTH_SECRET: 'mcp-local-integration-test-secret', NEXTAUTH_SECRET: 'mcp-local-integration-test-secret',
};
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-12000); });
server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-12000); });
const clients = [];

async function api(route, { cookie, key, method = 'GET', body } = {}) {
  const res = await fetch(base + route, {
    method, headers: {
      'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  assert.ok(res.ok, `${route}: HTTP ${res.status}`);
  const cookies = res.headers.getSetCookie().map(value => value.split(';')[0]);
  return { data: await res.json(), cookie: cookies.find(value => value.startsWith('blockos-session=') && value !== 'blockos-session=') || cookies.find(value => value.startsWith('demo-session=') && value !== 'demo-session=') };
}

async function exerciseAccount() {
  const identity = { email: `http-probe-${Date.now()}@example.test`, name: 'HTTP account probe', password: 'local-integration-password' };
  const registered = await api('/api/auth/register', { method: 'POST', body: identity });
  const cookie = registered.cookie;
  assert.equal(registered.data.user.mode, 'personal');
  async function expectStatus(route, session, status) {
    const res = await fetch(base + route, { headers: { Cookie: session } });
    assert.equal(res.status, status, route);
  }
  await expectStatus('/api/teams', cookie, 403);
  const page = await api('/api/pages', { cookie, method: 'POST', body: { title: 'retained personal document' } });
  const personalKey = await api('/api/open/keys', { cookie, method: 'POST', body: { name: 'personal MCP probe' } });
  const personalCanvas = await api('/api/open/v1/mcp', { key: personalKey.data.rawKey, method: 'POST', body: { jsonrpc: '2.0', id: 'personal-probe', method: 'tools/call', params: { name: 'read_canvas', arguments: { pageId: page.data.id } } } });
  assert.equal(personalCanvas.data.result.isError, false);
  await api('/api/account', { cookie, method: 'PATCH', body: { mode: 'enterprise' } });
  const team = await api('/api/teams', { cookie, method: 'POST', body: { name: 'retained team' } });
  const project = await api('/api/projects', { cookie, method: 'POST', body: { teamId: team.data.id, name: 'retained project' } });
  await api('/api/user/profile', { cookie, method: 'PATCH', body: { bio: 'keep biography', title: 'Engineer' } });
  await api('/api/user/profile', { cookie, method: 'PATCH', body: { displayName: 'Updated name' } });
  assert.equal((await api('/api/user/profile', { cookie })).data.bio, 'keep biography');
  await api('/api/account', { cookie, method: 'PATCH', body: { mode: 'personal' } });
  await expectStatus(`/api/projects/${project.data.id}`, cookie, 403);
  const pages = await api('/api/pages', { cookie });
  assert.ok(pages.data.pages.some(item => item.id === page.data.id));
  await api('/api/account', { cookie, method: 'PATCH', body: { mode: 'enterprise' } });
  assert.equal((await api(`/api/projects/${project.data.id}`, { cookie })).data.project.id, project.data.id);
  const secondLogin = await api('/api/auth/login', { method: 'POST', body: identity });
  const changed = await api('/api/account/password', { cookie, method: 'POST', body: { currentPassword: identity.password, newPassword: 'rotated-integration-password' } });
  await expectStatus('/api/auth/user', cookie, 401);
  await expectStatus('/api/auth/user', secondLogin.cookie, 401);
  assert.equal((await api('/api/auth/user', { cookie: changed.cookie })).data.name, 'Updated name');
  await api('/api/auth/logout', { cookie: changed.cookie, method: 'POST' });
  await expectStatus('/api/auth/user', changed.cookie, 401);
  console.log('PASS account HTTP lifecycle: registration, login, mode gates, retained documents/team/project, partial profile update, password rotation, revoked sessions, logout');
}

async function exercise(label, transport, pageId) {
  const client = new Client({ name: 'blockos-integration-probe', version: '1.0.0' });
  clients.push(client);
  const errors = [];
  client.onerror = err => errors.push(err.message);
  await client.connect(transport);
  assert.equal(client.getServerVersion().name, 'blockos-mcp-server');
  await client.ping();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'read_canvas', 'create_block', 'set_subblock', 'batch_create_hierarchy', 'create_link', 'delete_block',
  ].sort());

  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, false, `${label} ${name}: ${JSON.stringify(result)}`);
    return JSON.parse(result.content[0].text);
  }
  const initial = await call('read_canvas', { pageId });
  assert.equal(initial.totalBlocks, 0);
  const batch = await call('batch_create_hierarchy', {
    pageId, parentBlock: { title: `${label} parent`, content: 'integration probe' },
    subBlocks: [{ type: 'todo', title: 'child', content: 'child task' }],
  });
  const single = await call('create_block', { pageId, type: 'text', content: `${label} independent block` });
  await call('set_subblock', { blockId: single.block.id, parentId: batch.parentId });
  await call('create_link', { fromBlockId: single.block.id, toBlockId: batch.subBlocks[0].id });
  const canvas = await call('read_canvas', { pageId });
  assert.equal(canvas.totalBlocks, 3);
  assert.equal(canvas.blockTree.length, 1);
  assert.equal(canvas.blockTree[0].children.length, 2);
  assert.deepEqual(canvas.blocks.find(block => block.id === single.block.id).meta.links, [batch.subBlocks[0].id]);
  await call('set_subblock', { blockId: single.block.id, parentId: null });
  const detached = await call('read_canvas', { pageId });
  assert.equal(detached.blockTree.length, 2);
  // Confirm both REST visibility and the database snapshot actually saved to disk.
  const { data: persisted } = await api(`/api/open/v1/canvas?pageId=${pageId}`, { key });
  assert.equal(persisted.totalCount, 3);
  const snapshot = new SQL.Database(await readFile(env.BLOCKOS_DB_PATH));
  try {
    assert.equal(snapshot.exec(`SELECT COUNT(*) FROM blocks WHERE page_id = '${pageId}'`)[0].values[0][0], 3);
  } finally {
    snapshot.close();
  }
  for (const id of [batch.parentId, batch.subBlocks[0].id, single.block.id]) {
    await call('delete_block', { blockId: id });
  }
  assert.equal((await call('read_canvas', { pageId })).totalBlocks, 0);
  assert.deepEqual(errors, []);
  await client.close();
  console.log(`PASS ${label}: initialize, notification, ping, tools/list, all 6 tools, persisted read, cleanup`);
}

let key;
try {
  const deadline = Date.now() + 90000;
  while (true) {
    if (server.exitCode !== null) throw new Error(`Next exited: ${server.exitCode}`);
    try {
      const ready = await fetch(`${base}/api/open/v1/mcp`, { method: 'POST', body: '{}', signal: AbortSignal.timeout(60000) });
      if (ready.status === 401) break;
    } catch {}
    if (Date.now() > deadline) throw new Error('Next server startup timed out');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await exerciseAccount();
  const { cookie } = await api('/api/auth/simple-login', { method: 'POST', body: { userId: 'demo-admin-001' } });
  assert.ok(cookie);
  const { data: issued } = await api('/api/open/keys', { cookie, method: 'POST', body: { name: 'MCP integration probe', permissions: ['read', 'write'], ttlDays: 1 } });
  key = issued.rawKey;
  assert.match(key, /^bk_live_/);
  for (const kind of ['HTTP', 'stdio']) {
    const { data: page } = await api('/api/pages', { cookie, method: 'POST', body: { title: `${kind} MCP probe` } });
    const transport = kind === 'HTTP'
      ? new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { Authorization: `Bearer ${key}` } } })
      : new StdioClientTransport({ command: process.execPath, args: [path.resolve('scripts/blockos-mcp-stdio.js')], env: { ...process.env, BLOCKOS_URL: endpoint, BLOCKOS_API_KEY: key }, stderr: 'pipe' });
    await exercise(kind, transport, page.id);
  }
  await api(`/api/open/keys?id=${issued.id}`, { cookie, method: 'DELETE' });
  const rejected = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'ping' }) });
  assert.equal(rejected.status, 401);
  console.log('PASS key issuance, revocation and revoked-key rejection');
  console.log('MCP integration tests passed (isolated local database).');
} catch (err) {
  console.error(logs);
  console.error(err);
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map(client => client.close()));
  if (process.platform === 'win32' && server.pid) {
    await new Promise(resolve => execFile('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
  } else {
    server.kill('SIGTERM');
  }
}
