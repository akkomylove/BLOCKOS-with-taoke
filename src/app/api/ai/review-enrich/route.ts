import { NextRequest, NextResponse } from 'next/server';
import { reviewEnrich } from '@/lib/ai/review-enrich';
import { withEnterprise } from '@/lib/enterprise-access';

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await reviewEnrich(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Review enrich error:', error);
    return NextResponse.json({ error: 'Review enrich failed' }, { status: 500 });
  }
}

export const POST = withEnterprise(POSTHandler);
