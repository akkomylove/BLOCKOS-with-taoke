import { streamText } from 'ai';
import { siliconflow, AI_MODEL } from '@/lib/ai-provider';
import {
  BLOCKOS_CORE_IDENTITY,
  BLOCKOS_BLOCK_TYPES_INFO,
  BLOCKOS_CANVAS_CAPABILITIES,
} from '@/config/blockos-knowledge';

export async function POST(req: Request) {
  try {
    const { command, blocks } = await req.json();

    const prompt = buildCommandPrompt(command || '', blocks || []);

    const result = streamText({
      model: siliconflow(AI_MODEL),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Command API Error:', error);
    return new Response('命令处理失败', { status: 500 });
  }
}

function buildCommandPrompt(
  command: string,
  blocks: Array<{ id: string; type: string; content: string; title?: string; parentId?: string | null }>
): string {
  const blocksInfo = blocks
    .map(
      (b) =>
        `  { "id": "${b.id}", "type": "${b.type}", "title": "${b.title || ''}", "parentId": ${
          b.parentId ? `"${b.parentId}"` : 'null'
        }, "content": "${b.content.substring(0, 100).replace(/"/g, '\\"')}" }`
    )
    .join(',\n');

  const blockCount = blocks.length;

  return `你是一个运行在 BlockOS 知识操作系统画布中的核心智能调度 Agent（AI 助手）。
你的职责是作为用户的画布协同副驾，深度感知当前画布状态，并具备直接操控、编排、修改和查询 BlockOS 画布的真实能力。

${BLOCKOS_CORE_IDENTITY}

${BLOCKOS_BLOCK_TYPES_INFO}

${BLOCKOS_CANVAS_CAPABILITIES}

当前画布状态：
- 共有 ${blockCount} 个 Block 卡片
- Block 列表：[
${blocksInfo || '  (当前画布为空)'}
]

用户输入："${command}"

【解析与输出协议】
请根据用户输入的意图，严格输出单一的合法 JSON 对象（不要包裹在任何未闭合的代码块或多余字符中）：

模式 1：用户提出关于 BlockOS 系统自身、AI 画布操作助手本身体系、功能定位、使用帮助、概念咨询或画布现状提问（例如：“你能在此完成什么工作？”、“介绍一下你的能力”、“你能做什么？”、“当前画布有哪些内容？”）：
输出 JSON 格式：
{
  "type": "agent_response",
  "message": "清晰、专业且详实的回答。必须紧扣 BlockOS 原子级知识卡片与无限画布的真实能力（绝对严禁提及区块链、智能合约或 DApp）。详细阐述自己在 BlockOS 中能操控画布的四大核心维度：\n1. 全模态卡片生成（富文本、任务待办、交互式代码沙箱、多维数据表格、Mermaid 架构流程图、高亮警示等 11 种 Block）\n2. 父子层级树状结构化拆解（PRD 父卡片 + 多任务子卡片）\n3. 拓扑连线与依赖图谱治理（建立双向或单向箭头连线）\n4. 全画布检索与质量审计（高亮关键项、代码一键运行调试、批量清理重排）",
  "actionSuggestions": [
    { "label": "🚀 生成需求与子任务树", "command": "创建1个核心功能需求Block，并创建3个开发子任务" },
    { "label": "💻 创建快速排序代码沙箱", "command": "创建一个包含快速排序算法的代码沙箱Block" },
    { "label": "🔀 创建系统架构流程图", "command": "创建微服务系统架构 Mermaid 流程图" },
    { "label": "📊 创建团队版本规划表格", "command": "创建团队版本迭代数据表格" },
    { "label": "💡 创建高亮风险警示卡", "command": "创建一个高亮警示Block，注明交付前核心性能指标要求" }
  ]
}

模式 2：用户给出明确的画布操作指令（创建、删除、修改、层级嵌套、拓扑连线、高亮、清空等）：
支持的 actions：
- batchCreateHierarchy: 批量创建一套完整的父子层级卡片树（如创建 1 个需求父卡片，并自动挂载多个子任务/子卡片）
  - parent: { title: "父卡片标题", content: "父卡片内容", type?: "text" | "todo" }
  - children: [ { title: "子项标题", content: "子项内容", type?: "todo" | "text" | "code" } ]
- createBlock: 创建单个指定类型的 Block
  - type: "text" | "todo" | "code" | "table" | "whiteboard" | "mindmap" | "mermaid" | "callout" | "countdown" | "bookmark"
  - title: 卡片标题
  - content: 卡片内容（若为 mermaid 请提供标准的 graph TD 流程图代码；若为 code 请提供标准的 JS/TS 示例代码；若为 callout 请写清警示内容）
  - parentTarget: 若指定，可自动作为该父 Block 的子 Block
- setParent: 将已有 Block 设为指定父 Block 的子 Block (childTarget, parentTarget)
- outdentBlock: 将指定 Block 移出子 Block 结构 (target)
- createSubBlock: 在指定父 Block 下创建子 Block (parentTarget, content, title, type)
- createLink: 在两个 Block 之间建立拓扑连线 (sourceTarget, targetTarget)
- updateBlock: 更新 Block 的内容或属性 (target, update: { content, title })
- highlightBlocks: 高亮包含关键词的 Block (target)
- deleteBlock: 删除指定 Block (target)
- deleteAllBlocks: 清空所有 Block
- clearAllContent: 清空所有 Block 的内容

输出 JSON 格式：
{
  "type": "operations",
  "summary": "针对用户指令执行的简短客观说明（例如：已在画布上为您创建微服务架构流程图）",
  "operations": [
    { "action": "...", ... }
  ]
}

模式 3：用户询问通用知识、人物、历史、艺术、科技、代码算法或创意问答（例如：“你能给我介绍一下莫奈吗？”、“什么是快速排序”、“介绍一下量子计算”、“设计一套电商购物车架构”等非仅关于 BlockOS 本身的问答）：
输出 JSON 格式：
{
  "type": "agent_response",
  "message": "针对用户所提的具体主题进行专业、详尽、结构清晰的回答（支持 Markdown 标题、列表、要点加粗）。绝对严禁机械套用 BlockOS 自我介绍模板！必须深入回答用户询问的具体主题本身（例如莫奈的生平、印象派开创、《日出·印象》与《睡莲》系列、光影技法等）。并在最后一行温馨提示：用户可以通过下方推荐操作，将该知识主题一键生成为画布卡片或拆解为知识树。",
  "actionSuggestions": [
    { "label": "🎨 在画布创建主题卡片", "command": "创建1个关于该主题的详细介绍Block" },
    { "label": "🧩 拆解为知识导图树", "command": "创建1个核心概念父Block，并创建3个核心维度子任务卡片" }
  ]
}

【铁律】：
1. 绝对严禁输出任何区块链相关内容！
2. 必须且只能输出标准的 JSON 格式，不要在 JSON 前后输出任何 markdown 解释。
3. 当用户询问通用知识或具体人物概念（如莫奈、算法等）时，严禁输出 BlockOS 自身介绍，必须在 message 中充实解答该主题内容！

请输出 JSON：`;
}