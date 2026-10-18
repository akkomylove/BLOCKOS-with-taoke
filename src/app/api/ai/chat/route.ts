import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/chat';
import { AIServiceError } from '@/lib/ai/client';
import { getUserId } from '@/lib/auth-utils';
import { getAccountMode } from '@/lib/account';
import { PERSONAL_CHAT_PRESET } from '@/config/ai-modes';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const personal = await getAccountMode(userId) !== 'enterprise';
    const result = await chat(personal ? {
      ...body,
      currentRole: PERSONAL_CHAT_PRESET,
      rolePreset: PERSONAL_CHAT_PRESET,
      workflow: [],
      personaNote: '',
    } : body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      );
    }
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
