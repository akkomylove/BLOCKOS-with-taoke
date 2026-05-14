import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { blockType, content, action } = await req.json();

    const prompt = buildPrompt(blockType, content, action);

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI API Error:', error);
    return new Response('AI 处理失败', { status: 500 });
  }
}

function buildPrompt(blockType: string, content: string, action: string): string {
  const basePrompt = `你是一个智能文档助手。请根据以下信息执行任务：\n\n`;
  
  switch (action) {
    case 'summarize':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请将以上内容总结为简洁的要点列表。`;
    
    case 'rewrite-formal':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请将以上内容改写为正式、专业的风格。`;
    
    case 'rewrite-casual':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请将以上内容改写为轻松、随意的风格。`;
    
    case 'expand':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请扩展以上内容，添加更多细节和解释。`;
    
    case 'breakdown':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请将以上任务拆解为具体的子任务列表。`;
    
    case 'mindmap':
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请将以上内容转换为思维导图大纲结构，使用层级缩进表示。`;
    
    case 'explain':
      return `${basePrompt}Block 类型：${blockType}\n代码内容：\n${content}\n\n请解释以上代码的功能和工作原理。`;
    
    case 'optimize':
      return `${basePrompt}Block 类型：${blockType}\n代码内容：\n${content}\n\n请分析以上代码并提供优化建议。`;
    
    case 'insight':
      return `${basePrompt}Block 类型：${blockType}\n表格数据：\n${content}\n\n请分析以上数据并提供洞察和趋势分析。`;
    
    default:
      return `${basePrompt}Block 类型：${blockType}\n内容：\n${content}\n\n请对以上内容进行智能处理。`;
  }
}
