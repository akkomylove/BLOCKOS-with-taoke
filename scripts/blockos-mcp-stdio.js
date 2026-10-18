#!/usr/bin/env node
/**
 * BlockOS Model Context Protocol (MCP) Standard Stdio Bridge
 * 用于连接 Claude Desktop / Cursor / Antigravity 等支持 stdio MCP 协议的客户端
 */
const readline = require('readline');

const BLOCKOS_URL = process.env.BLOCKOS_URL || 'https://blockos.hiakkocv.xyz/api/open/v1/mcp';
const API_KEY = process.env.BLOCKOS_API_KEY || '';

if (!API_KEY) {
  process.stderr.write('[BlockOS MCP Bridge] Notice: BLOCKOS_API_KEY environment variable is not set. Please provide a valid API Key in your MCP config.\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

async function forwardLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n');
    return;
  }
  const hasId = payload && typeof payload === 'object' && Object.hasOwn(payload, 'id');
  const isNotification = payload && !Array.isArray(payload) && payload.jsonrpc === '2.0'
    && typeof payload.method === 'string' && !hasId;
  const id = hasId ? payload.id : null;
  try {
    const res = await fetch(BLOCKOS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    if (isNotification) {
      if (!res.ok) process.stderr.write(`[BlockOS MCP Bridge] Notification rejected: HTTP ${res.status}\n`);
      await res.body?.cancel();
      return;
    }
    const responseText = await res.text();
    let data;
    try { data = JSON.parse(responseText); } catch {
      throw new Error(`HTTP ${res.status}: MCP endpoint did not return JSON`);
    }
    if (!data || data.jsonrpc !== '2.0' || (!('result' in data) && !('error' in data))) {
      throw new Error(`HTTP ${res.status}: Invalid JSON-RPC response`);
    }
    // Authentication failures may use id:null before the request body is parsed.
    if (data.error) data.id = id;
    if (data.id !== id) throw new Error('MCP response id does not match the request');
    process.stdout.write(JSON.stringify(data) + '\n');
  } catch (err) {
    if (isNotification) {
      process.stderr.write(`[BlockOS MCP Bridge] Notification failed: ${err.message}\n`);
      return;
    }
    const errorResponse = {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: String(err && err.message ? err.message : err) },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
}

// Keep initialization and subsequent notifications ordered, even with piped input.
let pending = Promise.resolve();
rl.on('line', (line) => {
  pending = pending.then(() => forwardLine(line));
});
