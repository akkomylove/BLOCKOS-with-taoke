import { NextRequest, NextResponse } from 'next/server';
import { runCopilot } from '@/lib/ai';
import type { CopilotRequest } from '@/lib/ai';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as CopilotRequest;
    if (!body.action || !body.documentName || !body.documentContent || !body.workflow?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const validActions = ['plan_next', 'plan_finalize', 'critique_generate'];
    if (!validActions.includes(body.action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }
    const result = await runCopilot(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Copilot API Error:', error);
    const message = error instanceof Error ? error.message : 'Copilot 处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
