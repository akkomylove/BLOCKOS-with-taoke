import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { postJsonCompletion, parseJsonContent, safeText, safeList } from '@/lib/ai/client';
import { withEnterprise } from '@/lib/enterprise-access';

async function POSTHandler(req: NextRequest) {
  try {
    const { systemPrompt, userPrompt } = await req.json();

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: 'Missing prompts' }, { status: 400 });
    }

    const rawContent = await postJsonCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.1
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonContent(rawContent);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON response' }, { status: 502 });
    }

    const content = safeText(parsed.content, '');
    const keySections = safeList(parsed.key_sections, []);

    if (!content) {
      return NextResponse.json({ error: 'Empty content' }, { status: 502 });
    }

    return NextResponse.json({
      content,
      keySections,
    });
  } catch (error) {
    console.error('Generate role document error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
