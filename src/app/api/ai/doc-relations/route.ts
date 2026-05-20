import { NextRequest, NextResponse } from 'next/server';
import { docRelations } from '@/lib/ai/doc-relations';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const result = await docRelations(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Doc relations error:', error);
    return NextResponse.json({ error: 'Doc relations failed' }, { status: 500 });
  }
}
