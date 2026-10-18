import type { Operation } from '@/lib/canvas-assistant';

export function explicitTextCardCreation(command: string): Operation | null {
  // Only an explicit, named text-card instruction can be repaired locally.
  // Questions about capability and negated instructions must remain read-only.
  if (/(?:不要|别|无需|不需要|禁止|能否|能不能|是否能|如何|怎么).{0,12}(?:创建|新建|新增|添加)/.test(command)) return null;
  const match = command.match(/(?:^|[，,。；;\n]|另外|并且|同时)(?:\s|请|帮我|为我|另外|再|同时)*(?:新建|创建|新增|添加)(?:一[个张]|1[个张])?(?:正文|文本)(?:卡片|块|Block)[^。；;\n]*?标题(?:写成|设为|设置为|写|为|是|叫|[：:])\s*[“「"']?([^”」"'，,。；;\n！？!?]+)/i);
  const title = match?.[1].trim();
  return title ? { action: 'createBlock', type: 'text', title: title.slice(0, 200), content: '' } : null;
}

export function requestsCanvasChange(command: string): boolean {
  if (explicitTextCardCreation(command)) return true;
  return /(?:^|[，,。；;\n]|另外|并且|同时)(?:\s|请|帮我|为我|另外|再|同时)*(?:创建|新建|新增|添加|删除|清空|修改|更新|高亮|移动|连线|拆分|保存为|整理成)/.test(command)
    && !/(?:不要|别|无需|不需要|能否|能不能|如何|怎么).{0,12}(?:创建|新建|删除|修改|清空)/.test(command);
}
