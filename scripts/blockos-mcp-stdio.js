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

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const payload = JSON.parse(trimmed);
    const res = await fetch(BLOCKOS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    process.stdout.write(JSON.stringify(data) + '\n');
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: String(err && err.message ? err.message : err) },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
