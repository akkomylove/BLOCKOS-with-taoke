import { getUserId } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.SILICONFLOW_API_KEY;
    const baseUrl =
      process.env.DASHSCOPE_BASE_URL ||
      process.env.SILICONFLOW_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = process.env.AI_MODEL || 'qwen3.6-plus';

    const prompt = `你是一个项目管理专家。请分析以下项目计划书，并返回JSON格式的分析结果（只返回JSON，不要其他内容）。

项目计划书内容：
${content.slice(0, 8000)}

请返回以下JSON结构：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "priority": "low|medium|high|urgent",
      "suggestedAssigneeFunction": "建议的负责人职能（如：前端开发、后端开发、UI设计等）",
      "subtasks": [{ "title": "子任务标题", "description": "子任务描述" }],
      "estimatedDays": 预计天数(number)
    }
  ],
  "review": {
    "strengths": ["项目优势1", "项目优势2"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["改进建议1", "改进建议2"],
    "riskPoints": ["风险点1", "风险点2"]
  },
  "workflow": [
    {
      "phase": "阶段名称（如：需求分析、设计、开发、测试、部署）",
      "description": "阶段描述",
      "tasks": ["该阶段包含的任务标题"],
      "assigneeFunction": "负责人职能",
      "order": 阶段序号(number),
      "estimatedDays": 预计天数(number)
    }
  ]
}

注意：
1. 每个任务都要有合理的优先级和预估天数
2. workflow中的tasks应该是tasks数组中已列出的任务标题
3. 任务总数量控制在5-15个，子任务每个不超过5个
4. 阶段的order从1开始递增`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的项目管理助手，只返回JSON，不要任何额外解释。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI API error:', err);
      return NextResponse.json({ error: `AI API 调用失败: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
    } catch {
      console.error('AI JSON parse error, raw:', aiContent.slice(0, 500));
      return NextResponse.json({ error: 'AI返回格式错误，请重试' }, { status: 422 });
    }

    return NextResponse.json({ analysis: result });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-analyze error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
