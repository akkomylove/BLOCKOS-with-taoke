import { useBlockStore } from '@/store/blockStore';
import type { BlockType } from '@/types/block';

export interface ActionSuggestion {
  label: string;
  command: string;
}

export interface Operation {
  action: string;
  target?: string;
  content?: string;
  title?: string;
  type?: BlockType;
  update?: Record<string, unknown>;
  childTarget?: string;
  parentTarget?: string;
  sourceTarget?: string;
  targetTarget?: string;
  parent?: { title?: string; content: string; type?: BlockType };
  children?: Array<{ title?: string; content: string; type?: BlockType }>;
}

export interface AgentResponsePayload {
  type?: 'operations' | 'agent_response';
  summary?: string;
  message?: string;
  operations?: Operation[];
  actionSuggestions?: ActionSuggestion[];
  roleLabel?: string;
}

export function unescapeJsonString(str: string): string {
  // If string ends with an unfinished escape like \ or \u, trim it safely
  const cleaned = str.replace(/\\(?:u[0-9a-fA-F]{0,3})?$/, '');
  return cleaned
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function extractStreamingDisplay(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // If wrapped in markdown code fence (```json ... or ``` ...)
  const unwrapped = trimmed.replace(/^```(?:json)?\s*/i, '');

  // If it starts with JSON structure syntax
  if (unwrapped.startsWith('{')) {
    // 1. Check if "message" field has started streaming
    const messageMatch = unwrapped.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (messageMatch) {
      return unescapeJsonString(messageMatch[1]);
    }

    // 2. Check if "summary" field has started streaming
    const summaryMatch = unwrapped.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (summaryMatch) {
      return unescapeJsonString(summaryMatch[1]);
    }

    // 3. If it's an operations type declaration
    if (/"type"\s*:\s*"operations"/i.test(unwrapped)) {
      return '正在分析画布并规划操作...';
    }

    // 4. Still in initial JSON headers
    return '正在思考并组织内容...';
  }

  // Not a JSON object: return the text directly
  return raw;
}

export function isBlockOSSelfIntroQuery(cmd: string): boolean {
  const trimmed = cmd.trim();
  if (!trimmed) return false;

  // 1. 极简关键词或符号精准触发
  if (/^(?:功能|能力|帮助|help|\?|？|自我介绍)$/i.test(trimmed)) {
    return true;
  }

  // 2. 询问身份："你是谁" / "你叫什么"
  if (/^(?:你|助手|agent)\s*(?:是|叫)\s*(?:谁|什么)/i.test(trimmed)) {
    return true;
  }

  // 3. 询问介绍自身体系："介绍一下你的能力" / "介绍一下BlockOS" / "介绍一下你自己"
  if (/(?:介绍|讲讲|说说)(?:一下|下)?\s*(?:你(?:的)?(?:能力|功能|定位)?|自己|blockos|这个(?:系统|软件|画布|工具))/i.test(trimmed)) {
    return true;
  }

  // 如果包含“介绍/讲讲/说说”，但宾语不是自身（例如“你能给我介绍一下莫奈吗”、“介绍一下量子计算”），绝对不属于自我介绍
  if (/(?:介绍|讲讲|说说)/.test(trimmed)) {
    return false;
  }

  const clean = trimmed.replace(/[？?！!。]+$/, '').trim();

  // 4. 询问能力与工作范围："你能做什么" / "你能在此完成什么工作" / "你能在此blockos中完成什么工作"
  if (/(?:你|助手|agent|blockos)?.*能.*(?:完成|做)(?:什么|些什么)?(?:工作|事情|操作|任务)?$/i.test(clean)) {
    return true;
  }

  // 5. 询问具备哪些能力/功能："有什么能力" / "具备什么能力" / "你有什么能力" / "你的功能"
  if (/^(?:你|助手|agent|blockos)?\s*(?:的)?(?:有|具备)?(?:什么|哪些)?(?:能力|功能)$/i.test(clean)) {
    return true;
  }

  return false;
}

export function deriveTopicTitle(raw: string): string {
  if (!raw) return '主题知识卡片';
  const clean = raw
    .replace(/^(?:嗯|请问|请|你能|能否|可以|想知道)?\s*(?:帮我|给我|我)?\s*(?:介绍|说说|讲讲|聊聊|告诉我)?\s*(?:一下|下)?/, '')
    .replace(/[吗呀呢吧？?！!。\s]+$/, '')
    .trim();
  if (!clean) return '主题知识卡片';
  return clean.length > 25 ? clean.substring(0, 25) + '...' : clean;
}

export function getLocalBlockOSCapabilityIntro(): { message: string; actionSuggestions: ActionSuggestion[] } {
  return {
    message: `我是 BlockOS 画布协同操作智能体（Agent）。BlockOS 是一个原子级 Block 知识操作系统与无限白板协同环境（非区块链系统）。

我具备深度感知与操控 BlockOS 画布的真实能力：

1. 🧱 **全模态卡片生成**：支持创建富文本、任务待办、交互式代码沙箱（内置可运行 JS 环境）、多维数据表格、Mermaid 架构流程图、高亮警示卡等 11 种原子 Block；
2. 🌳 **父子层级结构化拆解**：一键将复杂业务需求拆解为「父需求卡片 + 多个子任务卡片」的树状层级，支持随时拖拽嵌套或独立移出；
3. 🔗 **拓扑连线与依赖治理**：在需求、架构方案与测试用例之间建立可视化连线与上下游依赖关系；
4. 🔍 **全画布检索与质量审计**：一键高亮关键风险项、筛选未完成待办，全盘批量清理或重构排布；
5. 💻 **代码沙箱运行验证**：直接在画布中编写代码并即时运行调试查看控制台输出。

你可以直接输入操作指令，或点击下方推荐操作快速体验：`,
    actionSuggestions: [
      { label: '🚀 生成需求与子任务树', command: '创建1个核心功能需求Block，并创建3个开发子任务' },
      { label: '💻 创建快速排序代码沙箱', command: '创建一个包含快速排序算法的代码沙箱Block' },
      { label: '🔀 创建系统架构流程图', command: '创建微服务系统架构 Mermaid 流程图' },
      { label: '📊 创建团队版本规划表格', command: '创建团队版本迭代数据表格' },
      { label: '💡 创建高亮风险警示卡', command: '创建一个高亮警示Block，注明交付前核心性能指标要求' },
      { label: '🔍 高亮未完成待办卡片', command: '高亮所有待办' },
    ],
  };
}

const OPERATION_ACTIONS = new Set(['createBlock', 'updateBlock', 'deleteBlock', 'highlightBlocks', 'createLink', 'setParent', 'outdentBlock', 'createSubBlock', 'batchCreateHierarchy', 'deleteAllBlocks', 'clearAllContent']);
const BLOCK_TYPES = new Set<BlockType>(['text', 'todo', 'code', 'table', 'media', 'quote', 'toggle', 'divider', 'whiteboard', 'mindmap', 'math', 'callout', 'countdown', 'bookmark', 'mermaid']);

function validateCanvasOperations(operations: Operation[]) {
  const invalid = () => { throw new Error('AI 操作格式异常，本次未执行画布操作，请重试'); };
  const validateCard = (card: { type?: BlockType; title?: string; content?: string }) => {
    if (!card || typeof card !== 'object' || Array.isArray(card)) invalid();
    if (card.type !== undefined && !BLOCK_TYPES.has(card.type)) invalid();
    if (card.title !== undefined && typeof card.title !== 'string') invalid();
    if (card.content !== undefined && typeof card.content !== 'string') invalid();
  };
  if (operations.length > 30) invalid();
  for (const operation of operations) {
    if (!operation || typeof operation !== 'object' || !OPERATION_ACTIONS.has(operation.action)) invalid();
    validateCard(operation);
    for (const key of ['target', 'childTarget', 'parentTarget', 'sourceTarget', 'targetTarget'] as const) {
      if (operation[key] !== undefined && typeof operation[key] !== 'string') invalid();
    }
    if (operation.update !== undefined) {
      if (!operation.update || typeof operation.update !== 'object' || Array.isArray(operation.update)) invalid();
      for (const key of ['title', 'content']) {
        if (operation.update[key] !== undefined && typeof operation.update[key] !== 'string') invalid();
      }
    }
    if (operation.parent !== undefined) validateCard(operation.parent);
    if (operation.children !== undefined) {
      if (!Array.isArray(operation.children) || operation.children.length > 20) invalid();
      operation.children.forEach(validateCard);
    }
  }
}

export function executeCanvasOperations(operations: Operation[]): string[] {
  // Validate the entire batch before applying its first mutation.
  validateCanvasOperations(operations);
  const { addBlock, updateBlock, deleteBlock, outdentBlock, createLink } = useBlockStore.getState();
  const ops: string[] = [];
  const findBlock = (target?: string) => {
    if (!target) return undefined;
    const blocks = useBlockStore.getState().blocks;
    const exact = blocks.find(block => block.id === target);
    if (exact) return exact;
    const lower = target.toLowerCase();
    return blocks.find(block => block.title?.toLowerCase().includes(lower) || block.content.toLowerCase().includes(lower));
  };
    operations.slice(0, 30).forEach((op) => {
      const blocks = useBlockStore.getState().blocks;
      switch (op.action) {
        case 'deleteAllBlocks': {
          const allIds = blocks.map((b) => b.id);
          allIds.forEach((id) => deleteBlock(id));
          ops.push(`已清空画布（删除了 ${allIds.length} 个 Block）`);
          break;
        }
        case 'deleteBlock': {
          const blockToDelete = findBlock(op.target);
          if (blockToDelete) {
            deleteBlock(blockToDelete.id);
            ops.push(`已删除 Block: ${blockToDelete.title || blockToDelete.content.substring(0, 20)}`);
          }
          break;
        }
        case 'updateBlock': {
          const targetBlock = findBlock(op.target);
          if (targetBlock && op.update) {
            const update = {
              ...(typeof op.update.title === 'string' ? { title: op.update.title } : {}),
              ...(typeof op.update.content === 'string' ? { content: op.update.content } : {}),
            };
            if (!Object.keys(update).length) break;
            updateBlock(targetBlock.id, update);
            ops.push(`已更新 Block: ${targetBlock.title || targetBlock.content.substring(0, 20)}`);
          }
          break;
        }
        case 'highlightBlocks': {
          if (typeof op.target !== 'string' || !op.target.trim()) break;
          let highlighted = 0;
          blocks.forEach((b) => {
            const match =
              (b.content && b.content.includes(op.target || '')) ||
              (b.title && b.title.includes(op.target || '')) ||
              (op.target === '待办' && b.type === 'todo');
            if (match) {
              updateBlock(b.id, { meta: { ...b.meta, highlight: 'red' } });
              highlighted++;
            }
          });
          ops.push(highlighted ? `已高亮 ${highlighted} 张包含「${op.target}」的卡片` : `没有找到包含「${op.target}」的卡片`);
          break;
        }
        case 'createBlock': {
          const parent = op.parentTarget ? findBlock(op.parentTarget) : undefined;
          const blockType = op.type || 'text';
          const newX = parent ? (parent.x || 40) + (parent.width || 420) + 40 : undefined;
          const newY = parent ? parent.y || 40 : undefined;
          const newBlockId = addBlock(blockType, undefined, newX !== undefined && newY !== undefined ? { x: newX, y: newY } : undefined);

          let initialContent = op.content || '';
          let initialTitle = op.title || '';

          if (blockType === 'mermaid' && !initialContent) {
            initialTitle = initialTitle || '系统架构流程图';
            initialContent = `graph TD\n  Client["客户端 (Web / 移动端)"] --> Gateway["API 网关 / 鉴权"]\n  Gateway --> Core["BlockOS 核心规则引擎"]\n  Core --> AI["AI 大模型调度 Agent"]\n  Core --> DB[("PostgreSQL 混合持久化")]`;
          } else if (blockType === 'code' && !initialContent) {
            initialTitle = initialTitle || '交互式代码沙箱';
            initialContent = `// 快速排序算法 (JavaScript)\nfunction quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[arr.length - 1];\n  const left = [];\n  const right = [];\n  for (let i = 0; i < arr.length - 1; i++) {\n    if (arr[i] < pivot) left.push(arr[i]);\n    else right.push(arr[i]);\n  }\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}\n\nconst test = [64, 34, 25, 12, 22, 11, 90];\nconsole.log("排序输入:", test);\nconsole.log("排序输出:", quickSort(test));`;
          }

          updateBlock(newBlockId, {
            title: initialTitle,
            content: initialContent,
            parentId: parent?.id || null,
          });
          ops.push(parent ? `已在「${parent.title || parent.id}」下创建子 Block` : `已创建 ${blockType} Block「${initialTitle || '新卡片'}」`);
          break;
        }
        case 'setParent': {
          const child = findBlock(op.childTarget || op.target);
          const parent = findBlock(op.parentTarget);
          let ancestor = parent;
          const visited = new Set<string>();
          while (ancestor && ancestor.id !== child?.id && !visited.has(ancestor.id)) {
            visited.add(ancestor.id);
            ancestor = ancestor.parentId ? blocks.find(block => block.id === ancestor?.parentId) : undefined;
          }
          if (ancestor || (child && parent && child.id === parent.id)) {
            ops.push('无法建立循环的父子关系');
          } else if (child && parent) {
            const newX = (parent.x || 40) + (parent.width || 420) + 40;
            const newY = parent.y || 40;
            updateBlock(child.id, { parentId: parent.id, x: newX, y: newY });
            ops.push(`已将 Block「${child.title || child.id}」设为「${parent.title || parent.id}」的子 Block`);
          } else if (!child) {
            ops.push(`未找到子 Block: ${op.childTarget || op.target}`);
          } else if (!parent) {
            ops.push(`未找到父 Block: ${op.parentTarget}`);
          }
          break;
        }
        case 'outdentBlock': {
          const block = findBlock(op.target);
          if (block) {
            outdentBlock(block.id);
            ops.push(`已将 Block「${block.title || block.id}」移出子 Block`);
          }
          break;
        }
        case 'createSubBlock': {
          const parent = findBlock(op.parentTarget);
          if (parent) {
            const newX = (parent.x || 40) + (parent.width || 420) + 40;
            const newY = parent.y || 40;
            const newId = addBlock(op.type || 'text', undefined, { x: newX, y: newY });
            updateBlock(newId, {
              title: op.title || '',
              content: op.content || '',
              parentId: parent.id,
            });
            ops.push(`已为「${parent.title || parent.id}」创建子 Block`);
          } else {
            ops.push(`未找到父 Block: ${op.parentTarget}`);
          }
          break;
        }
        case 'batchCreateHierarchy': {
          const parentX = 40;
          const parentY = Math.max(...blocks.map((b) => b.y || 40), 0) + 260;
          const parentId = addBlock(op.parent?.type || 'text', undefined, { x: parentX, y: parentY });
          updateBlock(parentId, {
            title: op.parent?.title || '核心需求与业务目标',
            content: op.parent?.content || '通过内置 AI 智能调度自动生成的父级结构化 Block',
          });

          const children = (op.children || []).slice(0, 20);
          children.forEach((c, idx) => {
            const childX = parentX + 460;
            const childY = parentY + idx * 160;
            const childId = addBlock(c.type || 'todo', undefined, { x: childX, y: childY });
            updateBlock(childId, {
              title: c.title || `子项 ${idx + 1}`,
              content: c.content || `自动化分解子任务 ${idx + 1}`,
              parentId,
            });
          });
          ops.push(`已创建 1 个父 Block 与 ${children.length} 个子 Block 并完成层级挂载`);
          break;
        }
        case 'createLink': {
          const src = findBlock(op.sourceTarget);
          const tgt = findBlock(op.targetTarget);
          if (src && tgt && src.id !== tgt.id) {
            createLink(src.id, tgt.id);
            ops.push(`已在「${src.title || src.id}」与「${tgt.title || tgt.id}」之间建立拓扑链接`);
          }
          break;
        }
        case 'clearAllContent':
          blocks.forEach((b) => {
            updateBlock(b.id, { content: '' });
          });
          ops.push('已清空所有 Block 内容');
          break;
      }
    });


  return ops;
}

export function saveAssistantReply(content: string, prompt: string): string {
  const { blocks, addBlock, updateBlock } = useBlockStore.getState();
  let type: BlockType = 'text';
  let cleanContent = content;
  if (/^(?:graph|flowchart)\s+(TD|LR|TB)|sequenceDiagram|classDiagram/m.test(content)) type = 'mermaid';
  else if (/^```(?:javascript|typescript|js|ts)?\n[\s\S]*\n```$/.test(content.trim())) {
    type = 'code';
    cleanContent = content.trim().replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
  } else if (/^- \[[ x]\]/m.test(content)) type = 'todo';
  if (type === 'mermaid') cleanContent = content.trim().replace(/^```(?:mermaid)?\s*\n/i, '').replace(/\n```$/, '');
  const bottom = blocks.reduce((max, block) => Math.max(max, (block.y || 40) + (block.height || 260)), 0);
  const id = addBlock(type, undefined, { x: 40, y: bottom + 40 });
  updateBlock(id, { title: deriveTopicTitle(prompt), content: cleanContent });
  return id;
}
