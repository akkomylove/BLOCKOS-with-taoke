import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Block, BlockType, AgentRule, AgentLog, BlockTemplate } from '@/types/block';
import type { Page, Folder } from '@/types/page';

interface HistoryEntry {
  pageId: string;
  blocks: Block[];
  timestamp: number;
  action: string;
  blockCount: number;
}

interface BlockStore {
  pages: Page[];
  folders: Folder[];
  groups: Array<{ id: string; name: string }>;
  currentPageId: string;
  pageBlocks: Record<string, Block[]>;
  blocks: Block[];
  selectedIds: string[];
  agentRules: AgentRule[];
  agentLogs: AgentLog[];
  agentEnabled: boolean;
  _hydrated: boolean;
  _blockCounter: number;

  history: HistoryEntry[];
  historyIndex: number;

  addPage: (title?: string, folderId?: string) => string;
  addPageFromTemplate: (templateId: string, folderId?: string) => string;
  deletePage: (id: string) => void;
  updatePageTitle: (id: string, title: string) => void;
  setCurrentPage: (id: string) => void;
  saveCurrentPageBlocks: () => void;
  loadPageBlocks: (pageId: string) => void;

  addFolder: (name: string) => string;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  toggleFolderCollapse: (id: string) => void;
  movePageToFolder: (pageId: string, folderId: string | undefined) => void;

  groupBlocks: (ids: string[]) => void;
  ungroupBlocks: (groupId: string) => void;
  updateGroupName: (groupId: string, name: string) => void;

  addBlock: (type: BlockType, afterId?: string, position?: { x: number; y: number }) => string;
  duplicateBlock: (id: string) => string | null;
  updateBlock: (id: string, updates: Partial<Omit<Block, 'id' | 'createdAt'>>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (activeId: string, overId: string) => void;
  moveBlockTo: (id: string, x: number, y: number) => void;
  resizeBlock: (id: string, width: number) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  createLink: (fromId: string, toId: string) => void;
  toggleAgent: () => void;
  addAgentLog: (log: Omit<AgentLog, 'id' | 'timestamp'>) => void;
  hydrate: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveHistory: () => void;

  indentBlock: (id: string) => void;
  outdentBlock: (id: string) => void;
  getBlockDepth: (id: string) => number;

  exportToMarkdown: () => string;
  exportToHtml: () => string;

  importFromMarkdown: (markdown: string) => void;
  importFromCsv: (csv: string) => void;
  importImage: (base64: string, caption?: string) => void;

  syncToServer: () => Promise<void>;
  loadFromServer: (pageId: string) => Promise<void>;
  syncPages: () => Promise<void>;

  blockDependencies: Record<string, string[]>;
  getDependents: (blockId: string) => string[];
}

function createEmptyBlock(type: BlockType): Block {
  const now = Date.now();
  return {
    id: nanoid(),
    type,
    title: '',
    content: '',
    meta: {
      checked: type === 'todo' ? false : undefined,

      language: type === 'code' ? 'typescript' : undefined,
    },
    parentId: null,
    order: 0,
    x: 0,
    y: 0,
    width: 480,
    collapsed: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultPage(): Page {
  const now = Date.now();
  return {
    id: nanoid(),
    title: '无标题页面',
    icon: '📄',
    createdAt: now,
    updatedAt: now,
  };
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'meeting',
    name: '会议纪要',
    icon: '📝',
    description: '记录会议主题、参会人、讨论要点和待办事项',
    blocks: [
      { type: 'text', title: '会议主题', content: '# 会议主题\n\n日期：\n参会人：\n', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 400, collapsed: false },
      { type: 'todo', title: '待办事项', content: '完成会议纪要的整理和分发', meta: { checked: false }, parentId: null, order: 1, x: 40, y: 200, width: 400, collapsed: false },
      { type: 'text', title: '讨论要点', content: '## 讨论要点\n\n1. \n2. \n3. ', meta: {}, parentId: null, order: 2, x: 480, y: 40, width: 400, collapsed: false },
    ],
  },
  {
    id: 'project-plan',
    name: '项目计划',
    icon: '📊',
    description: '项目目标、里程碑、任务分配和进度追踪',
    blocks: [
      { type: 'text', title: '项目概述', content: '# 项目概述\n\n目标：\n范围：\n时间线：', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 420, collapsed: false },
      { type: 'table', title: '任务分配', content: JSON.stringify({ columns: ['任务', '负责人', '状态', '截止日期'], rows: [['', '', '未开始', '']], columnTypes: [{ name: '任务', type: 'text' }, { name: '负责人', type: 'text' }, { name: '状态', type: 'select', options: ['未开始', '进行中', '已完成'] }, { name: '截止日期', type: 'date' }] }), meta: {}, parentId: null, order: 1, x: 40, y: 220, width: 480, collapsed: false },
      { type: 'todo', title: '本周任务', content: '制定项目计划', meta: { checked: false }, parentId: null, order: 2, x: 40, y: 420, width: 400, collapsed: false },
    ],
  },
  {
    id: 'reading-notes',
    name: '读书笔记',
    icon: '📚',
    description: '书籍信息、核心观点摘录和个人思考',
    blocks: [
      { type: 'text', title: '书籍信息', content: '# 《书名》\n\n作者：\n出版社：\n阅读日期：', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 400, collapsed: false },
      { type: 'quote', title: '精彩摘录', content: '在此处记录书中的精彩段落...', meta: {}, parentId: null, order: 1, x: 40, y: 200, width: 400, collapsed: false },
      { type: 'text', title: '个人思考', content: '## 思考与感悟\n\n', meta: {}, parentId: null, order: 2, x: 480, y: 40, width: 400, collapsed: false },
    ],
  },
  {
    id: 'weekly-report',
    name: '周报',
    icon: '📅',
    description: '本周工作总结、成果展示和下周计划',
    blocks: [
      { type: 'text', title: '本周总结', content: '# 周报（第X周）\n\n## 本周完成\n\n- \n- \n\n## 遇到的问题\n\n', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 400, collapsed: false },
      { type: 'todo', title: '下周计划', content: '制定下周工作计划', meta: { checked: false }, parentId: null, order: 1, x: 40, y: 280, width: 400, collapsed: false },
      { type: 'text', title: '成果展示', content: '## 成果与数据\n\n', meta: {}, parentId: null, order: 2, x: 480, y: 40, width: 400, collapsed: false },
    ],
  },
  {
    id: 'blank',
    name: '空白页面',
    icon: '📄',
    description: '从零开始创建你的页面',
    blocks: [],
  },
];

const defaultAgentRules: AgentRule[] = [
  {
    id: 'todo-complete',
    name: '任务完成日志',
    enabled: true,
    triggerType: 'blockUpdate',
    triggerCondition: "block.type === 'todo' && !prevBlock.meta?.checked && block.meta?.checked",
    actions: [
      {
        type: 'createBlock',
        config: {
          type: 'text',
          contentTemplate: '✅ 任务完成于 {timestamp}',
          position: 'after',
        },
      },
      {
        type: 'callAI',
        config: {
          prompt: '生成一句简短的鼓励语，庆祝任务完成',
        },
      },
    ],
  },
];

const seedBlocks: Block[] = [
  {
    id: 'seed-1',
    type: 'text',
    title: '项目概述',
    content: '# BlockOS v2.0 产品发布计划\n\nBlockOS 是一个 AI 原生知识操作系统，即将发布 v2.0 版本。\n本次更新聚焦于 AI Agent 能力和团队协作功能的全面提升。',
    meta: {},
    parentId: null,
    order: 0,
    x: 40,
    y: 40,
    width: 420,
    collapsed: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'seed-2',
    type: 'todo',
    title: '核心任务',
    content: '完成 AI Agent 架构重构',
    meta: { checked: false },
    parentId: null,
    order: 1,
    x: 40,
    y: 240,
    width: 320,
    collapsed: false,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
  {
    id: 'seed-3',
    type: 'todo',
    title: '核心任务',
    content: '实现实时协作编辑功能',
    meta: { checked: false },
    parentId: null,
    order: 2,
    x: 40,
    y: 300,
    width: 320,
    collapsed: false,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  },
  {
    id: 'seed-4',
    type: 'todo',
    title: '核心任务',
    content: '完成移动端适配',
    meta: { checked: false },
    parentId: null,
    order: 3,
    x: 40,
    y: 360,
    width: 320,
    collapsed: false,
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
  },
  {
    id: 'seed-5',
    type: 'todo',
    title: '核心任务',
    content: '通过安全审计和渗透测试',
    meta: { checked: true },
    parentId: null,
    order: 4,
    x: 40,
    y: 420,
    width: 320,
    collapsed: false,
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
  },
  {
    id: 'seed-6',
    type: 'text',
    title: '目标用户',
    content: '目标用户画像\n- 个人知识工作者：笔记、写作、研究整理\n- 小型团队：项目文档、会议记录、任务追踪\n- 开发者：API 文档、代码片段管理、技术方案\n- 产品经理：PRD、竞品分析、Roadmap 规划',
    meta: {},
    parentId: null,
    order: 5,
    x: 520,
    y: 40,
    width: 360,
    collapsed: false,
    createdAt: 1700000005000,
    updatedAt: 1700000005000,
  },
  {
    id: 'seed-7',
    type: 'table',
    title: '功能优先级矩阵',
    content: JSON.stringify({
      headers: ['功能模块', '优先级', '预计工时', '负责人'],
      rows: [
        ['AI Agent 重构', 'P0', '3周', '张三'],
        ['实时协作', 'P0', '4周', '李四'],
        ['移动端适配', 'P1', '3周', '王五'],
        ['插件市场', 'P1', '2周', '张三'],
        ['数据导出增强', 'P2', '1周', '李四'],
        ['深色主题优化', 'P2', '1周', '王五'],
      ],
    }),
    meta: {},
    parentId: null,
    order: 6,
    x: 520,
    y: 240,
    width: 480,
    collapsed: false,
    createdAt: 1700000006000,
    updatedAt: 1700000006000,
  },
  {
    id: 'seed-8',
    type: 'code',
    title: 'API 接口定义',
    content: 'interface AgentConfig {\n  model: string;\n  temperature: number;\n  maxTokens: number;\n  systemPrompt: string;\n  tools: AgentTool[];\n}\n\ntype AgentTool = {\n  name: string;\n  description: string;\n  parameters: Record<string, unknown>;\n  handler: (params: unknown) => Promise<unknown>;\n};',
    meta: { language: 'typescript' },
    parentId: null,
    order: 7,
    x: 40,
    y: 520,
    width: 440,
    collapsed: false,
    createdAt: 1700000007000,
    updatedAt: 1700000007000,
  },
  {
    id: 'seed-9',
    type: 'quote',
    title: '',
    content: '软件正在吞噬世界，而 AI 正在吞噬软件。BlockOS 的目标是成为 AI 时代的操作系统级工具。',
    meta: {},
    parentId: null,
    order: 8,
    x: 520,
    y: 520,
    width: 420,
    collapsed: false,
    createdAt: 1700000008000,
    updatedAt: 1700000008000,
  },
  {
    id: 'seed-10',
    type: 'toggle',
    title: '竞品分析',
    content: 'Notion、Obsidian、Craft 等竞品功能对比',
    meta: {},
    parentId: null,
    order: 9,
    x: 520,
    y: 620,
    width: 380,
    collapsed: false,
    createdAt: 1700000009000,
    updatedAt: 1700000009000,
  },
  {
    id: 'seed-11',
    type: 'text',
    title: '发布时间线',
    content: '发布里程碑\n\n4月15日 → 内部 Alpha 测试\n5月1日 → 封闭 Beta 邀请\n5月15日 → 公开 Beta 上线\n6月1日 → v2.0 正式发布',
    meta: {},
    parentId: null,
    order: 10,
    x: 40,
    y: 800,
    width: 380,
    collapsed: false,
    createdAt: 1700000010000,
    updatedAt: 1700000010000,
  },
  {
    id: 'seed-12',
    type: 'divider',
    title: '',
    content: '',
    meta: {},
    parentId: null,
    order: 11,
    x: 40,
    y: 960,
    width: 320,
    collapsed: false,
    createdAt: 1700000011000,
    updatedAt: 1700000011000,
  },
  {
    id: 'seed-13',
    type: 'text',
    title: '风险与应对',
    content: '潜在风险\n\n1. AI 模型稳定性 → 配置多模型降级策略\n2. 实时协作冲突 → 采用 CRDT 算法\n3. 移动端性能 → 渐进式 Web App 方案\n4. 用户数据安全 → 端到端加密 + 本地优先存储',
    meta: {},
    parentId: null,
    order: 12,
    x: 40,
    y: 1000,
    width: 400,
    collapsed: false,
    createdAt: 1700000012000,
    updatedAt: 1700000012000,
  },
];

function getBlockDepthInBlocks(blocks: Block[], id: string): number {
  let depth = 0;
  let current = blocks.find((b) => b.id === id);
  while (current?.parentId) {
    depth++;
    current = blocks.find((b) => b.id === current!.parentId);
  }
  return depth;
}

const defaultPage = createDefaultPage();

export const useBlockStore = create<BlockStore>()(
  persist(
    immer((set, get) => ({
      pages: [{ ...defaultPage, title: 'BlockOS v2.0 产品发布计划', icon: '📋' }],
      folders: [],
        groups: [],
        _blockCounter: 0,
      currentPageId: defaultPage.id,
      pageBlocks: { [defaultPage.id]: seedBlocks },
      blocks: seedBlocks,
      selectedIds: [],
      agentRules: defaultAgentRules,
      agentLogs: [],
      agentEnabled: true,
      _hydrated: false,
      history: [],
      historyIndex: -1,

      saveCurrentPageBlocks: () => {
        set((state) => {
          state.pageBlocks[state.currentPageId] = JSON.parse(JSON.stringify(state.blocks));
        });
      },

      loadPageBlocks: (pageId) => {
        set((state) => {
          state.blocks = state.pageBlocks[pageId] ? JSON.parse(JSON.stringify(state.pageBlocks[pageId])) : [];
        });
      },

      addPage: (title, folderId) => {
        const newPage = createDefaultPage();
        if (title) newPage.title = title;
        if (folderId) newPage.folderId = folderId;
        set((state) => {
          state.pageBlocks[state.currentPageId] = JSON.parse(JSON.stringify(state.blocks));
          state.pages.push(newPage);
          state.currentPageId = newPage.id;
          state.pageBlocks[newPage.id] = [];
          state.blocks = [];
          state.selectedIds = [];
        });
        get().saveHistory();
        fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newPage.title, icon: newPage.icon }),
        }).catch(() => {});
        return newPage.id;
      },

      addPageFromTemplate: (templateId: string, folderId?: string) => {
        const template = BLOCK_TEMPLATES.find((t) => t.id === templateId);
        const newPage = createDefaultPage();
        newPage.title = template ? template.name : '新页面';
        newPage.icon = template ? template.icon : '📄';
        if (folderId) newPage.folderId = folderId;
        set((state) => {
          state.pageBlocks[state.currentPageId] = JSON.parse(JSON.stringify(state.blocks));
          state.pages.push(newPage);
          state.currentPageId = newPage.id;
          state.selectedIds = [];
          if (template && template.blocks.length > 0) {
            const now = Date.now();
            const newBlocks: Block[] = template.blocks.map((b, i) => ({
              ...b,
              id: nanoid(),
              createdAt: now,
              updatedAt: now,
              order: i,
            }));
            state.pageBlocks[newPage.id] = newBlocks;
            state.blocks = newBlocks;
          } else {
            state.pageBlocks[newPage.id] = [];
            state.blocks = [];
          }
        });
        get().saveHistory();
        fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newPage.title, icon: newPage.icon }),
        }).catch(() => {});
        return newPage.id;
      },

      deletePage: (id) => {
        set((state) => {
          state.pageBlocks[state.currentPageId] = JSON.parse(JSON.stringify(state.blocks));
          delete state.pageBlocks[id];
          state.pages = state.pages.filter((p) => p.id !== id);
          if (state.currentPageId === id && state.pages.length > 0) {
            state.currentPageId = state.pages[0].id;
            state.blocks = state.pageBlocks[state.currentPageId] ? JSON.parse(JSON.stringify(state.pageBlocks[state.currentPageId])) : [];
          }
        });
      },

      updatePageTitle: (id, title) => {
        set((state) => {
          const page = state.pages.find((p) => p.id === id);
          if (page) {
            page.title = title;
            page.updatedAt = Date.now();
          }
        });
      },

      setCurrentPage: (id) => {
        set((state) => {
          state.pageBlocks[state.currentPageId] = JSON.parse(JSON.stringify(state.blocks));
          state.currentPageId = id;
          state.blocks = state.pageBlocks[id] ? JSON.parse(JSON.stringify(state.pageBlocks[id])) : [];
          state.selectedIds = [];
        });
      },

      addFolder: (name) => {
        const folder: Folder = {
          id: nanoid(),
          name,
          collapsed: false,
          createdAt: Date.now(),
        };
        set((state) => {
          state.folders.push(folder);
        });
        return folder.id;
      },

      deleteFolder: (id) => {
        set((state) => {
          state.folders = state.folders.filter((f) => f.id !== id);
          state.pages.forEach((p) => {
            if (p.folderId === id) p.folderId = undefined;
          });
        });
      },

      renameFolder: (id, name) => {
        set((state) => {
          const folder = state.folders.find((f) => f.id === id);
          if (folder) folder.name = name;
        });
      },

      toggleFolderCollapse: (id) => {
        set((state) => {
          const folder = state.folders.find((f) => f.id === id);
          if (folder) folder.collapsed = !folder.collapsed;
        });
      },

      movePageToFolder: (pageId, folderId) => {
        set((state) => {
          const page = state.pages.find((p) => p.id === pageId);
          if (page) page.folderId = folderId;
        });
      },

      groupBlocks: (ids: string[]) => {
        if (ids.length < 2) return;
        const groupId = nanoid();
        const groupName = `组合 ${get().groups.length + 1}`;
        set((state) => {
          state.groups.push({ id: groupId, name: groupName });
          ids.forEach((id) => {
            const block = state.blocks.find((b) => b.id === id);
            if (block) block.groupId = groupId;
          });
        });
        get().saveHistory();
      },

      ungroupBlocks: (groupId: string) => {
        set((state) => {
          state.groups = state.groups.filter((g) => g.id !== groupId);
          state.blocks.forEach((b) => {
            if (b.groupId === groupId) b.groupId = undefined;
          });
        });
        get().saveHistory();
      },

      updateGroupName: (groupId: string, name: string) => {
        set((state) => {
          const group = state.groups.find((g) => g.id === groupId);
          if (group) group.name = name;
        });
      },

      addBlock: (type, afterId, position) => {
        const newBlock = createEmptyBlock(type);
        set((state) => {
          state._blockCounter = (state._blockCounter || 0) + 1;
          newBlock.title = `未命名 Block ${state._blockCounter}`;
          const blocks = state.blocks;
          const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order)) : -1;
          newBlock.order = maxOrder + 1;

          if (position) {
            newBlock.x = position.x;
            newBlock.y = position.y;
          } else if (afterId) {
            const afterBlock = blocks.find((b) => b.id === afterId);
            if (afterBlock) {
              newBlock.x = afterBlock.x;
              newBlock.y = afterBlock.y + 80;
            }
          } else {
            const maxY = blocks.length > 0 ? Math.max(...blocks.map((b) => b.y + 80)) : 0;
            newBlock.x = 40;
            newBlock.y = maxY + 20;
          }
          blocks.push(newBlock);
        });
        get().saveHistory();
        return newBlock.id;
      },

      duplicateBlock: (id) => {
        const state = get();
        const source = state.blocks.find((b) => b.id === id);
        if (!source) return null;
        const clone = createEmptyBlock(source.type);
        clone.title = source.title;
        clone.content = source.content;
        clone.meta = JSON.parse(JSON.stringify(source.meta));
        clone.parentId = source.parentId;
        clone.width = source.width;
        clone.collapsed = false;
        set((s) => {
          const maxOrder = s.blocks.length > 0 ? Math.max(...s.blocks.map((b) => b.order)) : -1;
          clone.order = maxOrder + 1;
          clone.x = source.x + 30;
          clone.y = source.y + 40;
          s.blocks.push(clone);
        });
        get().saveHistory();
        return clone.id;
      },

      updateBlock: (id, updates) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (block) {
            const updatedMeta = updates.meta
              ? { ...block.meta, ...updates.meta }
              : block.meta;
            Object.assign(block, { ...updates, meta: updatedMeta, updatedAt: Date.now() });
          }
        });
        get().saveHistory();
        // trigger dependents refresh
        const dependents = get().getDependents(id);
        dependents.forEach((depId) => {
          const depBlock = get().blocks.find((b) => b.id === depId);
          if (depBlock && depBlock.type === 'code') {
            set((state) => {
              const b = state.blocks.find((x) => x.id === depId);
              if (b) b.updatedAt = Date.now();
            });
          }
        });
      },

      deleteBlock: (id) => {
        set((state) => {
          state.blocks = state.blocks.filter((b) => b.id !== id);
        });
        get().saveHistory();
      },

      moveBlock: (activeId, overId) => {
        set((state) => {
          const activeIndex = state.blocks.findIndex((b) => b.id === activeId);
          const overIndex = state.blocks.findIndex((b) => b.id === overId);
          if (activeIndex === -1 || overIndex === -1) return;

          const [moved] = state.blocks.splice(activeIndex, 1);
          state.blocks.splice(overIndex, 0, moved);

          state.blocks.forEach((block, index) => {
            block.order = index;
          });
        });
        get().saveHistory();
      },

      moveBlockTo: (id, x, y) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (block) {
            block.x = x;
            block.y = y;
            block.updatedAt = Date.now();
          }
        });
      },

      resizeBlock: (id, width) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (block) {
            block.width = Math.max(200, width);
            block.updatedAt = Date.now();
          }
        });
      },

      setSelection: (ids) => {
        set((state) => {
          state.selectedIds = ids;
        });
      },

      toggleSelection: (id) => {
        set((state) => {
          const index = state.selectedIds.indexOf(id);
          if (index > -1) {
            state.selectedIds.splice(index, 1);
          } else {
            state.selectedIds.push(id);
          }
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedIds = [];
        });
      },

      createLink: (fromId, toId) => {
        set((state) => {
          const fromBlock = state.blocks.find((b) => b.id === fromId);
          if (fromBlock) {
            if (!fromBlock.meta.links) {
              fromBlock.meta.links = [];
            }
            if (!fromBlock.meta.links.includes(toId)) {
              fromBlock.meta.links.push(toId);
            }
          }
        });
      },

      toggleAgent: () => {
        set((state) => {
          state.agentEnabled = !state.agentEnabled;
        });
      },

      addAgentLog: (log) => {
        set((state) => {
          state.agentLogs.unshift({
            ...log,
            id: nanoid(),
            timestamp: Date.now(),
          });
          if (state.agentLogs.length > 20) {
            state.agentLogs = state.agentLogs.slice(0, 20);
          }
        });
      },

      hydrate: () => {
        set({ _hydrated: true });
      },

      saveHistory: () => {
        set((state) => {
          const prevEntry = state.history[state.historyIndex];
          const prevCount = prevEntry?.blocks.length || 0;
          const currCount = state.blocks.length;
          let action = '编辑';
          if (currCount > prevCount) action = '创建';
          else if (currCount < prevCount) action = '删除';

          const entry: HistoryEntry = {
            pageId: state.currentPageId,
            blocks: JSON.parse(JSON.stringify(state.blocks)),
            timestamp: Date.now(),
            action,
            blockCount: currCount,
          };
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(entry);
          if (state.history.length > 50) {
            state.history.shift();
          }
          state.historyIndex = state.history.length - 1;
        });
        get().syncToServer().catch(() => {});
      },

      undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return;
        const newIndex = state.historyIndex - 1;
        const entry = state.history[newIndex];
        set((s) => {
          s.historyIndex = newIndex;
          s.blocks = JSON.parse(JSON.stringify(entry.blocks));
          s.currentPageId = entry.pageId;
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;
        const newIndex = state.historyIndex + 1;
        const entry = state.history[newIndex];
        set((s) => {
          s.historyIndex = newIndex;
          s.blocks = JSON.parse(JSON.stringify(entry.blocks));
          s.currentPageId = entry.pageId;
        });
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      indentBlock: (id) => {
        set((state) => {
          const blocks = state.blocks;
          const index = blocks.findIndex((b) => b.id === id);
          if (index <= 0) return;

          const current = blocks[index];
          const prev = blocks[index - 1];

          // Find the previous block at the same or higher level to become parent
          let targetParent = prev.id;
          for (let i = index - 1; i >= 0; i--) {
            const b = blocks[i];
            const depth = getBlockDepthInBlocks(blocks, b.id);
            if (depth <= getBlockDepthInBlocks(blocks, current.id)) {
              targetParent = b.id;
              break;
            }
          }

          // Max depth 5
          const currentDepth = getBlockDepthInBlocks(blocks, current.id);
          if (currentDepth >= 5) return;

          current.parentId = targetParent;
          current.order = index;
        });
        get().saveHistory();
      },

      outdentBlock: (id) => {
        set((state) => {
          const blocks = state.blocks;
          const index = blocks.findIndex((b) => b.id === id);
          if (index < 0) return;

          const current = blocks[index];
          if (!current.parentId) return;

          // Find grandparent
          const parent = blocks.find((b) => b.id === current.parentId);
          current.parentId = parent?.parentId || null;
          current.order = index;
        });
        get().saveHistory();
      },

      getBlockDepth: (id) => {
        const state = get();
        return getBlockDepthInBlocks(state.blocks, id);
      },

      exportToMarkdown: () => {
        const state = get();
        const sorted = [...state.blocks].sort((a, b) => a.order - b.order);
        const lines: string[] = [];

        const getDepth = (id: string) => getBlockDepthInBlocks(sorted, id);

        for (const block of sorted) {
          const depth = getDepth(block.id);
          const indent = '  '.repeat(depth);

          switch (block.type) {
            case 'text':
              lines.push(`${indent}${block.content}`);
              break;
            case 'todo':
              lines.push(`${indent}- [${block.meta.checked ? 'x' : ' '}] ${block.content}`);
              break;
            case 'code':
              lines.push(`${indent}\`\`\`${block.meta.language || ''}`);
              lines.push(`${indent}${block.content}`);
              lines.push(`${indent}\`\`\``);
              break;
            case 'table':
              try {
                const data = JSON.parse(block.content);
                if (data.headers) {
                  lines.push(`${indent}| ${data.headers.join(' | ')} |`);
                  lines.push(`${indent}| ${data.headers.map(() => '---').join(' | ')} |`);
                  for (const row of data.rows || []) {
                    lines.push(`${indent}| ${row.join(' | ')} |`);
                  }
                }
              } catch {
                lines.push(`${indent}${block.content}`);
              }
              break;
            case 'media':
              lines.push(`${indent}![${block.meta.caption || 'media'}](${block.content})`);
              break;
            case 'quote':
              lines.push(`${indent}> ${block.content}`);
              break;
            case 'toggle':
              lines.push(`${indent}<details><summary>${block.content}</summary>`);
              lines.push(`${indent}</details>`);
              break;
            case 'divider':
              lines.push(`${indent}---`);
              break;
          }
          lines.push('');
        }

        return lines.join('\n');
      },

      exportToHtml: () => {
        const state = get();
        const sorted = [...state.blocks].sort((a, b) => a.order - b.order);

        const renderBlock = (block: Block, depth: number = 0): string => {
          const children = sorted.filter((b) => b.parentId === block.id);
          let html = '';
          const indent = depth * 20;

          switch (block.type) {
            case 'text':
              html = `<p style="margin-left:${indent}px">${block.content}</p>`;
              break;
            case 'todo':
              html = `<p style="margin-left:${indent}px" class="${block.meta.checked ? 'todo-checked' : 'todo-item'}">${block.meta.checked ? '☑' : '☐'} ${block.content}</p>`;
              break;
            case 'code':
              html = `<pre style="margin-left:${indent}px"><code>${block.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
              break;
            case 'table':
              try {
                const data = JSON.parse(block.content);
                if (data.headers) {
                  html = `<table style="margin-left:${indent}px"><thead><tr>${data.headers.map((h: string) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${(data.rows || []).map((row: string[]) => `<tr>${row.map((c: string) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
                }
              } catch {
                html = `<p style="margin-left:${indent}px">${block.content}</p>`;
              }
              break;
            case 'media':
              html = `<img src="${block.content}" style="max-width:100%;margin-left:${indent}px" alt="${block.meta.caption || ''}" />`;
              break;
            case 'quote':
              html = `<blockquote style="margin-left:${indent}px">${block.content}</blockquote>`;
              break;
            case 'toggle':
              html = `<details style="margin-left:${indent}px"><summary>${block.content}</summary></details>`;
              break;
            case 'divider':
              html = '<hr />';
              break;
          }

          if (children.length > 0) {
            html += `<div style="margin-left:20px">${children.map((c) => renderBlock(c, depth + 1)).join('')}</div>`;
          }

          return html;
        };

        const roots = sorted.filter((b) => !b.parentId);
        return roots.map((b) => renderBlock(b)).join('\n');
      },

      importFromMarkdown: (markdown) => {
        const lines = markdown.split('\n');
        const newBlocks: Block[] = [];
        let currentCode: string[] = [];
        let codeLang = '';
        let inCode = false;
        let textBuffer: string[] = [];

        const flushText = () => {
          if (textBuffer.length > 0) {
            const content = textBuffer.join('\n').trim();
            if (content) {
              newBlocks.push({
                ...createEmptyBlock('text'),
                content,
              });
            }
            textBuffer = [];
          }
        };

        for (const line of lines) {
          if (line.startsWith('```')) {
            if (!inCode) {
              flushText();
              codeLang = line.slice(3).trim();
              inCode = true;
            } else {
              newBlocks.push({
                ...createEmptyBlock('code'),
                content: currentCode.join('\n'),
                meta: { language: codeLang || 'text' },
              });
              currentCode = [];
              codeLang = '';
              inCode = false;
            }
            continue;
          }

          if (inCode) {
            currentCode.push(line);
            continue;
          }

          const trimmed = line.trim();
          if (!trimmed) {
            textBuffer.push(line);
            continue;
          }

          if (trimmed === '---') {
            flushText();
            newBlocks.push(createEmptyBlock('divider'));
            continue;
          }

          if (trimmed.startsWith('- [') || trimmed.startsWith('* [')) {
            flushText();
            const checked = trimmed.includes('[x]');
            const content = trimmed.replace(/^[-*]\s*\[[x\s]\]\s*/, '');
            newBlocks.push({
              ...createEmptyBlock('todo'),
              content,
              meta: { checked },
            });
            continue;
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            flushText();
            newBlocks.push({
              ...createEmptyBlock('text'),
              content: trimmed,
            });
            continue;
          }

          if (/^\d+\.\s/.test(trimmed)) {
            flushText();
            newBlocks.push({
              ...createEmptyBlock('text'),
              content: trimmed,
            });
            continue;
          }

          if (trimmed.startsWith('> ')) {
            flushText();
            newBlocks.push({
              ...createEmptyBlock('quote'),
              content: trimmed.slice(2),
            });
            continue;
          }

          if (trimmed.startsWith('#')) {
            flushText();
          }

          textBuffer.push(line);
        }

        flushText();

        set((state) => {
          const maxOrder = state.blocks.length > 0 ? Math.max(...state.blocks.map((b) => b.order)) : -1;
          newBlocks.forEach((b, i) => {
            b.order = maxOrder + 1 + i;
          });
          state.blocks.push(...newBlocks);
        });
        get().saveHistory();
      },

      importFromCsv: (csv) => {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return;

        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map(parseLine);

        const block = createEmptyBlock('table');
        block.content = JSON.stringify({ headers, rows });

        set((state) => {
          const maxOrder = state.blocks.length > 0 ? Math.max(...state.blocks.map((b) => b.order)) : -1;
          block.order = maxOrder + 1;
          state.blocks.push(block);
        });
        get().saveHistory();
      },

      importImage: (base64, caption) => {
        const block = createEmptyBlock('media');
        block.content = base64;
        if (caption) block.meta = { ...block.meta, caption };

        set((state) => {
          const maxOrder = state.blocks.length > 0 ? Math.max(...state.blocks.map((b) => b.order)) : -1;
          block.order = maxOrder + 1;
          state.blocks.push(block);
        });
        get().saveHistory();
      },

      syncToServer: async () => {
        const state = get();
        const pageId = state.currentPageId;
        if (!pageId) return;
        try {
          await fetch(`/api/pages/${pageId}/blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks: state.blocks }),
          });
        } catch {
          // silent fail - localStorage still works
        }
      },

      loadFromServer: async (pageId) => {
        try {
          const res = await fetch(`/api/pages/${pageId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.blocks) {
            set((state) => {
              state.blocks = data.blocks;
              state.pageBlocks[pageId] = data.blocks;
            });
          }
        } catch {
          // silent fail - keep local data
        }
      },

      syncPages: async () => {
        try {
          const res = await fetch('/api/pages');
          if (!res.ok) return;
          const data = await res.json();
          if (data.pages && data.pages.length > 0) {
            set((s) => {
              s.pages = data.pages.map((p: Record<string, unknown>) => ({
                id: p.id as string,
                title: p.title as string,
                icon: p.icon as string,
                createdAt: p.created_at as number,
                updatedAt: p.updated_at as number,
              }));
            });
          }
        } catch {
          // silent fail
        }
      },

      blockDependencies: {},

      getDependents: (blockId: string) => {
        const state = get();
        const dependents: string[] = [];
        state.blocks.forEach((b) => {
          if (b.type === 'code' && b.content.includes(`// @ref`)) {
            const regex = /\/\/\s*@ref\s+(\w+)/g;
            let match;
            while ((match = regex.exec(b.content)) !== null) {
              const varName = match[1];
              const target = state.blocks.find((x) => x.id === varName || x.title === varName);
              if (target && target.id === blockId) {
                dependents.push(b.id);
              }
            }
          }
        });
        return dependents;
      },
    })),
    {
      name: 'blockos-storage',
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
