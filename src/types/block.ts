export type BlockType = 'text' | 'todo' | 'code' | 'table' | 'media' | 'quote' | 'toggle' | 'divider' | 'whiteboard' | 'mindmap' | 'math';

export interface BlockMeta {
  aiContext?: string;
  tags?: string[];
  links?: string[];
  highlight?: string;
  checked?: boolean;
  language?: string;

  expanded?: boolean;
  caption?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
}

export interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'link';
  options?: string[];
}

export interface TableData {
  columns: string[];
  columnTypes?: TableColumn[];
  rows: string[][];
}

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  meta: BlockMeta;
  parentId: string | null;
  groupId?: string;
  order: number;
  x: number;
  y: number;
  width: number;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AgentRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'blockUpdate';
  triggerCondition: string;
  actions: AgentAction[];
}

export interface AgentAction {
  type: 'createBlock' | 'callAI' | 'updateBlock';
  config: Record<string, unknown>;
}

export interface AgentLog {
  id: string;
  timestamp: number;
  ruleId: string;
  blockId: string;
  result: string;
}

export interface AIActionConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const AI_ACTIONS: Record<string, AIActionConfig[]> = {
  text: [
    { id: 'summarize', label: '总结', icon: 'FileText', description: '将文本总结为要点列表' },
    { id: 'rewrite-formal', label: '改写（正式）', icon: 'PenTool', description: '改写为正式风格' },
    { id: 'rewrite-casual', label: '改写（随意）', icon: 'MessageCircle', description: '改写为随意风格' },
    { id: 'expand', label: '扩展', icon: 'Maximize2', description: '扩展内容细节' },
  ],
  todo: [
    { id: 'breakdown', label: '拆解子任务', icon: 'ListTree', description: '将任务拆解为子任务' },
    { id: 'summarize', label: '总结', icon: 'FileText', description: '总结任务要点' },
  ],
  code: [
    { id: 'explain', label: '解释代码', icon: 'HelpCircle', description: '解释代码含义' },
    { id: 'optimize', label: '优化建议', icon: 'Zap', description: '提供优化建议' },
  ],
  table: [
    { id: 'insight', label: '数据洞察', icon: 'BarChart3', description: '分析表格数据' },
    { id: 'summarize', label: '总结', icon: 'FileText', description: '总结表格内容' },
  ],
  media: [
    { id: 'caption', label: '生成描述', icon: 'FileText', description: '为媒体生成描述文字' },
  ],
  quote: [
    { id: 'summarize', label: '总结', icon: 'FileText', description: '总结引用内容' },
  ],
  toggle: [
    { id: 'summarize', label: '总结', icon: 'FileText', description: '总结折叠内容' },
  ],
  divider: [],
  whiteboard: [
    { id: 'caption', label: '生成描述', icon: 'FileText', description: '为绘图生成描述文字' },
  ],
  mindmap: [
    { id: 'expand', label: '扩展节点', icon: 'Maximize2', description: '为思维导图扩展子节点' },
    { id: 'summarize', label: '总结', icon: 'FileText', description: '总结思维导图内容' },
  ],
  math: [
    { id: 'explain', label: '解释公式', icon: 'HelpCircle', description: '解释数学公式含义' },
  ],
};
