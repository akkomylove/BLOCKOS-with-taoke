import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/chat';
import { AIServiceError } from '@/lib/ai/client';
import { getUserId } from '@/lib/auth-utils';
import { getAssistantIdentity } from '@/lib/ai/assistant-identity';
import { PERSONAL_CHAT_PRESET, ENTERPRISE_AUTO_CHAT_PRESET } from '@/config/ai-modes';

async function POSTDatabaseHandler(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    if (!body || typeof body.userMessage !== 'string' || !body.userMessage.trim()) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }
    const identity = await getAssistantIdentity(userId);
    const rolePreset = identity.mode === 'enterprise' ? ENTERPRISE_AUTO_CHAT_PRESET : PERSONAL_CHAT_PRESET;
    const result = await chat({
      ...body,
      currentRole: rolePreset,
      rolePreset,
      workflow: [],
      personaNote: '',
      messages: Array.isArray(body.messages) ? body.messages : [],
      selectedContexts: Array.isArray(body.selectedContexts) ? body.selectedContexts : [],
    }, identity);
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

export const POST = withDatabaseRequest(POSTDatabaseHandler);
