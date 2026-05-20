import { NextRequest, NextResponse } from 'next/server';
import { foldPlan } from '@/lib/ai/fold-plan';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const result = await foldPlan(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fold plan error:', error);
    return NextResponse.json({ error: 'Fold plan failed' }, { status: 500 });
  }
}
