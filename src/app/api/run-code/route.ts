import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { getAuthUserId } from '@/lib/auth-utils';

const execAsync = promisify(exec);

// 沙箱执行严格配额
const TIMEOUT_MS = 3000; // 3 秒严格超时看门狗
const MAX_CODE_LENGTH = 10 * 1024; // 代码大小最大 10KB
const MAX_OUTPUT_LINES = 100;
const MAX_OUTPUT_BYTES = 50 * 1024; // 输出最多 50KB

/**
 * 隔离的白名单环境变量，绝不暴露应用密钥（如 ZHIPU_API_KEY, POSTGRES_URL, AUTH_SECRET）
 */
function getIsolatedEnv(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH || '',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    NODE_ENV: 'production',
    PYTHONUNBUFFERED: '1',
    TMPDIR: tmpdir(),
  };
}

async function POSTDatabaseHandler(req: NextRequest) {
  try {
    // 基础调用者鉴权检查
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '请先登录以使用代码执行沙箱' }, { status: 401 });
    }

    const { code, language } = await req.json();

    if (!code || typeof code !== 'string' || !language) {
      return NextResponse.json({ error: '缺少有效的 code 或 language' }, { status: 400 });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: `代码长度超出安全配额限制 (最大 10KB)` }, { status: 400 });
    }

    const id = randomBytes(8).toString('hex');
    const tmpDir = tmpdir();
    const isolatedEnv = getIsolatedEnv();

    if (language === 'python') {
      const filePath = join(tmpDir, `blockos_sandbox_${id}.py`);
      await writeFile(filePath, code, 'utf-8');

      const startTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync(`python "${filePath}"`, {
          timeout: TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          env: isolatedEnv,
        });

        const duration = Date.now() - startTime;
        const lines = stdout.split('\n').filter(Boolean).slice(0, MAX_OUTPUT_LINES);

        return NextResponse.json({
          output: lines,
          error: stderr || null,
          duration,
        });
      } catch (err: unknown) {
        const duration = Date.now() - startTime;
        const errObj = err as Record<string, unknown> | null;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isTimeout =
          Boolean(errObj?.killed) ||
          errObj?.signal === 'SIGTERM' ||
          errObj?.code === 'ETIMEDOUT' ||
          errorMsg.toLowerCase().includes('timeout') ||
          errorMsg.toLowerCase().includes('timed out');
        return NextResponse.json({
          output: [],
          error: isTimeout ? `执行超时（已触发 ${TIMEOUT_MS / 1000} 秒安全熔断）` : errorMsg,
          duration,
        });
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }

    if (language === 'javascript' || language === 'node') {
      const filePath = join(tmpDir, `blockos_sandbox_${id}.js`);
      await writeFile(filePath, code, 'utf-8');

      const startTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
          timeout: TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          env: isolatedEnv,
        });

        const duration = Date.now() - startTime;
        const lines = stdout.split('\n').filter(Boolean).slice(0, MAX_OUTPUT_LINES);

        return NextResponse.json({
          output: lines,
          error: stderr || null,
          duration,
        });
      } catch (err: unknown) {
        const duration = Date.now() - startTime;
        const errObj = err as Record<string, unknown> | null;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isTimeout =
          Boolean(errObj?.killed) ||
          errObj?.signal === 'SIGTERM' ||
          errObj?.code === 'ETIMEDOUT' ||
          errorMsg.toLowerCase().includes('timeout') ||
          errorMsg.toLowerCase().includes('timed out');
        return NextResponse.json({
          output: [],
          error: isTimeout ? `执行超时（已触发 ${TIMEOUT_MS / 1000} 秒安全熔断）` : errorMsg,
          duration,
        });
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }

    return NextResponse.json({ error: `沙箱暂不支持此语言: ${language}` }, { status: 400 });
  } catch (err) {
    console.error('Code sandbox error:', err);
    return NextResponse.json({ error: '执行沙箱服务异常' }, { status: 500 });
  }
}

export const POST = withDatabaseRequest(POSTDatabaseHandler);
