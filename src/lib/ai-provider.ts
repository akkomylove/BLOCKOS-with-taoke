import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const siliconflow = createOpenAICompatible({
  name: 'ai-provider',
  baseURL:
    process.env.ZHIPU_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL ||
    process.env.SILICONFLOW_BASE_URL ||
    'https://open.bigmodel.cn/api/paas/v4',
  apiKey:
    process.env.ZHIPU_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.SILICONFLOW_API_KEY,
});

export const AI_MODEL = process.env.AI_MODEL || 'glm-4-flash';

export const AI_FALLBACK_MODEL = 'glm-4-flash';
