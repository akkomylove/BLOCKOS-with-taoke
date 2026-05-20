import { NextRequest, NextResponse } from 'next/server';
import { runCodeLab } from '@/lib/ai';
import type { CodeLabRequest } from '@/lib/ai';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as CodeLabRequest;
    if (!body.documentName || !body.code || !body.workflow?.length || !body.currentRole || !body.language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const validLanguages = ['html', 'js', 'python', 'c', 'java'];
    if (!validLanguages.includes(body.language)) {
      return NextResponse.json({ error: `Invalid language` }, { status: 400 });
    }
    const result = await runCodeLab(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Code Lab API Error:', error);
    const message = error instanceof Error ? error.message : '代码实验室处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
