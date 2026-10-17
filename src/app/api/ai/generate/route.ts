import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';
import { validateInputSafety, AISafetyViolationError } from '@/lib/ai/safety-filter';
import { getUserId } from '@/lib/auth-utils';

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await getUserId();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Missing prompt', { status: 400 });
    }

    // 安全合规前置扫描 (Pre-flight Security Inspection)
    validateInputSafety({
      userMessage: prompt,
      contexts: context ? [context] : [],
    });

    const systemPrompt = context
      ? `请根据以下上下文和用户需求生成内容。\n\n上下文：\n${context}\n\n用户需求：${prompt}`
      : prompt;

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof AISafetyViolationError) {
      return new Response(error.message, { status: 400 });
    }
    console.error('Generate API Error:', error);
    return new Response('AI 生成失败', { status: 500 });
  }
}
