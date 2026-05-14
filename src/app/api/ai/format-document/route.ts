import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response('Missing content', { status: 400 });
    }

    const prompt = `你是一个专业文档排版助手。请将以下原始文本转为标准格式的文档内容。

要求：
1. 识别并设置标题层级（h1/h2/h3）
2. 将相关段落组织为列表
3. 添加适当的加粗、斜体强调
4. 保持原文核心信息不变
5. 输出为 HTML 格式（只输出 body 内的内容，不要 html/head/body 标签）
6. 使用语义化标签：p、h1、h2、h3、ul、ol、li、strong、em、blockquote、pre、code
7. 不要添加任何解释性文字，只输出 HTML

原始内容：
${content}`;

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.5,
      maxOutputTokens: 4096,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Format document API Error:', error);
    return new Response('AI 格式化失败', { status: 500 });
  }
}
