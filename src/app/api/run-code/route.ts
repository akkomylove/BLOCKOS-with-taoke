import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

const TIMEOUT_MS = 10000;

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: '缺少 code 或 language' }, { status: 400 });
    }

    const id = randomBytes(8).toString('hex');
    const tmpDir = tmpdir();

    if (language === 'python') {
      const filePath = join(tmpDir, `blockos_${id}.py`);
      await writeFile(filePath, code);

      try {
        const { stdout, stderr } = await execAsync(`python "${filePath}"`, { timeout: TIMEOUT_MS });
        await unlink(filePath).catch(() => {});
        return NextResponse.json({
          output: stdout.split('\n').filter(Boolean),
          error: stderr || null,
          duration: 0,
        });
      } catch (err: unknown) {
        await unlink(filePath).catch(() => {});
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          output: [],
          error: errorMsg.includes('timeout') ? '执行超时（10秒）' : errorMsg,
          duration: 0,
        });
      }
    }

    if (language === 'javascript') {
      const filePath = join(tmpDir, `blockos_${id}.js`);
      await writeFile(filePath, code);

      try {
        const { stdout, stderr } = await execAsync(`node "${filePath}"`, { timeout: TIMEOUT_MS });
        await unlink(filePath).catch(() => {});
        return NextResponse.json({
          output: stdout.split('\n').filter(Boolean),
          error: stderr || null,
          duration: 0,
        });
      } catch (err: unknown) {
        await unlink(filePath).catch(() => {});
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          output: [],
          error: errorMsg.includes('timeout') ? '执行超时（10秒）' : errorMsg,
          duration: 0,
        });
      }
    }

    return NextResponse.json({ error: `暂不支持语言: ${language}` }, { status: 400 });
  } catch {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
