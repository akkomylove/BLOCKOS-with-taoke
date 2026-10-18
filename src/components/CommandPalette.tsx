'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, X, Zap, Mic, MicOff, CheckCircle2 } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { BlockType } from '@/types/block';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionSuggestion {
  label: string;
  command: string;
}

interface Operation {
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

interface AgentResponsePayload {
  type?: 'operations' | 'agent_response';
  summary?: string;
  message?: string;
  operations?: Operation[];
  actionSuggestions?: ActionSuggestion[];
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

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [executedOps, setExecutedOps] = useState<string[]>([]);
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const blocks = useBlockStore((state) => state.blocks);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const addBlock = useBlockStore((state) => state.addBlock);
  const createLink = useBlockStore((state) => state.createLink);
  const outdentBlock = useBlockStore((state) => state.outdentBlock);

  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setInput('');
      setResult('');
      setStreamText('');
      setExecutedOps([]);
      setActionSuggestions([]);
      resetTranscript();
    }
  }, [isOpen, resetTranscript]);

  useEffect(() => {
    if (transcript && isOpen) {
      setInput(transcript);
    }
  }, [transcript, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const executeOperations = useCallback((operations: Operation[]) => {
    const ops: string[] = [];

    const findBlock = (target?: string) => {
      if (!target) return undefined;
      const lower = target.toLowerCase();
      return blocks.find(
        (b) =>
          b.id === target ||
          (b.title && b.title.toLowerCase().includes(lower)) ||
          (b.content && b.content.toLowerCase().includes(lower))
      );
    };

    operations.forEach((op) => {
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
            updateBlock(targetBlock.id, op.update);
            ops.push(`已更新 Block: ${targetBlock.title || targetBlock.content.substring(0, 20)}`);
          }
          break;
        }
        case 'highlightBlocks':
          blocks.forEach((b) => {
            const match =
              (b.content && b.content.includes(op.target || '')) ||
              (b.title && b.title.includes(op.target || '')) ||
              (op.target === '待办' && b.type === 'todo');
            if (match) {
              updateBlock(b.id, { meta: { ...b.meta, highlight: 'red' } });
            }
          });
          ops.push(`已高亮所有包含「${op.target}」的 Block`);
          break;
        case 'createBlock': {
          const parent = op.parentTarget ? findBlock(op.parentTarget) : undefined;
          const blockType = op.type || 'text';
          const newX = parent ? (parent.x || 40) + (parent.width || 420) + 40 : undefined;
          const newY = parent ? parent.y || 40 : undefined;
          const newBlockId = addBlock(blockType, parent?.id, newX && newY ? { x: newX, y: newY } : undefined);

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
          if (child && parent && child.id !== parent.id) {
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
            const newId = addBlock(op.type || 'text', parent.id, { x: newX, y: newY });
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

          const children = op.children || [];
          children.forEach((c, idx) => {
            const childX = parentX + 460;
            const childY = parentY + idx * 160;
            const childId = addBlock(c.type || 'todo', parentId, { x: childX, y: childY });
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

    setExecutedOps(ops);
    return ops;
  }, [blocks, updateBlock, deleteBlock, addBlock, outdentBlock, createLink]);

  const executeLocalCommand = useCallback((cmd: string): { isHandled: boolean; ops?: string[]; intro?: ReturnType<typeof getLocalBlockOSCapabilityIntro> } => {
    const trimmed = cmd.trim();
    if (!trimmed) return { isHandled: false };

    // 0. 询问 BlockOS 自身能力/功能介绍/我是谁
    if (isBlockOSSelfIntroQuery(trimmed)) {
      return { isHandled: true, intro: getLocalBlockOSCapabilityIntro() };
    }

    const numMap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

    // 1. 删除所有
    if (/^(删除|清空)(所有|全部)(的)?(Block|块|卡片)?$/i.test(trimmed) || /^(清空画布|全部删除)$/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'deleteAllBlocks' }]);
      return { isHandled: true, ops };
    }

    // 2. 清空所有内容
    if (/^清空(所有|全部)(Block|块|卡片)?(的)?内容$/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'clearAllContent' }]);
      return { isHandled: true, ops };
    }

    // 3. 组合层级创建：如“创建1个需求Block，并创建2个子Block”
    const hierarchyMatch = trimmed.match(/(?:创建|新建)\s*(\d+|一|两|三|四|五)?\s*个.*?(?:并创建|包含|附带)\s*(\d+|一|两|三|四|五)\s*个子\s*(?:Block|块|卡片)?/i);
    if (hierarchyMatch) {
      const subCount = Math.min(Math.max(parseInt(hierarchyMatch[2], 10) || numMap[hierarchyMatch[2]] || 2, 1), 10);
      const subItems = Array.from({ length: subCount }, (_, i) => ({
        title: `子任务 ${i + 1}`,
        content: `自动化拆分子项 ${i + 1}（待执行）`,
        type: 'todo' as BlockType,
      }));

      const ops = executeOperations([{
        action: 'batchCreateHierarchy',
        parent: {
          title: '核心业务需求 (PRD)',
          content: '通过内置 AI 智能调度自动生成的父级结构化 Block',
          type: 'text',
        },
        children: subItems,
      }]);
      return { isHandled: true, ops };
    }

    // 4. 将 Block A 设为 Block B 的子 Block
    const setParentMatch = trimmed.match(/(?:将|把)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:设为|作为)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:子Block|子块|子节点)/i);
    if (setParentMatch) {
      const childTarget = setParentMatch[1];
      const parentTarget = setParentMatch[2];
      const ops = executeOperations([{ action: 'setParent', childTarget, parentTarget }]);
      return { isHandled: true, ops };
    }

    // 5. 移出子 Block
    const outdentMatch = trimmed.match(/(?:移出|解除)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:子Block|子块)/i);
    if (outdentMatch) {
      const target = outdentMatch[1];
      const ops = executeOperations([{ action: 'outdentBlock', target }]);
      return { isHandled: true, ops };
    }

    // 6. 创建代码沙箱 Block
    if (/代码.*?(沙箱|块|block)|(?:创建|新建|添加).*?代码/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'createBlock', type: 'code', title: '交互式代码沙箱' }]);
      return { isHandled: true, ops };
    }

    // 7. 创建流程图 / 架构图 Mermaid Block
    if (/流程图|架构图|mermaid/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'createBlock', type: 'mermaid', title: '系统架构流程图' }]);
      return { isHandled: true, ops };
    }

    // 8. 批量创建普通 Block（纯粹的空卡片创建指令，结尾必须为 Block/块/卡片）
    const createMultiMatch = trimmed.match(/^(?:创建|添加|新建)\s*(\d+|一|两|三|四|五|六|七|八|九|十)\s*个\s*(文本|代码|表格|画板|媒体|待办)?\s*(?:Block|块|卡片)?$/i);
    if (createMultiMatch) {
      const rawCount = createMultiMatch[1];
      const count = Math.min(Math.max(parseInt(rawCount, 10) || numMap[rawCount] || 1, 1), 20);
      const rawType = createMultiMatch[2];
      const typeMap: Record<string, BlockType> = { 文本: 'text', 代码: 'code', 表格: 'table', 画板: 'whiteboard', 媒体: 'media', 待办: 'todo' };
      const blockType = (rawType && typeMap[rawType]) || 'text';

      for (let i = 0; i < count; i++) {
        addBlock(blockType);
      }
      const msg = `已创建 ${count} 个 ${rawType || '文本'} Block`;
      setExecutedOps([msg]);
      return { isHandled: true, ops: [msg] };
    }

    // 9. 单个创建普通 Block（纯粹的空卡片创建指令，结尾必须为 Block/块/卡片）
    const createSingleMatch = trimmed.match(/^(?:创建|新建|添加)\s*(?:一个|1个)?\s*(文本|代码|表格|画板|媒体|待办)?\s*(?:Block|块|卡片)?$/i);
    if (createSingleMatch) {
      const rawType = createSingleMatch[1];
      const typeMap: Record<string, BlockType> = { 文本: 'text', 代码: 'code', 表格: 'table', 画板: 'whiteboard', 媒体: 'media', 待办: 'todo' };
      const blockType = (rawType && typeMap[rawType]) || 'text';
      addBlock(blockType);
      const msg = `已创建 1 个 ${rawType || '文本'} Block`;
      setExecutedOps([msg]);
      return { isHandled: true, ops: [msg] };
    }

    // 10. 高亮包含特定内容的 Block
    const highlightMatch = trimmed.match(/^(?:高亮|标红)(?:包含|有)?\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:Block|块)?/i);
    if (highlightMatch && highlightMatch[1]) {
      const ops = executeOperations([{ action: 'highlightBlocks', target: highlightMatch[1] }]);
      return { isHandled: true, ops };
    }

    // 11. 删除包含特定内容的 Block
    const deleteMatch = trimmed.match(/^删除(?:包含)?\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:Block|块)?/i);
    if (deleteMatch && deleteMatch[1]) {
      const ops = executeOperations([{ action: 'deleteBlock', target: deleteMatch[1] }]);
      return { isHandled: true, ops };
    }

    return { isHandled: false };
  }, [executeOperations, addBlock]);

  const executeCommandOrPrompt = useCallback(async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setResult('');
    setStreamText('');
    setExecutedOps([]);
    setActionSuggestions([]);

    // 1. 本地前置极速规则匹配（包含能力介绍、本地快捷指令等）
    const localResult = executeLocalCommand(trimmed);
    if (localResult.isHandled) {
      if (localResult.intro) {
        setResult(localResult.intro.message);
        setStreamText(localResult.intro.message);
        setActionSuggestions(localResult.intro.actionSuggestions);
      } else if (localResult.ops) {
        setResult(localResult.ops.join('\n'));
      }
      setIsLoading(false);
      return;
    }

    // 2. 统一调用 AI 调度 Agent 接口 (/api/ai/command)
    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed,
          blocks: blocks.map((b) => ({
            id: b.id,
            type: b.type,
            title: b.title || '',
            parentId: b.parentId,
            content: b.content.substring(0, 160),
          })),
        }),
      });

      if (!response.ok) throw new Error('Request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamText(extractStreamingDisplay(accumulated));
      }

      const text = accumulated.trim();

      // 3. 尝试解析 Agent 输出的 JSON
      let parsedJson: AgentResponsePayload | Operation[] | null = null;
      try {
        const objMatch = text.match(/\{[\s\S]*\}/);
        const arrMatch = text.match(/\[[\s\S]*\]/);
        if (objMatch) {
          parsedJson = JSON.parse(objMatch[0]);
        } else if (arrMatch) {
          parsedJson = JSON.parse(arrMatch[0]);
        }
      } catch {
        parsedJson = null;
      }

      if (parsedJson) {
        if (!Array.isArray(parsedJson) && parsedJson.type === 'agent_response') {
          // Agent 问答与能力展示
          const msg = parsedJson.message || extractStreamingDisplay(text);
          setResult(msg);
          setStreamText(msg);
          if (Array.isArray(parsedJson.actionSuggestions)) {
            setActionSuggestions(parsedJson.actionSuggestions);
          }
        } else if (!Array.isArray(parsedJson) && parsedJson.type === 'operations') {
          // Agent 画布指令执行
          if (Array.isArray(parsedJson.operations)) {
            const ops = executeOperations(parsedJson.operations);
            setResult(parsedJson.summary || ops.join('\n') || '操作已执行');
            setStreamText('');
          }
        } else if (Array.isArray(parsedJson)) {
          // 纯操作数组兼容
          const ops = executeOperations(parsedJson);
          setResult(ops.join('\n') || '操作已执行');
          setStreamText('');
        } else {
          const cleanText = extractStreamingDisplay(text);
          setResult(cleanText);
          setStreamText(cleanText);
        }
      } else {
        // 未解析为 JSON 的自然语言文本回复
        const cleanText = extractStreamingDisplay(text);
        setResult(cleanText);
        setStreamText(cleanText);
      }
    } catch (error) {
      console.error('AI Error:', error);
      // 网络或异常时友好提示
      const errorMsg = 'AI 服务响应异常或网络中断，请稍后重试。您也可以通过画布工具栏直接操作卡片。';
      setResult(errorMsg);
      setStreamText(errorMsg);
      setActionSuggestions([
        { label: '🚀 生成需求与子任务树', command: '创建1个核心功能需求Block，并创建3个开发子任务' },
        { label: '🔀 创建系统架构流程图', command: '创建微服务系统架构 Mermaid 流程图' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, blocks, executeLocalCommand, executeOperations]);

  const handleSubmit = useCallback(() => {
    executeCommandOrPrompt(input);
  }, [input, executeCommandOrPrompt]);

  const handleExecuteSuggestion = useCallback((cmd: string) => {
    // 优先：如果操作是“在画布创建当前主题卡片”或类似创建卡片指令，且当前已有问答解答内容，直接将当前内容写入画布 Block
    if (
      /在画布创建|创建.*?主题卡片|创建.*?详细介绍(?:的)?(?:Block|块|卡片)|创建.*?关于.*?的?(?:Block|块|卡片)/i.test(cmd) &&
      (streamText || result)
    ) {
      const content = streamText || result;
      const title = deriveTopicTitle(input);

      let blockType: BlockType = 'text';
      if (/^graph\s+(TD|LR|TB)|sequenceDiagram|classDiagram/m.test(content)) {
        blockType = 'mermaid';
      } else if (/^```(javascript|typescript|js|ts)?\n[\s\S]*\n```$/m.test(content)) {
        blockType = 'code';
      } else if (/^- \[[ x]\]/m.test(content)) {
        blockType = 'todo';
      }

      const lastBlock = blocks[blocks.length - 1];
      const newX = lastBlock ? (lastBlock.x || 40) : 40;
      const newY = lastBlock ? (lastBlock.y || 40) + (lastBlock.height || 260) + 40 : 40;

      const newBlockId = addBlock(blockType, undefined, { x: newX, y: newY });
      updateBlock(newBlockId, {
        title,
        content,
      });

      const msg = `已在画布创建主题卡片「${title}」并写入知识内容`;
      setExecutedOps([msg]);
      setResult(msg);
      setActionSuggestions([]);
      return;
    }

    setInput(cmd);
    executeCommandOrPrompt(cmd);
  }, [executeCommandOrPrompt, streamText, result, input, blocks, addBlock, updateBlock]);

  const handleKeep = useCallback(() => {
    const content = streamText || result;
    if (content) {
      let blockType: BlockType = 'text';
      let cleanContent = content;

      // 智能感知内容类型
      if (/^graph\s+(TD|LR|TB)|sequenceDiagram|classDiagram/m.test(content)) {
        blockType = 'mermaid';
      } else if (/^```(javascript|typescript|js|ts)?\n[\s\S]*\n```$/m.test(content)) {
        blockType = 'code';
        cleanContent = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
      } else if (/^- \[[ x]\]/m.test(content)) {
        blockType = 'todo';
      }

      const title = deriveTopicTitle(input);

      const lastBlock = blocks[blocks.length - 1];
      const newX = lastBlock ? (lastBlock.x || 40) : 40;
      const newY = lastBlock ? (lastBlock.y || 40) + (lastBlock.height || 260) + 40 : 40;

      const newBlockId = addBlock(blockType, undefined, { x: newX, y: newY });
      updateBlock(newBlockId, { title, content: cleanContent });
    }
    onClose();
  }, [streamText, result, input, blocks, addBlock, updateBlock, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 rounded-2xl shadow-modal overflow-hidden animate-scale-in">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/80 dark:bg-[#141517]/80">
          <div className="w-7 h-7 rounded-lg bg-[#f7f4ff] dark:bg-purple-950/40 text-ai-purple flex items-center justify-center shadow-xs">
            <Zap className="w-3.5 h-3.5 text-ai-purple" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-content dark:text-zinc-100">AI 画布操作助手</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai-purple-light dark:bg-purple-950/40 text-ai-purple dark:text-purple-300 border border-ai-purple-border font-medium">Canvas Agent</span>
          </div>
        </div>

        {/* 指令输入框 */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line-subtle dark:border-zinc-800 bg-white dark:bg-[#1a1c20]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="输入指令或提问，例如：你能在此完成什么工作？、创建需求与3个子任务、清空画布..."
            className="flex-1 bg-transparent outline-none text-content dark:text-zinc-100 placeholder-content-tertiary text-sm py-1"
          />
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening ? 'bg-red-500/15 text-red-500' : 'hover:bg-surface-hover dark:hover:bg-zinc-800 text-content-tertiary hover:text-content-secondary'
              }`}
              title={isListening ? '停止录音' : '语音输入'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-brand animate-spin" />
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg transition-all shadow-xs disabled:opacity-30"
              title="发送指令"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg transition-colors text-content-tertiary hover:text-content-secondary"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 画布操作成功反馈 */}
        {executedOps.length > 0 && (
          <div className="px-5 py-3 border-t border-emerald-200 dark:border-emerald-800/40 bg-[#e8f8f0] dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#2ba471]" />
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">画布操作已执行</span>
            </div>
            <div className="space-y-1">
              {executedOps.map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3 text-[#2ba471]" />
                  <span>{op}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 智能体文本输出与解答展示 */}
        {(streamText || result) && !executedOps.length && (
          <div className="px-5 py-4 text-sm text-content dark:text-zinc-200 border-t border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/50 dark:bg-zinc-950/40 max-h-64 overflow-y-auto">
            <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs sm:text-sm">
              {streamText || result}
              {isLoading && (
                <span className="inline-block w-1.5 h-4 bg-brand ml-1 align-text-bottom animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* 一键快捷操作建议芯片 */}
        {actionSuggestions.length > 0 && (
          <div className="px-5 py-3 border-t border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40">
            <div className="text-xs font-semibold text-ai-purple dark:text-purple-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-ai-purple" />
              <span>推荐操作（点击直接在画布中执行生效）：</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {actionSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteSuggestion(sug.command)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 hover:border-brand hover:bg-brand-light hover:text-brand dark:hover:bg-blue-950/30 text-content-secondary dark:text-zinc-200 transition-all shadow-xs active:scale-95 text-left font-medium"
                >
                  <span>{sug.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 文本类回复的底部保留操作 */}
        {!isLoading && (streamText || result) && !executedOps.length && (
          <div className="flex gap-2 px-5 py-3 border-t border-line-subtle dark:border-zinc-800">
            <button
              onClick={handleKeep}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
            >
              创建为 Block
            </button>
            <button
              onClick={() => {
                setStreamText('');
                setResult('');
              }}
              className="flex-1 px-3 py-2 bg-surface-hover dark:bg-zinc-800 hover:bg-line-subtle dark:hover:bg-zinc-700 text-content-secondary dark:text-zinc-400 text-sm rounded-lg transition-colors"
            >
              清除
            </button>
          </div>
        )}

        {/* 底部功能提示与真实示例 */}
        <div className="px-5 py-2.5 bg-[#f7f8fa] dark:bg-zinc-950/60 text-[11px] text-content-tertiary dark:text-zinc-400 border-t border-line-subtle dark:border-zinc-800/40">
          <span className="font-semibold text-content-secondary dark:text-zinc-300">示例：</span>
          「你能在此完成什么工作？」「创建1个需求并创建3个子任务」「创建代码沙箱」「画一个微服务架构流程图」「高亮所有包含待办的Block」
        </div>
      </div>
    </div>
  );
}