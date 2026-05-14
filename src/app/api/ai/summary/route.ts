import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { blocks } = await req.json();

    const prompt = buildSummaryPrompt(blocks);

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1536,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Summary API Error:', error);
    return new Response('总结失败', { status: 500 });
  }
}

function buildSummaryPrompt(blocks: Array<{ type: string; content: string }>): string {
  const blocksInfo = blocks.map((b, i) => `Block ${i + 1} [${b.type}]:\n${b.content}`).join('\n\n');

  return `你是一个智能文档助手。请对以下多个 Block 的内容进行综合总结：

${blocksInfo}

请将以上内容整合为一段连贯的摘要，提炼核心观点和关键信息。`;
}
