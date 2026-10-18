'use client';

import { useEffect, useRef, useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import { executeCanvasOperations, extractStreamingDisplay, type ActionSuggestion, type AgentResponsePayload, type Operation } from '@/lib/canvas-assistant';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;
  operations?: string[];
  suggestions?: ActionSuggestion[];
  error?: boolean;
  saved?: boolean;
}

export function useCanvasAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleLabel, setRoleLabel] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  async function send(command: string, savedReply?: { content: string; prompt: string }) {
    const trimmed = command.trim();
    if (!trimmed || requestRef.current) return false;
    const controller = new AbortController();
    requestRef.current = controller;
    const assistantId = crypto.randomUUID();
    const history = messages.filter(message => !message.error && message.content).slice(-10)
      .map(({ role, content, operations }) => ({ role, content: [content, ...(operations || [])].join('\n').slice(0, 6000) }));
    setMessages(previous => [...previous,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
      { id: assistantId, role: 'assistant', content: '', prompt: trimmed },
    ]);
    setLoading(true);
    const update = (patch: Partial<AssistantMessage>) => {
      if (requestRef.current !== controller) return;
      setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, ...patch } : message));
    };

    try {
      const state = useBlockStore.getState();
      const pageId = state.currentPageId;
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          command: trimmed,
          documentName: state.pages.find(page => page.id === pageId)?.title || '当前文档',
          messages: history,
          // A suggestion clicked on an older reply still refers to that reply.
          referencedReply: savedReply,
          selectedIds: state.selectedIds,
          blocks: state.blocks.map(block => ({
            id: block.id, type: block.type, title: block.title || '', parentId: block.parentId,
            content: block.content.slice(0, 6000),
          })),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'AI 服务暂时不可用，请稍后重试');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('未收到 AI 回复，请重试');
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        update({ content: extractStreamingDisplay(raw) });
      }
      raw += decoder.decode();
      // Never apply operations from an interrupted request or to another document.
      if (controller.signal.aborted) {
        update({ content: '已停止生成，本次未执行画布操作。', error: true });
        return false;
      }
      if (requestRef.current !== controller || useBlockStore.getState().currentPageId !== pageId) return false;
      const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      let payload: AgentResponsePayload | Operation[];
      try { payload = JSON.parse(text); }
      catch {
        if (text.startsWith('{') || text.startsWith('[')) throw new Error('AI 回复不完整，请重试；本次未执行画布操作');
        update({ content: text || '未收到有效回复，请重试' });
        return true;
      }
      if (!payload || typeof payload !== 'object') throw new Error('AI 回复格式异常，请重试');
      if (Array.isArray(payload) || payload.type === 'operations') {
        const operations = Array.isArray(payload) ? payload : payload.operations;
        if (!Array.isArray(operations) || operations.some(operation => !operation || typeof operation.action !== 'string')) {
          throw new Error('AI 操作格式异常，本次未执行画布操作');
        }
        const results = executeCanvasOperations(operations);
        update({ content: results.length ? '已处理画布操作' : '没有找到可执行的画布操作，请补充目标卡片或具体要求', operations: results });
      } else {
        const suggestions = Array.isArray(payload.actionSuggestions)
          ? payload.actionSuggestions.filter(item => item && typeof item.label === 'string' && typeof item.command === 'string').slice(0, 4) : [];
        update({ content: typeof payload.message === 'string' ? payload.message : (typeof payload.summary === 'string' ? payload.summary : '请补充一下你希望处理的内容。'), suggestions });
      }
      if (!Array.isArray(payload) && typeof payload.roleLabel === 'string') setRoleLabel(payload.roleLabel.slice(0, 60));
      return true;
    } catch (error) {
      update({ content: controller.signal.aborted ? '已停止生成，本次未执行画布操作。' : (error instanceof Error ? error.message : '请求失败，请重试'), error: true });
      return false;
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  return {
    messages, loading, roleLabel, send,
    stop: () => requestRef.current?.abort(),
    clear: () => { if (!requestRef.current) { setMessages([]); setRoleLabel(''); } },
    markSaved: (id: string) => setMessages(previous => previous.map(message => message.id === id ? { ...message, saved: true } : message)),
  };
}
