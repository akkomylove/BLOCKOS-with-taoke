import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Block, BlockType, AgentRule, AgentLog, BlockTemplate } from '@/types/block';
import type { Page, Folder } from '@/types/page';
import { PRESET_DOCUMENTS, getPresetDocumentBlocks } from '@/config/presetDocuments';

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
    id: 'demo-prd',
    name: '实战演示文档',
    icon: '🛒',
    description: 'CircleLight 电商平台 PRD 完整演示文档，包含多种 Block 类型',
    blocks: [
      { type: 'text', title: '项目概述', content: '# 电商平台开发项目 PRD\n\n## 项目背景\n\nCircleLight 计划开发一款面向中小企业的电商平台，支持多店铺管理、商品上架、订单处理、支付集成和物流追踪。\n\n## 核心目标\n\n- 3个月内完成 MVP 版本上线\n- 支持日均 10,000 订单处理能力\n- 移动端响应式适配\n- 集成主流支付渠道（微信支付、支付宝、银联）', meta: { tags: ['实战演示文档'] }, parentId: null, order: 0, x: 40, y: 40, width: 480, collapsed: false },
      { type: 'text', title: '功能模块', content: '## 功能模块清单\n\n### 用户系统\n- 用户注册/登录（手机号+验证码、微信授权）\n- 个人中心（订单、地址、收藏、优惠券）\n- 会员等级体系\n\n### 商品系统\n- 商品分类管理（三级分类）\n- SKU 管理（规格、库存、价格）\n- 商品搜索与筛选\n- 商品评价与问答\n\n### 订单系统\n- 购物车（增删改查、批量结算）\n- 订单创建与支付\n- 订单状态流转（待付款→待发货→已发货→已完成）\n- 售后退款/退货流程\n\n### 支付系统\n- 微信支付（JSAPI、Native、H5）\n- 支付宝（手机网站、APP）\n- 银联云闪付\n- 余额支付\n\n### 物流系统\n- 快递公司对接（顺丰、中通、圆通等）\n- 物流轨迹查询\n- 电子面单打印\n\n### 营销系统\n- 优惠券（满减、折扣、免邮）\n- 秒杀活动\n- 拼团功能\n- 积分商城', meta: { tags: ['实战演示文档'] }, parentId: null, order: 1, x: 40, y: 280, width: 480, collapsed: false },
      { type: 'table', title: '技术栈选型', content: JSON.stringify({ headers: ['层级', '技术选型', '版本', '说明'], rows: [['前端', 'Next.js', '15.x', 'React 框架，支持 SSR/SSG'], ['前端', 'Tailwind CSS', '3.x', '原子化 CSS 框架'], ['前端', 'Zustand', '5.x', '状态管理'], ['后端', 'Node.js', '20 LTS', '运行环境'], ['后端', 'Prisma', '5.x', 'ORM 框架'], ['数据库', 'PostgreSQL', '16', '主数据库'], ['缓存', 'Redis', '7.x', '会话、缓存、队列'], ['搜索', 'Elasticsearch', '8.x', '商品搜索'], ['消息队列', 'RabbitMQ', '3.x', '异步任务'], ['支付', '官方 SDK', '-', '微信、支付宝、银联'], ['部署', 'Docker', '-', '容器化部署'], ['CI/CD', 'GitHub Actions', '-', '自动化构建']], }), meta: { tags: ['实战演示文档'] }, parentId: null, order: 2, x: 560, y: 40, width: 520, collapsed: false },
      { type: 'text', title: '团队分工', content: '## 项目团队\n\n| 角色 | 姓名 | 职能 | 负责模块 |\n|------|------|------|----------|\n| 产品经理 | 陈明远 | 产品规划、需求分析 | 整体产品方向、PRD 文档 |\n| 前端开发 | 林小薇 | 前端架构、UI 实现 | 用户端 H5、管理后台 |\n| 后端开发 | 张浩然 | 后端架构、API 开发 | 用户系统、订单系统、支付系统 |\n| UI 设计师 | 苏婉清 | 视觉设计、交互设计 | 设计规范、高保真原型 |\n| 测试工程师 | 王志强 | 测试策略、自动化测试 | 功能测试、性能测试、回归测试 |', meta: { tags: ['实战演示文档'] }, parentId: null, order: 3, x: 560, y: 340, width: 480, collapsed: false },
      { type: 'text', title: '开发里程碑', content: '## 项目里程碑\n\n### 第一阶段：基础架构（第1-2周）\n- 项目初始化、开发环境搭建\n- 数据库设计、API 规范制定\n- 前端组件库搭建\n\n### 第二阶段：核心功能（第3-6周）\n- 用户系统完整实现\n- 商品系统完整实现\n- 购物车与订单流程\n\n### 第三阶段：支付与物流（第7-9周）\n- 支付渠道对接\n- 物流系统对接\n- 订单状态机完善\n\n### 第四阶段：营销与优化（第10-11周）\n- 优惠券、秒杀、拼团\n- 性能优化、安全加固\n- 测试覆盖与 Bug 修复\n\n### 第五阶段：上线准备（第12周）\n- 生产环境部署\n- 数据迁移\n- 灰度发布', meta: { tags: ['实战演示文档'] }, parentId: null, order: 4, x: 40, y: 680, width: 480, collapsed: false },
      { type: 'text', title: '风险与应对', content: '## 风险分析\n\n| 风险 | 影响 | 应对措施 |\n|------|------|----------|\n| 支付接口审核周期长 | 高 | 提前申请，准备备用方案 |\n| 高并发性能瓶颈 | 高 | 引入缓存、消息队列、数据库读写分离 |\n| 第三方物流接口不稳定 | 中 | 多物流商对接，降级策略 |\n| 需求变更频繁 | 中 | 敏捷开发，两周一个迭代 |\n| 团队成员请假/离职 | 低 | 代码审查、文档完善、知识共享 |', meta: { tags: ['实战演示文档'] }, parentId: null, order: 5, x: 560, y: 620, width: 480, collapsed: false },
    ],
  },
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
    content: '# 电商平台开发项目 PRD\n\n## 项目背景\n\nCircleLight 计划开发一款面向中小企业的电商平台，支持多店铺管理、商品上架、订单处理、支付集成和物流追踪。\n\n## 核心目标\n\n- 3个月内完成 MVP 版本上线\n- 支持日均 10,000 订单处理能力\n- 移动端响应式适配\n- 集成主流支付渠道（微信支付、支付宝、银联）',
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 0,
    x: 40,
    y: 40,
    width: 480,
    collapsed: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'seed-2',
    type: 'text',
    title: '功能模块',
    content: '## 功能模块清单\n\n### 用户系统\n- 用户注册/登录（手机号+验证码、微信授权）\n- 个人中心（订单、地址、收藏、优惠券）\n- 会员等级体系\n\n### 商品系统\n- 商品分类管理（三级分类）\n- SKU 管理（规格、库存、价格）\n- 商品搜索与筛选\n- 商品评价与问答\n\n### 订单系统\n- 购物车（增删改查、批量结算）\n- 订单创建与支付\n- 订单状态流转（待付款→待发货→已发货→已完成）\n- 售后退款/退货流程\n\n### 支付系统\n- 微信支付（JSAPI、Native、H5）\n- 支付宝（手机网站、APP）\n- 银联云闪付\n- 余额支付\n\n### 物流系统\n- 快递公司对接（顺丰、中通、圆通等）\n- 物流轨迹查询\n- 电子面单打印\n\n### 营销系统\n- 优惠券（满减、折扣、免邮）\n- 秒杀活动\n- 拼团功能\n- 积分商城',
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 1,
    x: 40,
    y: 280,
    width: 480,
    collapsed: false,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
  {
    id: 'seed-3',
    type: 'table',
    title: '技术栈选型',
    content: JSON.stringify({
      headers: ['层级', '技术选型', '版本', '说明'],
      rows: [
        ['前端', 'Next.js', '15.x', 'React 框架，支持 SSR/SSG'],
        ['前端', 'Tailwind CSS', '3.x', '原子化 CSS 框架'],
        ['前端', 'Zustand', '5.x', '状态管理'],
        ['后端', 'Node.js', '20 LTS', '运行环境'],
        ['后端', 'Prisma', '5.x', 'ORM 框架'],
        ['数据库', 'PostgreSQL', '16', '主数据库'],
        ['缓存', 'Redis', '7.x', '会话、缓存、队列'],
        ['搜索', 'Elasticsearch', '8.x', '商品搜索'],
        ['消息队列', 'RabbitMQ', '3.x', '异步任务'],
        ['支付', '官方 SDK', '-', '微信、支付宝、银联'],
        ['部署', 'Docker', '-', '容器化部署'],
        ['CI/CD', 'GitHub Actions', '-', '自动化构建'],
      ],
    }),
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 2,
    x: 560,
    y: 40,
    width: 520,
    collapsed: false,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  },
  {
    id: 'seed-4',
    type: 'text',
    title: '团队分工',
    content: '## 项目团队\n\n| 角色 | 姓名 | 职能 | 负责模块 |\n|------|------|------|----------|\n| 产品经理 | 陈明远 | 产品规划、需求分析 | 整体产品方向、PRD 文档 |\n| 前端开发 | 林小薇 | 前端架构、UI 实现 | 用户端 H5、管理后台 |\n| 后端开发 | 张浩然 | 后端架构、API 开发 | 用户系统、订单系统、支付系统 |\n| UI 设计师 | 苏婉清 | 视觉设计、交互设计 | 设计规范、高保真原型 |\n| 测试工程师 | 王志强 | 测试策略、自动化测试 | 功能测试、性能测试、回归测试 |',
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 3,
    x: 560,
    y: 340,
    width: 480,
    collapsed: false,
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
  },
  {
    id: 'seed-5',
    type: 'text',
    title: '开发里程碑',
    content: '## 项目里程碑\n\n### 第一阶段：基础架构（第1-2周）\n- 项目初始化、开发环境搭建\n- 数据库设计、API 规范制定\n- 前端组件库搭建\n\n### 第二阶段：核心功能（第3-6周）\n- 用户系统完整实现\n- 商品系统完整实现\n- 购物车与订单流程\n\n### 第三阶段：支付与物流（第7-9周）\n- 支付渠道对接\n- 物流系统对接\n- 订单状态机完善\n\n### 第四阶段：营销与优化（第10-11周）\n- 优惠券、秒杀、拼团\n- 性能优化、安全加固\n- 测试覆盖与 Bug 修复\n\n### 第五阶段：上线准备（第12周）\n- 生产环境部署\n- 数据迁移\n- 灰度发布',
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 4,
    x: 40,
    y: 680,
    width: 480,
    collapsed: false,
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
  },
  {
    id: 'seed-6',
    type: 'text',
    title: '风险与应对',
    content: '## 风险分析\n\n| 风险 | 影响 | 应对措施 |\n|------|------|----------|\n| 支付接口审核周期长 | 高 | 提前申请，准备备用方案 |\n| 高并发性能瓶颈 | 高 | 引入缓存、消息队列、数据库读写分离 |\n| 第三方物流接口不稳定 | 中 | 多物流商对接，降级策略 |\n| 需求变更频繁 | 中 | 敏捷开发，两周一个迭代 |\n| 团队成员请假/离职 | 低 | 代码审查、文档完善、知识共享 |',
    meta: { tags: ['实战演示文档'] },
    parentId: null,
    order: 5,
    x: 560,
    y: 620,
    width: 480,
    collapsed: false,
    createdAt: 1700000005000,
    updatedAt: 1700000005000,
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

function createPresetPages(): { pages: Page[]; pageBlocks: Record<string, Block[]> } {
  const now = Date.now();
  const pages: Page[] = [];
  const pageBlocks: Record<string, Block[]> = {};

  for (let i = 0; i < PRESET_DOCUMENTS.length; i++) {
    const doc = PRESET_DOCUMENTS[i];
    const pageId = nanoid();
    pages.push({
      id: pageId,
      title: doc.title,
      icon: doc.icon,
      createdAt: now + i,
      updatedAt: now + i,
    });
    pageBlocks[pageId] = getPresetDocumentBlocks(doc.id);
  }

  return { pages, pageBlocks };
}

const presetData = createPresetPages();

export const useBlockStore = create<BlockStore>()(
  persist(
    immer((set, get) => ({
      pages: presetData.pages,
      folders: [],
      groups: [],
      _blockCounter: 0,
      currentPageId: presetData.pages[0]?.id || defaultPage.id,
      pageBlocks: presetData.pageBlocks,
      blocks: presetData.pageBlocks[presetData.pages[0]?.id] || seedBlocks,
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
          if (page) page.title = title;
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
        const id = nanoid();
        set((state) => {
          state.folders.push({ id, name, collapsed: false, createdAt: Date.now() });
        });
        return id;
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

      groupBlocks: (ids) => {
        set((state) => {
          const groupId = nanoid();
          state.groups.push({ id: groupId, name: '分组' });
          ids.forEach((id) => {
            const block = state.blocks.find((b) => b.id === id);
            if (block) block.groupId = groupId;
          });
        });
        get().saveHistory();
      },

      ungroupBlocks: (groupId) => {
        set((state) => {
          state.groups = state.groups.filter((g) => g.id !== groupId);
          state.blocks.forEach((block) => {
            if (block.groupId === groupId) block.groupId = undefined;
          });
        });
        get().saveHistory();
      },

      updateGroupName: (groupId, name) => {
        set((state) => {
          const group = state.groups.find((g) => g.id === groupId);
          if (group) group.name = name;
        });
      },

      addBlock: (type, afterId, position) => {
        const newBlock = createEmptyBlock(type);
        if (position) {
          newBlock.x = position.x;
          newBlock.y = position.y;
        }
        set((state) => {
          if (afterId) {
            const idx = state.blocks.findIndex((b) => b.id === afterId);
            if (idx >= 0) {
              newBlock.order = state.blocks[idx].order + 1;
              newBlock.x = state.blocks[idx].x;
              newBlock.y = state.blocks[idx].y + 60;
            }
          } else {
            newBlock.order = state.blocks.length;
          }
          state.blocks.push(newBlock);
        });
        get().saveHistory();
        return newBlock.id;
      },

      duplicateBlock: (id) => {
        const block = get().blocks.find((b) => b.id === id);
        if (!block) return null;
        const newBlock: Block = {
          ...block,
          id: nanoid(),
          x: block.x + 20,
          y: block.y + 20,
          order: block.order + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => {
          state.blocks.push(newBlock);
        });
        get().saveHistory();
        return newBlock.id;
      },

      updateBlock: (id, updates) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (block) {
            Object.assign(block, updates);
            block.updatedAt = Date.now();
          }
        });
      },

      deleteBlock: (id) => {
        set((state) => {
          state.blocks = state.blocks.filter((b) => b.id !== id);
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        });
        get().saveHistory();
      },

      moveBlock: (activeId, overId) => {
        set((state) => {
          const activeIdx = state.blocks.findIndex((b) => b.id === activeId);
          const overIdx = state.blocks.findIndex((b) => b.id === overId);
          if (activeIdx === -1 || overIdx === -1) return;
          const [moved] = state.blocks.splice(activeIdx, 1);
          state.blocks.splice(overIdx, 0, moved);
          state.blocks.forEach((b, i) => {
            b.order = i;
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
            block.width = width;
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
          if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
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
          const block = state.blocks.find((b) => b.id === fromId);
          if (block) {
            const links = block.meta.links || [];
            if (!links.includes(toId)) {
              block.meta.links = [...links, toId];
            }
          }
          if (!state.blockDependencies[fromId]) {
            state.blockDependencies[fromId] = [];
          }
          if (!state.blockDependencies[fromId].includes(toId)) {
            state.blockDependencies[fromId].push(toId);
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
          if (state.agentLogs.length > 100) {
            state.agentLogs = state.agentLogs.slice(0, 100);
          }
        });
      },

      hydrate: () => {
        set((state) => {
          state._hydrated = true;
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const entry = history[historyIndex - 1];
          set((state) => {
            state.blocks = JSON.parse(JSON.stringify(entry.blocks));
            state.historyIndex = historyIndex - 1;
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const entry = history[historyIndex + 1];
          set((state) => {
            state.blocks = JSON.parse(JSON.stringify(entry.blocks));
            state.historyIndex = historyIndex + 1;
          });
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      saveHistory: () => {
        set((state) => {
          const entry: HistoryEntry = {
            pageId: state.currentPageId,
            blocks: JSON.parse(JSON.stringify(state.blocks)),
            timestamp: Date.now(),
            action: 'manual',
            blockCount: state.blocks.length,
          };
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(entry);
          state.historyIndex++;
          if (state.history.length > 50) {
            state.history = state.history.slice(-50);
            state.historyIndex = state.history.length - 1;
          }
        });
      },

      indentBlock: (id) => {
        set((state) => {
          const idx = state.blocks.findIndex((b) => b.id === id);
          if (idx <= 0) return;
          const prevBlock = state.blocks[idx - 1];
          const block = state.blocks[idx];
          if (block.parentId === prevBlock.id) return;
          block.parentId = prevBlock.id;
          block.updatedAt = Date.now();
        });
        get().saveHistory();
      },

      outdentBlock: (id) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (!block || !block.parentId) return;
          block.parentId = null;
          block.updatedAt = Date.now();
        });
        get().saveHistory();
      },

      getBlockDepth: (id) => getBlockDepthInBlocks(get().blocks, id),

      exportToMarkdown: () => {
        return get().blocks
          .map((block) => {
            switch (block.type) {
              case 'text':
                return block.content;
              case 'todo':
                return `- [${block.meta?.checked ? 'x' : ' '}] ${block.content}`;
              case 'code':
                return '```' + (block.meta?.language || '') + '\n' + block.content + '\n```';
              case 'table':
                try {
                  const data = JSON.parse(block.content);
                  const headers = data.headers?.join(' | ') || '';
                  const separator = data.headers?.map(() => '---').join(' | ') || '';
                  const rows = data.rows?.map((row: string[]) => row.join(' | ')).join('\n') || '';
                  return '| ' + headers + ' |\n| ' + separator + ' |\n| ' + rows + ' |';
                } catch {
                  return block.content;
                }
              case 'quote':
                return block.content
                  .split('\n')
                  .map((line) => `> ${line}`)
                  .join('\n');
              default:
                return block.content;
            }
          })
          .join('\n\n');
      },

      exportToHtml: () => {
        return get().blocks
          .map((block) => {
            switch (block.type) {
              case 'text':
                return `<div class="prose">${block.content}</div>`;
              case 'todo':
                return `<div class="todo"><input type="checkbox" ${block.meta?.checked ? 'checked' : ''} /> ${block.content}</div>`;
              case 'code':
                return `<pre><code class="language-${block.meta?.language || 'text'}">${block.content}</code></pre>`;
              case 'table':
                try {
                  const data = JSON.parse(block.content);
                  const headers = data.headers?.map((h: string) => `<th>${h}</th>`).join('') || '';
                  const rows = data.rows?.map((row: string[]) => `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`).join('') || '';
                  return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
                } catch {
                  return `<div>${block.content}</div>`;
                }
              default:
                return `<div>${block.content}</div>`;
            }
          })
          .join('\n');
      },

      importFromMarkdown: (markdown) => {
        const lines = markdown.split('\n');
        const newBlocks: Block[] = [];
        let currentContent = '';
        let currentType: BlockType = 'text';

        const flushBlock = () => {
          if (currentContent.trim()) {
            const block = createEmptyBlock(currentType);
            block.content = currentContent.trim();
            if (currentType === 'code') {
              const firstLine = currentContent.split('\n')[0];
              block.meta.language = firstLine || 'text';
              block.content = currentContent.split('\n').slice(1).join('\n');
            }
            newBlocks.push(block);
          }
          currentContent = '';
        };

        for (const line of lines) {
          if (line.startsWith('```')) {
            if (currentType === 'code') {
              flushBlock();
              currentType = 'text';
            } else {
              flushBlock();
              currentType = 'code';
              currentContent = line.slice(3).trim() + '\n';
            }
          } else if (line.startsWith('- [') || line.startsWith('* [')) {
            if (currentType !== 'todo') {
              flushBlock();
              currentType = 'todo';
            }
            const checked = line.includes('[x]');
            const content = line.replace(/^[-*]\s*\[[x ]\]\s*/, '');
            const block = createEmptyBlock('todo');
            block.content = content;
            block.meta.checked = checked;
            newBlocks.push(block);
            currentContent = '';
          } else {
            if (currentType === 'todo') {
              flushBlock();
              currentType = 'text';
            }
            currentContent += line + '\n';
          }
        }

        flushBlock();

        set((state) => {
          state.blocks = newBlocks;
          state.selectedIds = [];
        });
        get().saveHistory();
      },

      importFromCsv: (csv) => {
        const lines = csv.split('\n').filter((l) => l.trim());
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cells: string[] = [];
          let cell = '';
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cells.push(cell.trim());
              cell = '';
            } else {
              cell += char;
            }
          }
          cells.push(cell.trim());
          return cells;
        });

        const block = createEmptyBlock('table');
        block.content = JSON.stringify({ headers, rows });
        set((state) => {
          state.blocks.push(block);
        });
        get().saveHistory();
      },

      importImage: (base64, caption) => {
        const block = createEmptyBlock('media');
        block.content = base64;
        block.meta.caption = caption;
        set((state) => {
          state.blocks.push(block);
        });
        get().saveHistory();
      },

      syncToServer: async () => {
        const { currentPageId, blocks } = get();
        try {
          await fetch(`/api/pages/${currentPageId}/blocks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
          });
        } catch (err) {
          console.error('Sync failed:', err);
        }
      },

      loadFromServer: async (pageId) => {
        try {
          const res = await fetch(`/api/pages/${pageId}/blocks`);
          if (res.ok) {
            const data = await res.json();
            set((state) => {
              state.pageBlocks[pageId] = data.blocks || [];
              if (state.currentPageId === pageId) {
                state.blocks = data.blocks || [];
              }
            });
          }
        } catch (err) {
          console.error('Load failed:', err);
        }
      },

      syncPages: async () => {
        const { pages } = get();
        try {
          await fetch('/api/pages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pages }),
          });
        } catch (err) {
          console.error('Pages sync failed:', err);
        }
      },

      blockDependencies: {},
      getDependents: (blockId) => {
        const deps = get().blockDependencies;
        return Object.entries(deps)
          .filter(([, targets]) => targets.includes(blockId))
          .map(([source]) => source);
      },
    })),
    {
      name: 'block-os-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pages: state.pages,
        folders: state.folders,
        groups: state.groups,
        currentPageId: state.currentPageId,
        pageBlocks: state.pageBlocks,
        agentRules: state.agentRules,
        agentEnabled: state.agentEnabled,
        blockDependencies: state.blockDependencies,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
        }
      },
    }
  )
);
