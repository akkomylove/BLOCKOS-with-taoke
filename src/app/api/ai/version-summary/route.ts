import { NextRequest, NextResponse } from 'next/server';
import { summarizeVersion } from '@/lib/ai';
import type { VersionSummaryRequest } from '@/lib/ai';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = (await req.json()) as VersionSummaryRequest;
    if (!body.documentName || !body.workflow?.length || !body.previousContent || !body.currentContent || !body.versionNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (body.versionNumber < 2) {
      return NextResponse.json({ error: 'versionNumber must be >= 2' }, { status: 400 });
    }
    const result = await summarizeVersion(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Version Summary API Error:', error);
    const message = error instanceof Error ? error.message : '版本总结处理失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
