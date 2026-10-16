import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Block, BlockType, BlockMeta, AgentRule, AgentLog, BlockTemplate } from '@/types/block';
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
  resizeBlock: (id: string, width: number, height?: number) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  createLink: (fromId: string, toId: string) => void;
  removeLink: (fromId: string, toId: string) => void;
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
  exportToJson: () => string;
  exportToCsvTasks: (additionalTasks?: Array<{ id: string; title: string; status?: string; priority?: string; assigneeId?: string; dod?: string }>) => string;

  importFromMarkdown: (markdown: string) => void;
  importFromCsv: (csv: string) => void;
  importFromJson: (jsonStr: string, mode?: 'replace' | 'append') => { success: boolean; count: number; error?: string };
  importImage: (base64: string, caption?: string) => void;

  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  lastSavedAt: number | null;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  retrySave: () => Promise<void>;
  syncToServer: () => Promise<void>;
  loadFromServer: (pageId: string) => Promise<void>;
  syncPages: () => Promise<void>;
  reset: () => void;

  blockDependencies: Record<string, string[]>;
  getDependents: (blockId: string) => string[];
}

export function createEmptyBlock(type: BlockType): Block {
  const now = Date.now();
  let defaultWidth = 480;
  let defaultHeight: number | undefined = undefined;
  let defaultTitle = '';
  let defaultContent = '';
  const meta: BlockMeta = {
    checked: type === 'todo' ? false : undefined,
    language: type === 'code' ? 'typescript' : undefined,
  };

  if (type === 'callout') {
    defaultTitle = '高亮提示';
    defaultContent = '在此记录重要交付前提、注意事项或核心风险...';
    meta.calloutTheme = 'info';
    meta.calloutIcon = '💡';
    defaultWidth = 520;
    defaultHeight = 130;
  } else if (type === 'countdown') {
    defaultTitle = '冲刺发布倒计时';
    defaultContent = '本期版本迭代发布节点';
    const future = new Date(now + 7 * 24 * 3600 * 1000);
    meta.targetDate = future.toISOString().split('T')[0];
    meta.targetTime = '18:00';
    defaultWidth = 460;
    defaultHeight = 180;
  } else if (type === 'bookmark') {
    defaultTitle = '外部文档与链接卡片';
    defaultContent = 'https://github.com';
    meta.bookmarkUrl = 'https://github.com';
    meta.bookmarkTitle = 'GitHub 项目仓库';
    meta.bookmarkDesc = '团队代码仓库、PR 协同与持续集成';
    meta.bookmarkFavicon = 'https://github.githubassets.com/favicons/favicon.svg';
    defaultWidth = 460;
    defaultHeight = 140;
  } else if (type === 'mermaid') {
    defaultTitle = '系统架构流程图';
    defaultContent = `graph TD\n  Client[客户端 (Web / Mobile)] --> Gateway[API 网关 / 鉴权]\n  Gateway --> Engine[BlockOS 规则引擎]\n  Engine --> AI[智谱 GLM 4.7 Flash 大模型]\n  Engine --> DB[(PostgreSQL / SQLite 混合持久化)]`;
    defaultWidth = 560;
    defaultHeight = 320;
  }

  return {
    id: nanoid(),
    type,
    title: defaultTitle,
    content: defaultContent,
    meta,
    parentId: null,
    order: 0,
    x: 0,
    y: 0,
    width: defaultWidth,
    ...(defaultHeight ? { height: defaultHeight } : {}),
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

export function estimateBlockHeight(block: Block): number {
  if (block.collapsed) return 36;
  const contentLen = block.content ? block.content.length : 0;
  if (block.type === 'todo') return 72;
  if (block.type === 'callout') return 130;
  if (block.type === 'countdown') return 180;
  if (block.type === 'bookmark') return 140;
  if (block.type === 'mermaid') return 320;
  if (block.type === 'code') return Math.max(120, Math.min(320, 80 + (block.content.split('\n').length * 20)));
  if (block.type === 'table') return 240;
  if (block.type === 'media') return 240;
  const lines = block.content ? block.content.split('\n').length : 1;
  const lineEstimate = lines * 22;
  const charEstimate = Math.ceil(contentLen / 35) * 20;
  return Math.max(88, Math.min(480, 52 + Math.max(lineEstimate, charEstimate)));
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'onboarding-guide',
    name: '👋 新手快速入门指南',
    icon: '👋',
    description: '3 分钟掌握 BlockOS：无界画布、Agent 规则自驱动、代码沙箱与单 Block 专属 AI',
    blocks: PRESET_DOCUMENTS[0]?.blocks || [],
  },
  {
    id: 'template-prd',
    name: '📋 产品需求文档（PRD）',
    icon: '📋',
    description: 'CircleLight 电商平台完整产品需求与验收标准样板',
    blocks: PRESET_DOCUMENTS[1]?.blocks || [],
  },
  {
    id: 'template-tech',
    name: '💻 技术方案文档',
    icon: '💻',
    description: '微服务架构、API 接口及数据库设计样板',
    blocks: PRESET_DOCUMENTS[2]?.blocks || [],
  },
  {
    id: 'template-ui',
    name: '🎨 UI 设计规范',
    icon: '🎨',
    description: '色彩系统、组件规范与页面响应式布局样板',
    blocks: PRESET_DOCUMENTS[3]?.blocks || [],
  },
  {
    id: 'template-data',
    name: '📊 数据分析报告',
    icon: '📊',
    description: '电商经营数据概览、转化漏斗与用户分层洞察样板',
    blocks: PRESET_DOCUMENTS[4]?.blocks || [],
  },
  {
    id: 'template-test',
    name: '🧪 测试计划与用例',
    icon: '🧪',
    description: '敏捷测试策略、核心功能测试用例与里程碑样板',
    blocks: PRESET_DOCUMENTS[5]?.blocks || [],
  },
  {
    id: 'meeting',
    name: '📝 会议纪要',
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
    name: '📊 项目计划',
    icon: '📊',
    description: '项目目标、里程碑、任务分配和进度追踪',
    blocks: [
      { type: 'text', title: '项目概述', content: '# 项目概述\n\n目标：\n范围：\n时间线：', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 420, collapsed: false },
      { type: 'table', title: '任务分配', content: JSON.stringify({ columns: ['任务', '负责人', '状态', '截止日期'], rows: [['', '', '未开始', '']], columnTypes: [{ name: '任务', type: 'text' }, { name: '负责人', type: 'text' }, { name: '状态', type: 'select', options: ['未开始', '进行中', '已完成'] }, { name: '截止日期', type: 'date' }] }), meta: {}, parentId: null, order: 1, x: 40, y: 220, width: 480, collapsed: false },
      { type: 'todo', title: '本周任务', content: '制定项目计划', meta: { checked: false }, parentId: null, order: 2, x: 40, y: 420, width: 400, collapsed: false },
    ],
  },
  {
    id: 'blank',
    name: '📄 空白页面',
    icon: '📄',
    description: '从一张完全空白的画布开始自由编排',
    blocks: [],
  },
];

const defaultAgentRules: AgentRule[] = [
  {
    id: 'todo-complete',
    name: '需求验收与交付自动化',
    enabled: true,
    triggerType: 'blockUpdate',
    triggerCondition: "block.type === 'todo' && !prevBlock.meta?.checked && block.meta?.checked",
    actions: [
      {
        type: 'createBlock',
        config: {
          type: 'text',
          contentTemplate: '### 📋 迭代发布报告（Agent 自动化归档）\n- **验收状态**：✅ 质量检查通过 · 准予发布上线\n- **执行动作**：Agent 规则引擎自驱动触发\n- **归档时间**：{timestamp}\n- **关联需求**：[P0需求交付] 完成用户中心与鉴权架构验证\n- **协作流转**：状态机已自动流转为「已交付」，变更审计日志已同步广播至团队协同看板。',
          position: 'after',
        },
      },
      {
        type: 'callAI',
        config: {
          prompt: '作为产研交付 Agent，根据已验收交付的功能"[P0需求交付] 完成用户中心与鉴权架构验证"，生成一份专业的【下一步上线保障与测试 Checklist】（包含 3 个具体可执行的待办项，涵盖灰度放量、核心指标监控与应急预案，使用 Markdown 清单格式，语言严谨专业，符合飞书/钉钉企业级协同规范）',
        },
      },
    ],
  },
];

const seedBlocks: Block[] = getPresetDocumentBlocks('doc-guide');

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

  // 默认仅初始化首篇欢迎入门指南文档，其余作为样板库按需实例化
  const guideDoc = PRESET_DOCUMENTS[0];
  const guidePageId = 'doc-guide';
  pages.push({
    id: guidePageId,
    title: guideDoc.title,
    icon: guideDoc.icon,
    createdAt: now,
    updatedAt: now,
  });
  pageBlocks[guidePageId] = getPresetDocumentBlocks(guideDoc.id);

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
      saveStatus: 'idle',
      saveError: null,
      lastSavedAt: null,
      currentUserId: null,

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
          body: JSON.stringify({ id: newPage.id, title: newPage.title, icon: newPage.icon, folderId: newPage.folderId }),
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
          body: JSON.stringify({ id: newPage.id, title: newPage.title, icon: newPage.icon, folderId: newPage.folderId }),
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
          let targetBlocks = state.pageBlocks[id] ? JSON.parse(JSON.stringify(state.pageBlocks[id])) : [];
          if ((id === 'doc-guide' || id.includes('guide')) && targetBlocks.length === 0) {
            targetBlocks = getPresetDocumentBlocks('doc-guide');
            state.pageBlocks[id] = targetBlocks;
          }
          state.blocks = targetBlocks;
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
          if (afterId && !position) {
            const idx = state.blocks.findIndex((b) => b.id === afterId);
            if (idx >= 0) {
              const afterBlock = state.blocks[idx];
              newBlock.order = afterBlock.order + 1;
              newBlock.x = afterBlock.x;
              newBlock.width = afterBlock.width || 520;

              // 智能垂直避让排布：基于估算高度和同列卡片，保证永远不会重叠在相同坐标
              let targetY = afterBlock.y + estimateBlockHeight(afterBlock) + 20;
              const newEstimatedHeight = estimateBlockHeight(newBlock);
              const columnBlocks = state.blocks
                .filter((b) => b.id !== afterBlock.id && Math.abs(b.x - afterBlock.x) < 80)
                .sort((a, b) => a.y - b.y);

              for (const b of columnBlocks) {
                const bHeight = estimateBlockHeight(b);
                const bBottom = b.y + bHeight;
                if (targetY >= b.y - 12 && targetY < bBottom + 16) {
                  targetY = bBottom + 20;
                } else if (b.y >= targetY && b.y < targetY + newEstimatedHeight + 20) {
                  // 下方卡片与新卡片产生交叠，将下方所有卡片顺延下移
                  b.y = targetY + newEstimatedHeight + 24;
                }
              }
              newBlock.y = targetY;
            }
          } else if (!position) {
            newBlock.order = state.blocks.length;
            const lastBlock = state.blocks[state.blocks.length - 1];
            if (lastBlock) {
              newBlock.x = lastBlock.x;
              newBlock.y = lastBlock.y + estimateBlockHeight(lastBlock) + 24;
            } else {
              newBlock.x = 40;
              newBlock.y = 40;
            }
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

      resizeBlock: (id, width, height) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === id);
          if (block) {
            const oldHeight = block.height || 200;
            block.width = width;
            if (height !== undefined) {
              block.height = height;
              // 智能避让与推移：若拉伸高度变大且底部推挤了下方处于同一垂直投影列的 Block，自动将下方 Block 平滑向下推开
              if (height > oldHeight) {
                const blockBottom = block.y + height;
                state.blocks.forEach((other) => {
                  if (other.id !== id && !other.parentId) {
                    const hOverlap = !(other.x + (other.width || 760) < block.x || other.x > block.x + (block.width || 760));
                    if (hOverlap && other.y > block.y && other.y < blockBottom + 50) {
                      other.y = Math.round(blockBottom + 60);
                      other.updatedAt = Date.now();
                    }
                  }
                });
              }
            }
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
        get().saveHistory();
      },

      removeLink: (fromId, toId) => {
        set((state) => {
          const block = state.blocks.find((b) => b.id === fromId);
          if (block && block.meta.links) {
            block.meta.links = block.meta.links.filter((id) => id !== toId);
          }
          if (state.blockDependencies[fromId]) {
            state.blockDependencies[fromId] = state.blockDependencies[fromId].filter((id) => id !== toId);
          }
        });
        get().saveHistory();
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
          const parent = state.blocks.find((b) => b.id === block.parentId);
          block.parentId = null;
          if (parent) {
            block.x = (parent.x || 40) + (parent.width || 480) + 40;
            block.y = parent.y || 40;
          }
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

      exportToJson: () => {
        const state = get();
        const currentPage = state.pages.find((p) => p.id === state.currentPageId);
        const data = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          page: currentPage
            ? {
                id: currentPage.id,
                title: currentPage.title,
                icon: currentPage.icon,
                folderId: currentPage.folderId,
              }
            : null,
          blocks: state.blocks,
          groups: state.groups,
        };
        return JSON.stringify(data, null, 2);
      },

      exportToCsvTasks: (additionalTasks?: Array<{ id: string; title: string; status?: string; priority?: string; assigneeId?: string; dod?: string }>) => {
        const state = get();
        const rows: { id: string; title: string; status: string; priority: string; assignee: string; dod: string }[] = [];

        state.blocks.forEach((b) => {
          if (b.type === 'todo') {
            rows.push({
              id: b.id.slice(0, 8),
              title: (b.content || '').replace(/\r?\n/g, ' '),
              status: b.meta?.checked ? '已完成' : (b.meta?.status === 'pending_review' ? '待验收' : '待办'),
              priority: (b.meta?.priority as string) || '中',
              assignee: (b.meta?.assignee as string) || '未指定',
              dod: (b.meta?.dod as string) || '',
            });
          }
        });

        if (Array.isArray(additionalTasks)) {
          additionalTasks.forEach((t) => {
            if (!rows.some((r) => r.id === t.id)) {
              rows.push({
                id: t.id,
                title: (t.title || '').replace(/\r?\n/g, ' '),
                status: t.status === 'done' ? '已完成' : t.status === 'pending_review' ? '待验收' : t.status === 'in_progress' ? '进行中' : '待办',
                priority: t.priority || 'medium',
                assignee: t.assigneeId || '未分配',
                dod: t.dod || '',
              });
            }
          });
        }

        const headers = ['任务ID', '任务标题', '状态', '优先级', '负责人', '验收标准(DoD)'];
        const csvLines = [headers.join(',')];
        rows.forEach((r) => {
          const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
          csvLines.push([
            escapeCsv(r.id),
            escapeCsv(r.title),
            escapeCsv(r.status),
            escapeCsv(r.priority),
            escapeCsv(r.assignee),
            escapeCsv(r.dod),
          ].join(','));
        });

        return '\ufeff' + csvLines.join('\n');
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
        if (!csv || typeof csv !== 'string') return;
        if (csv.length > 2 * 1024 * 1024) {
          console.warn('CSV 文件过大（超过 2MB 限制）');
          return;
        }
        const lines = csv.split('\n').filter((l) => l.trim());
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map((h) => h.trim());
        const rows = lines.slice(1, 1000).map((line) => {
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
        if (!base64 || typeof base64 !== 'string') return;
        if (base64.length > 7 * 1024 * 1024) {
          console.warn('图片数据过大（超过 5MB 限制）');
          return;
        }
        const block = createEmptyBlock('media');
        block.content = base64;
        block.meta.caption = caption;
        set((state) => {
          state.blocks.push(block);
        });
        get().saveHistory();
      },

      importFromJson: (jsonStr, mode = 'replace') => {
        try {
          if (!jsonStr || typeof jsonStr !== 'string') {
            return { success: false, count: 0, error: 'JSON 内容为空' };
          }
          const parsed = JSON.parse(jsonStr);
          const blocksToLoad: unknown[] = Array.isArray(parsed)
            ? parsed
            : (parsed && typeof parsed === 'object' && 'blocks' in parsed && Array.isArray((parsed as Record<string, unknown>).blocks)
              ? ((parsed as Record<string, unknown>).blocks as unknown[])
              : []);
          if (!Array.isArray(blocksToLoad) || blocksToLoad.length === 0) {
            return { success: false, count: 0, error: 'JSON 中未包含有效的 blocks 数组' };
          }

          const validBlocks = blocksToLoad.filter((b): b is Block => !!b && typeof b === 'object' && 'type' in b);
          if (validBlocks.length === 0) {
            return { success: false, count: 0, error: '未找到符合规范的 Block 对象' };
          }

          const now = Date.now();
          const normalizedBlocks: Block[] = validBlocks.map((b, index) => ({
            ...b,
            id: mode === 'append' ? nanoid() : (b.id || nanoid()),
            title: b.title || '',
            content: typeof b.content === 'string' ? b.content : '',
            meta: b.meta || {},
            order: index,
            createdAt: b.createdAt || now,
            updatedAt: now,
          }));

          set((state) => {
            if (mode === 'append') {
              state.blocks = [...state.blocks, ...normalizedBlocks];
            } else {
              state.blocks = normalizedBlocks;
              state.selectedIds = [];
            }
          });

          get().saveHistory();
          return { success: true, count: normalizedBlocks.length };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'JSON 解析失败';
          console.error('importFromJson error:', e);
          return { success: false, count: 0, error: msg };
        }
      },

      setCurrentUserId: (userId) => {
        const prevId = get().currentUserId;
        if (prevId === userId) return;
        set((state) => {
          state.currentUserId = userId;
        });
        if (typeof window !== 'undefined' && userId) {
          try {
            const userStoreKey = `block-os-storage-${userId}`;
            const cached = localStorage.getItem(userStoreKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed?.state?.pages && Array.isArray(parsed.state.pages) && parsed.state.pages.length > 0) {
                set((state) => {
                  state.pages = parsed.state.pages || [];
                  state.folders = parsed.state.folders || [];
                  state.groups = parsed.state.groups || [];
                  state.currentPageId = parsed.state.currentPageId || state.currentPageId;
                  state.pageBlocks = parsed.state.pageBlocks || {};
                  state.blocks = parsed.state.pageBlocks?.[state.currentPageId] || [];
                });
                return;
              }
            }
            // 新账号首次登录且本地无对应命名空间缓存时，重置为该用户的干净官方指南，杜绝继承上一个账号的脏页面
            const { pages, pageBlocks } = createPresetPages();
            const firstPage = pages[0];
            const guidePageId = firstPage ? firstPage.id : 'doc-guide';
            set((state) => {
              state.pages = pages;
              state.folders = [];
              state.groups = [];
              state.currentPageId = guidePageId;
              state.pageBlocks = pageBlocks;
              state.blocks = pageBlocks[guidePageId] || [];
              state.selectedIds = [];
            });
          } catch (e) {
            console.warn('Failed to load user-isolated storage:', e);
          }
        }
      },

      syncToServer: async () => {
        const { currentPageId, blocks, currentUserId } = get();
        if (!currentPageId) return;

        set((state) => {
          state.saveStatus = 'saving';
          state.saveError = null;
        });

        try {
          const res = await fetch(`/api/pages/${currentPageId}/blocks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `保存失败 HTTP ${res.status}`);
          }

          set((state) => {
            state.saveStatus = 'saved';
            state.lastSavedAt = Date.now();
            state.saveError = null;
          });

          // 同步成功后清理离线队列
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('block-os-offline-pending');
            } catch {}
          }

          // 用户隔离本地镜像持久化
          if (typeof window !== 'undefined' && currentUserId) {
            try {
              localStorage.setItem(
                `block-os-storage-${currentUserId}`,
                JSON.stringify({
                  state: {
                    pages: get().pages,
                    folders: get().folders,
                    groups: get().groups,
                    currentPageId,
                    pageBlocks: get().pageBlocks,
                  },
                })
              );
            } catch {
              // Ignore localStorage quota errors
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Sync failed:', msg);
          set((state) => {
            state.saveStatus = 'error';
            state.saveError = msg;
          });

          // 优雅降级：网络故障或服务端异常时，将待同步数据暂存至离线队列
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                'block-os-offline-pending',
                JSON.stringify({
                  pageId: currentPageId,
                  blocks: get().blocks,
                  savedAt: Date.now(),
                })
              );
            } catch {}
          }
        }
      },

      retrySave: async () => {
        await get().syncToServer();
      },

      loadFromServer: async (pageId) => {
        try {
          const res = await fetch(`/api/pages/${pageId}/blocks`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.blocks) && data.blocks.length > 0) {
              set((state) => {
                state.pageBlocks[pageId] = data.blocks;
                if (state.currentPageId === pageId) {
                  state.blocks = data.blocks;
                }
              });
            } else if (Array.isArray(data.blocks) && data.blocks.length === 0) {
              // 关键防御：如果服务端返回 0 个 block，但本地当前页面已有 block（或官方指南），
              // 绝不可用空数组抹去本地数据！
              const currentLocal = get().pageBlocks[pageId] || (get().currentPageId === pageId ? get().blocks : []);
              if (currentLocal && currentLocal.length > 0) {
                await get().syncToServer();
              } else if (pageId === 'doc-guide' || pageId.includes('guide')) {
                const guideBlocks = getPresetDocumentBlocks('doc-guide');
                set((state) => {
                  state.pageBlocks[pageId] = guideBlocks;
                  if (state.currentPageId === pageId) {
                    state.blocks = guideBlocks;
                  }
                });
                await get().syncToServer();
              }
            }
          }
        } catch (err) {
          console.error('Load failed:', err);
        }
      },

      syncPages: async () => {
        const { pages, folders } = get();
        try {
          const res = await fetch('/api/pages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // Directory sync must not overwrite an outline edited on another device.
            body: JSON.stringify({ pages: pages.map((page) => ({ id: page.id, title: page.title, icon: page.icon, folderId: page.folderId ?? null, kind: page.kind })), folders }),
          });
          if (!res.ok) {
            if (res.status === 401) {
              // 访客/离线本地模式，静默降级为本地持久化
              return;
            }
            console.warn('Pages sync notice HTTP', res.status);
            return;
          }
          const index = await fetch('/api/pages');
          if (index.ok) {
            const data = await index.json();
            if (Array.isArray(data.pages)) {
              set((state) => {
                state.pages = data.pages;
                if (Array.isArray(data.folders)) state.folders = data.folders;
                if (!state.pages.some((page) => page.id === state.currentPageId)) {
                  state.currentPageId = state.pages[0]?.id || '';
                  state.blocks = state.pageBlocks[state.currentPageId] || [];
                }
              });
            }
          }
        } catch (err) {
          // 网络断开或不可用时静默降级本地
        }
      },

      reset: () => {
        const { pages, pageBlocks } = createPresetPages();
        const firstPage = pages[0];
        const guidePageId = firstPage ? firstPage.id : 'doc-guide';
        set((state) => {
          state.pages = pages;
          state.folders = [];
          state.groups = [];
          state.currentPageId = guidePageId;
          state.pageBlocks = pageBlocks;
          state.blocks = pageBlocks[guidePageId] || [];
          state.selectedIds = [];
          state.currentUserId = null;
          state.history = [];
          state.historyIndex = -1;
          state.saveStatus = 'idle';
          state.saveError = null;
        });
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
        currentUserId: state.currentUserId,
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
