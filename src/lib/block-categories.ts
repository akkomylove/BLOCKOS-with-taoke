import type { BlockType } from '@/types/block';

export interface BlockCategoryItem {
  type: BlockType;
  label: string;
  description: string;
  badge?: string;
}

export interface BlockCategory {
  id: 'basic' | 'data' | 'visual' | 'widget';
  title: string;
  description: string;
  items: BlockCategoryItem[];
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'basic',
    title: '基础排版',
    description: '文档层级、待办清单与结构化引用',
    items: [
      { type: 'text', label: '正文文本', description: '普通多行文本与富文本排版' },
      { type: 'todo', label: '待办清单', description: '可交互勾选的冲刺任务事项' },
      { type: 'quote', label: '引言引用', description: '高亮要点、名言与结论引用块' },
      { type: 'toggle', label: '折叠列表', description: '隐藏次要细节，点击展开/收起' },
      { type: 'divider', label: '分割线', description: '优雅区隔视觉段落与模块' },
    ],
  },
  {
    id: 'data',
    title: '核心与数据',
    description: '代码工程、数据表格与外部知识引用',
    items: [
      { type: 'code', label: '代码块', description: '语法高亮、复制与多语言切换' },
      { type: 'table', label: '数据表格', description: '轻量行列增删与结构化数据录入' },
      { type: 'bookmark', label: '网页书签', description: '嵌入外部原型、文档或知识库链接卡片', badge: 'New' },
      { type: 'math', label: 'LaTeX公式', description: 'KaTeX渲染的数学与工程物理公式' },
    ],
  },
  {
    id: 'visual',
    title: '可视化与绘图',
    description: '自由白板、思维导图、架构图与多媒体',
    items: [
      { type: 'mindmap', label: '思维导图', description: '多级节点拆解，支持子Block下钻' },
      { type: 'mermaid', label: '架构流程图', description: 'Mermaid图表引擎驱动的流程/时序/状态图', badge: 'New' },
      { type: 'whiteboard', label: '自由白板', description: '手绘涂鸦、箭头与自由标注画布' },
      { type: 'media', label: '多媒体', description: '图片预览与多媒体资源' },
    ],
  },
  {
    id: 'widget',
    title: '敏捷小组件',
    description: '飞书风格警示高亮与里程碑倒计时',
    items: [
      { type: 'callout', label: '高亮提示', description: '提示/注意/阻断/达成5种高亮警示容器', badge: 'New' },
      { type: 'countdown', label: '冲刺倒计时', description: '实时跳动翻牌器，紧盯交付里程碑', badge: 'New' },
    ],
  },
];

export const ALL_BLOCK_ITEMS: BlockCategoryItem[] = BLOCK_CATEGORIES.flatMap((c) => c.items);

export const BLOCK_ITEM_MAP: Record<BlockType, BlockCategoryItem> = ALL_BLOCK_ITEMS.reduce(
  (acc, item) => {
    acc[item.type] = item;
    return acc;
  },
  {} as Record<BlockType, BlockCategoryItem>
);
