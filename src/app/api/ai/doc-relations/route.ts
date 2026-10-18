import { NextRequest, NextResponse } from 'next/server';
import { docRelations } from '@/lib/ai/doc-relations';
import { withEnterprise } from '@/lib/enterprise-access';

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await docRelations(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Doc relations error:', error);
    return NextResponse.json({ error: 'Doc relations failed' }, { status: 500 });
  }
}

export const POST = withEnterprise(POSTHandler);
