import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Missing prompt', { status: 400 });
    }

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
    console.error('Generate API Error:', error);
    return new Response('AI 生成失败', { status: 500 });
  }
}
