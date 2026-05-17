'use client';

import { useEffect, useRef } from 'react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface AgentTask {
  block: Block;
  prevBlock: Block;
}

export function useAgent() {
  const agentEnabled = useBlockStore((state) => state.agentEnabled);
  const agentRules = useBlockStore((state) => state.agentRules);
  const blocks = useBlockStore((state) => state.blocks);
  const addBlock = useBlockStore((state) => state.addBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const addAgentLog = useBlockStore((state) => state.addAgentLog);

  const prevBlocksRef = useRef<Block[]>([]);
  const processedChangesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const taskQueueRef = useRef<AgentTask[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      processedChangesRef.current.clear();
      taskQueueRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!agentEnabled) {
      prevBlocksRef.current = [...blocks];
      return;
    }
    if (isProcessingRef.current) return;

    const prevBlocks = prevBlocksRef.current;
    const newTasks: AgentTask[] = [];

    blocks.forEach((block) => {
      const prevBlock = prevBlocks.find((b) => b.id === block.id);
      if (!prevBlock) return;

      agentRules.forEach((rule) => {
        if (!rule.enabled) return;

        if (rule.id === 'todo-complete') {
          const wasUnchecked = !prevBlock.meta.checked;
          const isChecked = !!block.meta.checked;
          const changeKey = `${block.id}-${isChecked}`;

          if (block.type === 'todo' && wasUnchecked && isChecked) {
            if (processedChangesRef.current.has(changeKey)) return;
            newTasks.push({ block, prevBlock });
          }
        }
      });
    });

    if (newTasks.length === 0) {
      prevBlocksRef.current = [...blocks];
      return;
    }

    taskQueueRef.current.push(...newTasks);
    newTasks.forEach(({ block }) => {
      const changeKey = `${block.id}-${!!block.meta.checked}`;
      processedChangesRef.current.add(changeKey);
    });

    if (taskQueueRef.current.length > 100) {
      taskQueueRef.current = taskQueueRef.current.slice(-50);
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const processQueue = async () => {
      while (taskQueueRef.current.length > 0 && isMountedRef.current) {
        const task = taskQueueRef.current.shift();
        if (!task) break;

        const { block } = task;

        try {
          for (const rule of agentRules) {
            if (!rule.enabled) continue;

            if (rule.id === 'todo-complete') {
              for (const action of rule.actions) {
                if (action.type === 'createBlock') {
                  const timestamp = new Date().toLocaleString('zh-CN');
                  const content = (action.config.contentTemplate as string).replace('{timestamp}', timestamp);
                  const newBlockId = addBlock('text', block.id);

                  setTimeout(() => {
                    if (isMountedRef.current) {
                      updateBlock(newBlockId, { content });
                    }
                  }, 50);

                  if (isMountedRef.current) {
                    addAgentLog({
                      ruleId: rule.id,
                      blockId: block.id,
                      result: `创建完成日志: ${content}`,
                    });
                  }
                }

                if (action.type === 'callAI') {
                  const prompt = action.config.prompt as string;
                  try {
                    const response = await fetch('/api/ai/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt, context: block.content }),
                    });

                    if (isMountedRef.current && response.ok && response.body) {
                      const reader = response.body.getReader();
                      const decoder = new TextDecoder();
                      let text = '';
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done || !isMountedRef.current) break;
                        text += decoder.decode(value, { stream: true });
                      }
                      const cleanText = text.trim();
                      if (cleanText && isMountedRef.current) {
                        const newBlockId = addBlock('text', block.id);
                        setTimeout(() => {
                          if (isMountedRef.current) {
                            updateBlock(newBlockId, { content: `🎉 ${cleanText}` });
                          }
                        }, 50);

                        addAgentLog({
                          ruleId: rule.id,
                          blockId: block.id,
                          result: '生成鼓励语',
                        });
                      }
                    }
                  } catch {
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Agent rule error:', error);
        }
      }

      isProcessingRef.current = false;

      if (taskQueueRef.current.length > 0) {
        setTimeout(() => {
          if (isMountedRef.current) {
            isProcessingRef.current = true;
            processQueue();
          }
        }, 100);
      }
    };

    processQueue();
    prevBlocksRef.current = [...blocks];
  }, [blocks, agentEnabled, agentRules, addBlock, updateBlock, addAgentLog]);
}
