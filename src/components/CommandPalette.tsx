'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, X, Trash2, Zap, Mic, MicOff } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { BlockType } from '@/types/block';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_KEYWORDS = [
  '删除', '高亮', '标红', '创建', '清空', '移动', '排序', '整理',
  '添加', '修改', '更新', '移除', '全部', '所有', '新建', '生成',
  '子', '父', '设为', '作为', '移出', '解除', '关联', '链接'
];

function isCommandIntent(input: string): boolean {
  return COMMAND_KEYWORDS.some((kw) => input.includes(kw));
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

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [executedOps, setExecutedOps] = useState<string[]>([]);
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
      resetTranscript();
    }
  }, [isOpen, resetTranscript]);

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
          ops.push(`已删除 ${allIds.length} 个 Block`);
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
            if (b.content.includes(op.target || '') || b.title?.includes(op.target || '')) {
              updateBlock(b.id, { meta: { ...b.meta, highlight: 'red' } });
            }
          });
          ops.push(`已高亮包含"${op.target}"的 Block`);
          break;
        case 'createBlock': {
          const parent = op.parentTarget ? findBlock(op.parentTarget) : undefined;
          const newX = parent ? (parent.x || 40) + (parent.width || 420) + 40 : undefined;
          const newY = parent ? parent.y || 40 : undefined;
          const newBlockId = addBlock(op.type || 'text', parent?.id, newX && newY ? { x: newX, y: newY } : undefined);
          updateBlock(newBlockId, {
            title: op.title || '',
            content: op.content || '',
            parentId: parent?.id || null,
          });
          ops.push(parent ? `已在「${parent.title || parent.id}」下创建子 Block` : `已创建新 Block`);
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
            title: op.parent?.title || '核心需求',
            content: op.parent?.content || '',
          });

          const children = op.children || [];
          children.forEach((c, idx) => {
            const childX = parentX + 460;
            const childY = parentY + idx * 160;
            const childId = addBlock(c.type || 'todo', parentId, { x: childX, y: childY });
            updateBlock(childId, {
              title: c.title || `子项 ${idx + 1}`,
              content: c.content || '',
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

  const executeLocalCommand = useCallback((cmd: string): string | null => {
    const trimmed = cmd.trim();
    if (!trimmed) return null;

    const numMap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

    // 1. 删除所有
    if (/^(删除|清空)(所有|全部)(的)?(Block|块|卡片)?$/i.test(trimmed) || /^(清空画布|全部删除)$/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'deleteAllBlocks' }]);
      return ops.join('\n');
    }

    // 2. 清空所有内容
    if (/^清空(所有|全部)(Block|块|卡片)?(的)?内容$/i.test(trimmed)) {
      const ops = executeOperations([{ action: 'clearAllContent' }]);
      return ops.join('\n');
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
          title: '核心需求与业务目标',
          content: '通过内置 AI 智能调度自动生成的父级结构化 Block',
          type: 'text',
        },
        children: subItems,
      }]);
      return ops.join('\n');
    }

    // 4. 将 Block A 设为 Block B 的子 Block
    const setParentMatch = trimmed.match(/(?:将|把)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:设为|作为)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:子Block|子块|子节点)/i);
    if (setParentMatch) {
      const childTarget = setParentMatch[1];
      const parentTarget = setParentMatch[2];
      const ops = executeOperations([{ action: 'setParent', childTarget, parentTarget }]);
      return ops.join('\n');
    }

    // 5. 移出子 Block
    const outdentMatch = trimmed.match(/(?:移出|解除)\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:子Block|子块)/i);
    if (outdentMatch) {
      const target = outdentMatch[1];
      const ops = executeOperations([{ action: 'outdentBlock', target }]);
      return ops.join('\n');
    }

    // 6. 批量创建普通 Block
    const createMultiMatch = trimmed.match(/^(?:创建|添加|新建)\s*(\d+|一|两|三|四|五|六|七|八|九|十)\s*个\s*(文本|代码|表格|画板|媒体)?\s*(?:Block|块|卡片)?/i);
    if (createMultiMatch) {
      const rawCount = createMultiMatch[1];
      const count = Math.min(Math.max(parseInt(rawCount, 10) || numMap[rawCount] || 1, 1), 20);
      const rawType = createMultiMatch[2];
      const typeMap: Record<string, BlockType> = { 文本: 'text', 代码: 'code', 表格: 'table', 画板: 'whiteboard', 媒体: 'media' };
      const blockType = (rawType && typeMap[rawType]) || 'text';

      for (let i = 0; i < count; i++) {
        addBlock(blockType);
      }
      const msg = `已创建 ${count} 个 ${rawType || '文本'} Block`;
      setExecutedOps([msg]);
      return msg;
    }

    // 7. 单个创建 Block
    if (/^(创建|新建|添加)(一个|1个)?\s*(文本|代码|表格|画板|媒体)?\s*(?:Block|块|卡片)?/i.test(trimmed)) {
      const typeMatch = trimmed.match(/(文本|代码|表格|画板|媒体)/);
      const typeMap: Record<string, BlockType> = { 文本: 'text', 代码: 'code', 表格: 'table', 画板: 'whiteboard', 媒体: 'media' };
      const blockType = (typeMatch && typeMap[typeMatch[1]]) || 'text';
      addBlock(blockType);
      const msg = `已创建 1 个 ${typeMatch ? typeMatch[1] : '文本'} Block`;
      setExecutedOps([msg]);
      return msg;
    }

    // 8. 高亮包含特定内容的 Block
    const highlightMatch = trimmed.match(/^(?:高亮|标红)(?:包含|有)?\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:Block|块)?/i);
    if (highlightMatch && highlightMatch[1]) {
      const ops = executeOperations([{ action: 'highlightBlocks', target: highlightMatch[1] }]);
      return ops.join('\n');
    }

    // 9. 删除包含特定内容的 Block
    const deleteMatch = trimmed.match(/^删除(?:包含)?\s*["'“]?([^"'”\s]+)["'”]?\s*(?:的)?(?:Block|块)?/i);
    if (deleteMatch && deleteMatch[1]) {
      const ops = executeOperations([{ action: 'deleteBlock', target: deleteMatch[1] }]);
      return ops.join('\n');
    }

    return null;
  }, [executeOperations, addBlock]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResult('');
    setStreamText('');
    setExecutedOps([]);

    const useCommand = isCommandIntent(input);

    try {
      const endpoint = useCommand ? '/api/ai/command' : '/api/ai/generate';
      const body = useCommand
        ? JSON.stringify({
            command: input,
            blocks: blocks.map((b) => ({
              id: b.id,
              type: b.type,
              title: b.title || '',
              content: b.content.substring(0, 200),
            })),
          })
        : JSON.stringify({ prompt: input });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
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
        setStreamText(accumulated);
      }

      const text = accumulated.trim();

      if (useCommand) {
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const operations = JSON.parse(jsonMatch[0]) as Operation[];
            const ops = executeOperations(operations);
            setResult(ops.join('\n') || '命令已执行');
          } else {
            // 本地规则兜底执行
            const fallbackOps = executeLocalCommand(input);
            setResult(fallbackOps || text || '命令已处理');
          }
        } catch {
          const fallbackOps = executeLocalCommand(input);
          setResult(fallbackOps || text || '命令已处理');
        }
      } else {
        const finalText = text || `【AI 快速生成记录】\n已针对输入「${input}」就绪。\n点击下方「保留并插入画布」可将内容直接实例化为画布 Block。`;
        setResult(finalText);
        setStreamText(finalText);
      }
    } catch (error) {
      console.error('AI Error:', error);
      if (useCommand) {
        const fallbackOps = executeLocalCommand(input);
        setResult(fallbackOps || '命令分析完毕，未能匹配到有效 Block 操作。');
      } else {
        const fallbackText = `【AI 快速记录】\n内容：「${input}」\n点击下方「保留并插入画布」可直接写入画布。`;
        setResult(fallbackText);
        setStreamText(fallbackText);
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, blocks, executeOperations, executeLocalCommand]);

  const handleKeep = useCallback(() => {
    if (streamText) {
      const newBlockId = addBlock('text');
      setTimeout(() => {
        updateBlock(newBlockId, { content: streamText });
      }, 0);
    }
    onClose();
  }, [streamText, addBlock, updateBlock, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-zinc-800/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">AI 助手</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-zinc-800/60">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="输入命令，例如：删除所有 Block、创建 3 个文本 Block、高亮包含风险的 Block..."
            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 text-sm"
          />
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening ? 'bg-red-500/15 text-red-400' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-500'
              }`}
              title={isListening ? '停止录音' : '语音输入'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4 text-purple-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {executedOps.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-zinc-800/60 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">操作已执行</span>
            </div>
            <div className="space-y-1">
              {executedOps.map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                  <Trash2 className="w-3 h-3 text-gray-400 dark:text-zinc-600" />
                  {op}
                </div>
              ))}
            </div>
          </div>
        )}

        {(streamText || result) && !executedOps.length && (
          <div className="px-5 py-3 text-sm text-gray-700 dark:text-zinc-300 border-t border-gray-200 dark:border-zinc-800/60 bg-gray-50/30 dark:bg-zinc-950/30 max-h-48 overflow-y-auto">
            <div className="whitespace-pre-wrap leading-relaxed">
              {streamText || result}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-text-bottom animate-cursor-blink" />
              )}
            </div>
          </div>
        )}

        {!isLoading && streamText && !executedOps.length && (
          <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-zinc-800/60">
            <button
              onClick={handleKeep}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              创建为 Block
            </button>
            <button
              onClick={() => { setStreamText(''); setResult(''); }}
              className="flex-1 px-3 py-2 bg-gray-100/60 dark:bg-zinc-800/60 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 text-sm rounded-lg transition-colors"
            >
              清除
            </button>
          </div>
        )}

        <div className="px-5 py-2.5 bg-gray-50/40 dark:bg-zinc-950/40 text-[11px] text-gray-400 dark:text-zinc-600">
          <span className="text-gray-500 dark:text-zinc-500">示例：</span>
          「删除所有 Block」「创建 3 个文本 Block」「高亮所有包含合规的 Block」「写一篇关于人工智能的简短介绍」
        </div>
      </div>
    </div>
  );
}