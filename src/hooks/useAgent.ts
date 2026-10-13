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
    const processedChanges = processedChangesRef.current;
    const taskQueue = taskQueueRef.current;
    return () => {
      isMountedRef.current = false;
      processedChanges.clear();
      taskQueue.length = 0;
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
          const wasUnchecked = !prevBlock.meta?.checked;
          const isChecked = !!block.meta?.checked;

          if (!isChecked) {
            // 用户取消勾选，清除标记以允许再次勾选时触发刷新
            processedChangesRef.current.delete(`${block.id}-true`);
          } else if (block.type === 'todo' && wasUnchecked && isChecked) {
            const changeKey = `${block.id}-true`;
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
      const changeKey = `${block.id}-${!!block.meta?.checked}`;
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
              let reportBlockId: string | null = null;

              for (const action of rule.actions) {
                if (action.type === 'createBlock') {
                  const timestamp = new Date().toLocaleString('zh-CN');
                  const content = (action.config.contentTemplate as string).replace('{timestamp}', timestamp);
                  
                  // 幂等防重：检查是否已有该待办关联的发布报告
                  const currentBlocks = useBlockStore.getState().blocks;
                  const existingReport = currentBlocks.find(
                    (b) => b.meta?.sourceBlockId === block.id && b.meta?.ruleRole === 'audit-report'
                  );

                  if (existingReport) {
                    reportBlockId = existingReport.id;
                    updateBlock(reportBlockId, {
                      title: '📋 迭代发布报告（Agent 自动化归档）',
                      content,
                      meta: {
                        ...existingReport.meta,
                        tags: ['Agent自驱动', '发布归档'],
                      },
                    });
                  } else {
                    reportBlockId = addBlock('text', block.id);
                    updateBlock(reportBlockId, {
                      title: '📋 迭代发布报告（Agent 自动化归档）',
                      content,
                      meta: {
                        agentGenerated: true,
                        sourceBlockId: block.id,
                        ruleRole: 'audit-report',
                        tags: ['Agent自驱动', '发布归档'],
                      },
                    });
                  }

                  if (isMountedRef.current) {
                    addAgentLog({
                      ruleId: rule.id,
                      blockId: block.id,
                      result: `自动化归档发布报告: ${timestamp}`,
                    });
                  }
                }

                if (action.type === 'callAI') {
                  const prompt = action.config.prompt as string;
                  const currentBlocks = useBlockStore.getState().blocks;
                  const existingAiBlock = currentBlocks.find(
                    (b) => b.meta?.sourceBlockId === block.id && b.meta?.ruleRole === 'ai-checklist'
                  );

                  let aiBlockId = existingAiBlock ? existingAiBlock.id : null;
                  if (!aiBlockId) {
                    // 排布在报告下方，通过 addBlock 智能避让计算，杜绝重叠坐标
                    aiBlockId = addBlock('text', reportBlockId || block.id);
                    updateBlock(aiBlockId, {
                      title: '🚀 下一步上线保障与测试 Checklist（智谱 GLM 4.7 Flash）',
                      content: '⏳ 正在调用智谱 GLM 4.7 Flash 大模型规划上线保障清单...',
                      meta: {
                        agentGenerated: true,
                        sourceBlockId: block.id,
                        ruleRole: 'ai-checklist',
                        tags: ['智谱AI', '上线Checklist'],
                      },
                    });
                  } else {
                    updateBlock(aiBlockId, {
                      title: '🚀 下一步上线保障与测试 Checklist（智谱 GLM 4.7 Flash）',
                      content: '⏳ 正在重新生成上线保障清单...',
                    });
                  }

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
                      if (cleanText && isMountedRef.current && aiBlockId) {
                        updateBlock(aiBlockId, {
                          title: '🚀 下一步上线保障与测试 Checklist（智谱 GLM 4.7 Flash）',
                          content: cleanText,
                          meta: {
                            agentGenerated: true,
                            sourceBlockId: block.id,
                            ruleRole: 'ai-checklist',
                            tags: ['智谱AI', '上线Checklist'],
                          },
                        });

                        addAgentLog({
                          ruleId: rule.id,
                          blockId: block.id,
                          result: '智谱 GLM 4.7 Flash 成功生成上线保障 Checklist',
                        });
                      }
                    }
                  } catch (aiErr) {
                    console.error('Agent AI generate error:', aiErr);
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
