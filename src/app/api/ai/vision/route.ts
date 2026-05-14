import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { imageBase64, prompt } = await req.json();

    const result = streamText({
      model: siliconflow(AI_MODEL),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || '请描述这张图片的内容' },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
      maxOutputTokens: 2048,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Vision API Error:', error);
    return new Response('图片分析失败', { status: 500 });
  }
}
