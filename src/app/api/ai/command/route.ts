import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { command, blocks } = await req.json();

    const prompt = buildCommandPrompt(command, blocks);

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 1500,
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

  return `你是一个 BlockOS 画布协同操作系统的核心智能调度 Agent。你需要将用户的自然语言意图精准解析为一系列可直接执行的操作指令 JSON 数组。

当前画布状态：
- 共有 ${blockCount} 个 Block 卡片
- Block 列表：[
${blocksInfo}
]

用户指令："${command}"

支持的操作类型：
1. createBlock: 创建新的 Block
   - content: 详细内容（必须）
   - type: "text" | "todo" | "code" | "table" | "whiteboard"（可选，默认 "text"）
   - title: 卡片标题（可选）
   - parentTarget: 若指定，可自动作为该父 Block 的子 Block（提供父 Block 的 id 或匹配标题/内容关键词）
2. setParent: 将已有 Block 设为指定父 Block 的子 Block
   - childTarget: 待设置 Block 的 id 或匹配关键词（必须）
   - parentTarget: 目标父 Block 的 id 或匹配关键词（必须）
3. outdentBlock: 将指定 Block 移出子 Block 结构，提升为画布独立卡片
   - target: 目标 Block 的 id 或匹配关键词（必须）
4. createSubBlock: 直接在指定父 Block 下创建子 Block
   - parentTarget: 目标父 Block 的 id 或匹配关键词（必须）
   - content: 子 Block 内容（必须）
   - title: 标题（可选）
   - type: 类型（可选）
5. batchCreateHierarchy: 批量创建一套完整的父子层级卡片树（如创建1个需求父卡片，并自动挂载多个子任务/子卡片）
   - parent: { title: "父卡片标题", content: "父卡片内容", type?: "text" | "todo" }
   - children: [
       { title: "子项1标题", content: "子项1内容", type?: "todo" | "text" },
       { title: "子项2标题", content: "子项2内容", type?: "todo" | "text" }
     ]
6. createLink: 在两个 Block 之间建立拓扑链接关系
   - sourceTarget: 源 Block 的 id 或关键词
   - targetTarget: 目标 Block 的 id 或关键词
7. updateBlock: 更新 Block 的内容或属性
   - target: block 的 id 或关键词
   - update: { content?: "新内容", title?: "新标题" }
8. highlightBlocks: 高亮包含关键词的 Block
   - target: 匹配关键词
9. deleteBlock: 删除指定 Block
   - target: block 的 id 或关键词
10. deleteAllBlocks: 清空所有 Block
11. clearAllContent: 清空所有 Block 的内容

解析规则：
- 当用户要求创建多个 Block 且要求“设为子 Block”或具备层级结构时，优先使用 batchCreateHierarchy 或带有 parentTarget 的 createBlock。
- 当用户要求将某个已有 Block 挂载到另一个 Block 下时，使用 setParent。
- 仔细分析用户指令中的数字（如“创建1个父Block和2个子Block”），严格输出对应数量的子项。
- 必须只返回合法的 JSON 数组，严禁附带任何 Markdown 解释、反问或多余字符。

返回示例：
[{"action":"batchCreateHierarchy","parent":{"title":"用户中心重构","content":"核心目标：完成鉴权升级与多租户权限隔离","type":"text"},"children":[{"title":"子任务1","content":"完成 JWT 与 API Key 双模鉴权中间件改造","type":"todo"},{"title":"子任务2","content":"编写 RBAC 角色权限多维矩阵用例","type":"todo"}]}]
[{"action":"setParent","childTarget":"性能压测","parentTarget":"技术方案文档"}]
[{"action":"createBlock","type":"text","title":"架构设计","content":"核心无界画布与原子Block体系"}]

请输出 JSON 数组：`;
}