import { NextRequest, NextResponse } from 'next/server';
import { runVizAssist } from '@/lib/ai';
import type { VizAssistRequest } from '@/lib/ai';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as VizAssistRequest;
    if (!body.documentName || !body.workflow?.length || !body.currentRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await runVizAssist(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Viz Assist API Error:', error);
    const message = error instanceof Error ? error.message : '可视化助手处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
