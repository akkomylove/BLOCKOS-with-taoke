import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server, type RequestListener } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
});

async function endpoint(handler: RequestListener) {
  server = createServer(handler);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  return `http://127.0.0.1:${address.port}`;
}

async function bridge(url: string, lines: unknown[]) {
  const child = spawn(process.execPath, [path.resolve('scripts/blockos-mcp-stdio.js')], {
    env: { ...process.env, BLOCKOS_URL: url, BLOCKOS_API_KEY: 'test-only-key' },
    windowsHide: true,
  });
  let stdout = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  const done = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Bridge timed out')); }, 5000);
    child.on('error', err => { clearTimeout(timeout); reject(err); });
    child.on('exit', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`Bridge exited: ${code}`)); });
  });
  child.stdin.end(lines.map(line => typeof line === 'string' ? line : JSON.stringify(line)).join('\n') + '\n');
  await done;
  return stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

describe('MCP stdio bridge transport', () => {
  it('keeps request order and emits no response for a 202 notification', async () => {
    const methods: string[] = [];
    const url = await endpoint((req, res) => {
      let input = '';
      req.on('data', chunk => { input += chunk; });
      req.on('end', () => {
        const rpc = JSON.parse(input);
        methods.push(rpc.method);
        if (!('id' in rpc)) { res.writeHead(202); res.end(); return; }
        setTimeout(() => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: {} })); }, 20);
      });
    });
    const result = await bridge(url, [
      { jsonrpc: '2.0', id: 1, method: 'initialize' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ]);
    expect(methods).toEqual(['initialize', 'notifications/initialized', 'tools/list']);
    expect(result.map(r => r.id)).toEqual([1, 2]);
  });

  it('ignores an old server response to a notification', async () => {
    const url = await endpoint((_req, res) => { res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Unknown' } })); });
    expect(await bridge(url, [{ jsonrpc: '2.0', method: 'notifications/initialized' }])).toEqual([]);
  });

  it('preserves request ids on authentication errors', async () => {
    const url = await endpoint((_req, res) => { res.writeHead(401); res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } })); });
    const [res] = await bridge(url, [{ jsonrpc: '2.0', id: 'auth-probe', method: 'tools/list' }]);
    expect(res.id).toBe('auth-probe');
    expect(res.error.code).toBe(-32001);
  });

  it('preserves request ids when an HTTP proxy returns HTML', async () => {
    const url = await endpoint((_req, res) => { res.writeHead(502); res.end('<html>Bad gateway</html>'); });
    const [res] = await bridge(url, [{ jsonrpc: '2.0', id: 7, method: 'ping' }]);
    expect(res.id).toBe(7);
    expect(res.error.message).toContain('HTTP 502');
  });

  it('reports invalid input JSON as a parse error', async () => {
    const [res] = await bridge('http://127.0.0.1:1', ['{broken']);
    expect(res).toMatchObject({ id: null, error: { code: -32700 } });
  });
});
