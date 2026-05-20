import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const siliconflow = createOpenAICompatible({
  name: 'dashscope',
  baseURL:
    process.env.DASHSCOPE_BASE_URL ||
    process.env.SILICONFLOW_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY || process.env.SILICONFLOW_API_KEY,
});

export const AI_MODEL = process.env.AI_MODEL || 'qwen3.6-plus';

export const AI_FALLBACK_MODEL = 'THUDM/glm-4-9b-chat';
