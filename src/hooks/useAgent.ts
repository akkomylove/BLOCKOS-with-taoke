'use client';

import { useEffect, useRef } from 'react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

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

  useEffect(() => {
    if (!agentEnabled) {
      prevBlocksRef.current = [...blocks];
      return;
    }
    if (isProcessingRef.current) return;

    const prevBlocks = prevBlocksRef.current;

    const changedBlocks: Array<{ block: Block; prevBlock: Block }> = [];

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
            changedBlocks.push({ block, prevBlock });
          }
        }
      });
    });

    if (changedBlocks.length === 0) {
      prevBlocksRef.current = [...blocks];
      return;
    }

    isProcessingRef.current = true;

    changedBlocks.forEach(({ block }) => {
      const changeKey = `${block.id}-${!!block.meta.checked}`;
      processedChangesRef.current.add(changeKey);
    });

    const processBlocks = async () => {
      for (const { block } of changedBlocks) {
        try {
          agentRules.forEach((rule) => {
            if (!rule.enabled) return;

            if (rule.id === 'todo-complete') {
              rule.actions.forEach((action) => {
                if (action.type === 'createBlock') {
                  const timestamp = new Date().toLocaleString('zh-CN');
                  const content = (action.config.contentTemplate as string).replace('{timestamp}', timestamp);
                  const newBlockId = addBlock('text', block.id);

                  setTimeout(() => {
                    updateBlock(newBlockId, { content });
                  }, 50);

                  addAgentLog({
                    ruleId: rule.id,
                    blockId: block.id,
                    result: `创建完成日志: ${content}`,
                  });
                }

                if (action.type === 'callAI') {
                  const prompt = action.config.prompt as string;
                  fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, context: block.content }),
                  }).then(async (response) => {
                    if (response.ok && response.body) {
                      const reader = response.body.getReader();
                      const decoder = new TextDecoder();
                      let text = '';
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        text += decoder.decode(value, { stream: true });
                      }
                      const cleanText = text.trim();
                      if (cleanText) {
                        const newBlockId = addBlock('text', block.id);
                        setTimeout(() => {
                          updateBlock(newBlockId, { content: `🎉 ${cleanText}` });
                        }, 50);

                        addAgentLog({
                          ruleId: rule.id,
                          blockId: block.id,
                          result: '生成鼓励语',
                        });
                      }
                    }
                  }).catch(() => {});
                }
              });
            }
          });
        } catch (error) {
          console.error('Agent rule error:', error);
        }
      }
    };

    processBlocks();

    prevBlocksRef.current = [...blocks];

    requestAnimationFrame(() => {
      isProcessingRef.current = false;
    });
  }, [blocks, agentEnabled, agentRules, addBlock, updateBlock, addAgentLog]);
}
