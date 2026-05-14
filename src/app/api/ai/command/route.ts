import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { command, blocks } = await req.json();

    const prompt = buildCommandPrompt(command, blocks);

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Command API Error:', error);
    return new Response('命令处理失败', { status: 500 });
  }
}

function buildCommandPrompt(command: string, blocks: Array<{ id: string; type: string; content: string; title?: string }>): string {
  const blocksInfo = blocks
    .map((b) => `  { "id": "${b.id}", "type": "${b.type}", "title": "${b.title || ''}", "content": "${b.content.substring(0, 80).replace(/"/g, '\\"')}" }`)
    .join(',\n');

  const blockCount = blocks.length;

  return `你是一个 BlockOS 文档操作系统的 Agent。你需要将用户的自然语言指令转换为可执行的操作指令。

当前文档状态：
- 共 ${blockCount} 个 Block
- Block 列表：[${blocksInfo}]

用户指令："${command}"

支持的操作类型：
1. deleteBlock: 删除单个 Block（需要 target: block的id）
2. deleteAllBlocks: 删除所有 Block（无需 target）
3. createBlock: 创建新的文本 Block（需要 content: "内容"）
4. updateBlock: 更新 Block 内容（需要 target: block的id, update: { content: "新内容" }）
5. highlightBlocks: 高亮包含关键词的 Block（需要 target: "关键词"）
6. clearAllContent: 清空所有 Block 的内容

规则：
- 如果用户说"删除所有"、"清空所有"、"全部删除"，必须使用 deleteAllBlocks
- 如果用户说"创建 N 个 Block"，返回 N 个 createBlock 操作
- 仔细分析用户意图，直接执行，不要反问或确认
- 返回格式必须是纯 JSON 数组，不要任何其他文字

返回示例：
[{"action":"deleteAllBlocks"}]
[{"action":"deleteBlock","target":"seed-1"},{"action":"deleteBlock","target":"seed-2"}]
[{"action":"createBlock","content":"新创建的文本内容"}]

请返回 JSON 数组：`;
}