import { NextRequest, NextResponse } from 'next/server';
import { reviewEnrich } from '@/lib/ai/review-enrich';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const result = await reviewEnrich(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Review enrich error:', error);
    return NextResponse.json({ error: 'Review enrich failed' }, { status: 500 });
  }
}
