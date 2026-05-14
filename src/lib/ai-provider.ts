import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const siliconflow = createOpenAICompatible({
  name: 'siliconflow',
  baseURL: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
  apiKey: process.env.SILICONFLOW_API_KEY,
});

export const AI_MODEL = process.env.AI_MODEL || 'Qwen/Qwen3-8B';

export const AI_FALLBACK_MODEL = 'THUDM/glm-4-9b-chat';