import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/ai';
import type { AnalyzeRequest } from '@/lib/ai';
import { withEnterprise } from '@/lib/enterprise-access';

async function POSTHandler(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequest;
    if (!body.documentName || !body.documentContent || !body.workflow?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await analyzeDocument(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Analyze API Error:', error);
    const message = error instanceof Error ? error.message : 'AI 分析失败';
    const code = (error as { code?: string }).code || 'unknown_error';
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}

export const POST = withEnterprise(POSTHandler);
