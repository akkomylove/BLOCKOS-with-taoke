import { getPresetDocumentBlocks } from './presetDocuments';
import type { AccountMode } from '@/types/account';

export function getAccountGuide(mode: AccountMode) {
  const blocks = getPresetDocumentBlocks('doc-guide');
  if (mode === 'enterprise') return blocks;
  const copy: Record<string, { title: string; content: string }> = {
    'guide-block-welcome': { title: '1. 欢迎来到个人工作区', content: '# 你的个人知识工作区\n\n用卡片整理笔记、阅读材料和想法。拖动标题可以移动卡片，拖动边缘可以调整大小。\n\n左侧新建文档，顶部使用 AI 助手、搜索和导入导出。所有内容属于当前登录账号。' },
    'guide-block-todo': { title: '2. 记录一个个人待办', content: '体验一次个人记录：整理今天读到的一个新想法' },
    'guide-block-ai': { title: '3. 让 AI 帮你整理内容', content: '悬停卡片，使用 AI 按钮总结、扩写或改写。也可以打开顶部 AI 对话，围绕当前文档提问。' },
  };
  return blocks.map(block => ({ ...block, ...(copy[block.id] || {}),
    ...(block.type === 'text' && block.content.includes('企业级协同中心') ? { title: '个人工具与账号中心', content: '## 从一个想法开始\n\n- 在左侧新建文档或文件夹，整理学习、生活和工作内容。\n- 使用 AI 助手、Copilot、搜索和历史版本。\n- 点击「个人模式」打开账号中心，编辑资料、修改密码。\n- 需要团队、成员和项目协作时，可切换企业模式；切换会保留已有内容。' } : {}),
    meta: { ...block.meta, tags: block.meta.tags?.filter(tag => !tag.includes('协同')) },
    ...(block.type === 'table' ? { content: personalTable(block.content) } : {}),
  }));
}

function personalTable(content: string) {
  try {
    const table = JSON.parse(content);
    if (Array.isArray(table.rows)) table.rows = table.rows.filter((row: string[]) => row[0] !== '团队协同');
    return JSON.stringify(table);
  } catch { return content; }
}
