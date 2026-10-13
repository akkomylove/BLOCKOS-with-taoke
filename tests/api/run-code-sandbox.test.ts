import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { POST as runCode } from '@/app/api/run-code/route';
import * as authUtils from '@/lib/auth-utils';

describe('Code Execution Sandbox API Isolation', () => {
  const testUserId = 'test-sandbox-user';

  beforeEach(() => {
    vi.spyOn(authUtils, 'getAuthUserId').mockResolvedValue(testUserId);
    // 模拟敏感环境变量存在
    process.env.ZHIPU_API_KEY = 'super-secret-zhipu-key-12345';
    process.env.POSTGRES_URL = 'postgres://admin:secretpass@cloud.db.internal/main';
    process.env.AUTH_SECRET = 'ultra-secret-session-key';
  });

  it('should reject unauthenticated caller', async () => {
    vi.spyOn(authUtils, 'getAuthUserId').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/run-code', {
      method: 'POST',
      body: JSON.stringify({ code: 'console.log(1)', language: 'javascript' }),
    });

    const res = await runCode(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('请先登录');
  });

  it('should reject code exceeding size quota', async () => {
    const hugeCode = 'console.log("hello");'.repeat(1000); // 超过 10KB

    const req = new NextRequest('http://localhost:3000/api/run-code', {
      method: 'POST',
      body: JSON.stringify({ code: hugeCode, language: 'javascript' }),
    });

    const res = await runCode(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('配额限制');
  });

  it('should not leak server environment variables in JavaScript execution', async () => {
    // 恶意用户试图打印系统环境变量以窃取密钥
    const code = `
      const env = process.env;
      console.log('ZHIPU:', env.ZHIPU_API_KEY || 'HIDDEN');
      console.log('POSTGRES:', env.POSTGRES_URL || 'HIDDEN');
      console.log('AUTH_SECRET:', env.AUTH_SECRET || 'HIDDEN');
    `;

    const req = new NextRequest('http://localhost:3000/api/run-code', {
      method: 'POST',
      body: JSON.stringify({ code, language: 'javascript' }),
    });

    const res = await runCode(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.output).toContain('ZHIPU: HIDDEN');
    expect(data.output).toContain('POSTGRES: HIDDEN');
    expect(data.output).toContain('AUTH_SECRET: HIDDEN');
  });

  it('should terminate infinite loop via 3-second watchdog timeout', async () => {
    const infiniteCode = `
      while(true) {}
    `;

    const req = new NextRequest('http://localhost:3000/api/run-code', {
      method: 'POST',
      body: JSON.stringify({ code: infiniteCode, language: 'javascript' }),
    });

    const res = await runCode(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toContain('超时');
  }, 10000);
});
