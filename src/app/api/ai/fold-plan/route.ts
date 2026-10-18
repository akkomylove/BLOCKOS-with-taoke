import { NextRequest, NextResponse } from 'next/server';
import { foldPlan } from '@/lib/ai/fold-plan';
import { withEnterprise } from '@/lib/enterprise-access';

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await foldPlan(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fold plan error:', error);
    return NextResponse.json({ error: 'Fold plan failed' }, { status: 500 });
  }
}

export const POST = withEnterprise(POSTHandler);
