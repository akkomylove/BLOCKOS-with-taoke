# BlockOS 技术架构文档

## 1. 架构设计

```mermaid
graph TD
    subgraph Browser
        A[React App] --> B[Block Editor]
        B --> C[Block Components]
        C --> D[TextBlock]
        C --> E[TodoBlock]
        C --> F[ListBlock]
        C --> G[CodeBlock]
        C --> H[TableBlock]
        B --> I[Drag & Drop Layer]
        B --> J[Selection Manager]
        B --> K[AI Action Menu]
        B --> L[Relation View]
        B --> M[Agent Panel]
        A --> N[Zustand Store]
    end
    
    subgraph API
        O[Next.js API Routes] --> P[/api/ai/block-action]
        O --> Q[/api/ai/command]
        O --> R[/api/ai/summary]
    end
    
    subgraph External
        S[LLM API] 
    end
    
    N --> O
    P --> S
    Q --> S
    R --> S
    
    subgraph Storage
        T[localStorage]
    end
    
    N --> T
```

## 2. 技术描述

- **框架**: Next.js 14 (App Router)
- **前端**: React 18 + TypeScript + Tailwind CSS
- **状态管理**: Zustand + immer
- **拖拽**: @dnd-kit/core + @dnd-kit/sortable
- **AI SDK**: Vercel AI SDK
- **动画**: framer-motion
- **图标**: lucide-react
- **持久化**: localStorage
- **部署**: Vercel

## 3. 路由定义

| 路由 | 用途 |
|-----|------|
| / | 主编辑器页面 |
| /api/ai/block-action | 单 Block AI 动作 |
| /api/ai/command | AI 命令模式 |
| /api/ai/summary | 跨 Block 总结 |

## 4. API 定义

### 4.1 /api/ai/block-action

**Request:**
```typescript
interface BlockActionRequest {
  blockId: string;
  blockType: BlockType;
  content: string;
  action: string; // 'summarize' | 'rewrite' | 'expand' | 'breakdown' | 'mindmap' | 'insight'
  context?: string;
}
```

**Response:**
```typescript
interface BlockActionResponse {
  result: string;
  action: string;
}
```

### 4.2 /api/ai/command

**Request:**
```typescript
interface CommandRequest {
  command: string;
  blocks: Block[];
}
```

**Response:**
```typescript
interface CommandResponse {
  operations: Operation[];
}

interface Operation {
  action: 'createBlock' | 'updateBlock' | 'deleteBlock' | 'highlightBlocks';
  target?: string;
  query?: string;
  update?: Partial<Block>;
  position?: { afterId?: string; beforeId?: string };
}
```

### 4.3 /api/ai/summary

**Request:**
```typescript
interface SummaryRequest {
  blockIds: string[];
  blocks: Block[];
}
```

**Response:**
```typescript
interface SummaryResponse {
  summary: string;
}
```

## 5. 数据模型

### 5.1 Block 接口

```typescript
interface Block {
  id: string;
  type: 'text' | 'todo' | 'list' | 'code' | 'table';
  content: string;
  meta: {
    aiContext?: string;
    tags?: string[];
    links?: string[];
    highlight?: string;
    checked?: boolean; // for todo
    language?: string; // for code
    listType?: 'ordered' | 'unordered'; // for list
  };
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}
```

### 5.2 Store 结构

```typescript
interface BlockStore {
  blocks: Block[];
  selectedIds: string[];
  agentRules: AgentRule[];
  agentLogs: AgentLog[];
  
  // Actions
  addBlock: (type: BlockType, afterId?: string) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, newOrder: number) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  createLink: (fromId: string, toId: string) => void;
}
```

### 5.3 Agent 规则

```typescript
interface AgentRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'blockUpdate';
    condition: (block: Block, prevBlock: Block) => boolean;
  };
  actions: AgentAction[];
}

interface AgentLog {
  id: string;
  timestamp: number;
  ruleId: string;
  blockId: string;
  result: string;
}
```

## 6. 组件架构

### 6.1 组件层次

```
App
├── Toolbar
│   ├── AgentToggle
│   └── LogPanel
├── BlockEditor
│   ├── BlockList
│   │   ├── SortableBlock
│   │   │   ├── DragHandle
│   │   │   ├── BlockRenderer
│   │   │   │   ├── TextBlock
│   │   │   │   ├── TodoBlock
│   │   │   │   ├── ListBlock
│   │   │   │   ├── CodeBlock
│   │   │   │   └── TableBlock
│   │   │   └── AIActionButton
│   │   └── SelectionOverlay
│   ├── CommandMenu (/)
│   ├── AIActionMenu
│   ├── CommandPalette (Cmd+K)
│   ├── RelationDrawer
│   └── AgentLogPanel
└── AIResultCard
```

### 6.2 关键组件职责

| 组件 | 职责 |
|-----|------|
| BlockEditor | 主容器，管理拖拽上下文和选择状态 |
| BlockList | 渲染 Block 列表，处理排序逻辑 |
| SortableBlock | 单个可拖拽 Block 包装器 |
| BlockRenderer | 根据类型分发到具体渲染组件 |
| AIActionButton | Block 悬停时显示的 AI 触发按钮 |
| CommandMenu | `/` 命令菜单 |
| AIActionMenu | AI 动作选择菜单 |
| CommandPalette | Cmd+K 自然语言命令输入 |
| RelationDrawer | 关系视图侧边抽屉 |
| AgentLogPanel | Agent 日志面板 |
| AIResultCard | AI 流式输出结果卡片 |

## 7. 状态管理策略

### 7.1 Zustand Store 设计

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useBlockStore = create(
  immer((set, get) => ({
    blocks: [],
    selectedIds: [],
    agentRules: [],
    agentLogs: [],
    
    addBlock: (type, afterId) => set(state => {
      // 实现 Block 添加逻辑
    }),
    
    updateBlock: (id, updates) => set(state => {
      const block = state.blocks.find(b => b.id === id);
      if (block) {
        Object.assign(block, updates, { updatedAt: Date.now() });
      }
    }),
    
    deleteBlock: (id) => set(state => {
      state.blocks = state.blocks.filter(b => b.id !== id);
    }),
    
    moveBlock: (id, newOrder) => set(state => {
      // 实现排序逻辑
    }),
    
    setSelection: (ids) => set(state => {
      state.selectedIds = ids;
    }),
    
    toggleSelection: (id) => set(state => {
      const index = state.selectedIds.indexOf(id);
      if (index > -1) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(id);
      }
    }),
  }))
);
```

### 7.2 持久化

- 使用 Zustand 的 persist 中间件
- 自动保存到 localStorage
- key: `blockos-storage`

## 8. AI 集成策略

### 8.1 流式输出

- 使用 Vercel AI SDK 的 `streamText`
- 前端使用 `useCompletion` hook
- 结果展示在临时卡片中

### 8.2 Prompt 设计

**单 Block 动作 Prompt:**
```
你是一个智能文档助手。用户有一个 {blockType} 类型的 Block，内容是：
{content}

用户请求的动作是：{action}

请根据 Block 类型和内容，执行相应的操作并返回结果。
```

**命令模式 Prompt:**
```
你是一个文档编辑器助手。用户输入了自然语言指令："{command}"

当前文档包含以下 Block：
{blocks}

请分析用户意图，返回一个操作指令数组，每个指令包含：
- action: 操作类型（createBlock/updateBlock/deleteBlock/highlightBlocks）
- target: 目标 Block ID 或语义查询条件
- update: 更新内容
```

## 9. 性能考虑

- Block 列表使用虚拟滚动（如 Block 数量超过 100）
- AI 请求使用防抖
- 拖拽使用 @dnd-kit 的性能优化选项
- localStorage 序列化使用 JSON，大数据量时考虑分片

## 10. 安全考虑

- AI API 密钥存储在环境变量中
- 前端不暴露 API 密钥
- 用户输入做基本的 XSS 防护
- localStorage 数据量限制处理
