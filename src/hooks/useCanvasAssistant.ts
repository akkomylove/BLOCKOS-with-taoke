'use client';

import { useEffect, useRef, useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import { executeCanvasOperations, extractStreamingDisplay, type ActionSuggestion, type AgentResponsePayload, type Operation } from '@/lib/canvas-assistant';
import { explicitTextCardCreation, requestsCanvasChange } from '@/lib/assistant-intent';

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
    const requiredCreation = explicitTextCardCreation(trimmed);
    const expectsChange = requestsCanvasChange(trimmed);
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
        update({ content: expectsChange ? '正在分析请求并准备画布操作…' : extractStreamingDisplay(raw) });
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
        update({ content: expectsChange ? '没有收到可执行的画布操作，本次未修改任何卡片，请重试。' : (text || '未收到有效回复，请重试'), error: expectsChange });
        return true;
      }
      if (!payload || typeof payload !== 'object') throw new Error('AI 回复格式异常，请重试');
      const operations = Array.isArray(payload) ? payload : (payload.operations ?? []);
      if (!Array.isArray(operations)) throw new Error('AI 操作格式异常，本次未执行画布操作');
      if (requiredCreation && !operations.some(op => op?.action === 'createBlock' && op.title === requiredCreation.title)) operations.push(requiredCreation);
      if (operations.length > 0 || (!Array.isArray(payload) && payload.type === 'operations')) {
        if (!Array.isArray(operations) || operations.some(operation => !operation || typeof operation.action !== 'string')) {
          throw new Error('AI 操作格式异常，本次未执行画布操作');
        }
        const results = executeCanvasOperations(operations);
        if (results.length > 0) {
          results.forEach((res) => {
            useBlockStore.getState().addAgentLog({
              ruleId: 'CanvasAgent',
              blockId: pageId,
              result: res,
            });
          });
        }
        const answer = !Array.isArray(payload) && typeof payload.message === 'string' ? payload.message : '';
        update({ content: results.length ? [answer, '已处理画布操作'].filter(Boolean).join('\n\n') : '没有找到可执行的画布操作，请补充目标卡片或具体要求', operations: results });
      } else {
        if (Array.isArray(payload)) throw new Error('没有收到可执行的画布操作');
        if (expectsChange) {
          update({ content: '没有收到可执行的画布操作，本次未修改任何卡片。请重试或把操作拆开描述。', error: true });
          return false;
        }
        const answer = typeof payload.message === 'string' ? payload.message : (typeof payload.summary === 'string' ? payload.summary : '请补充一下你希望处理的内容。');
        if (/(?:我(?:已经|已|刚刚)|已成功)[^。！\n]{0,15}(?:新建|创建|删除|修改|更新)/.test(answer)) {
          update({ content: 'AI 没有返回可执行的画布操作，本次没有修改画布。请明确描述需要执行的操作后重试。', error: true });
          return false;
        }
        const suggestions = Array.isArray(payload.actionSuggestions)
          ? payload.actionSuggestions.filter(item => item && typeof item.label === 'string' && typeof item.command === 'string' && !/查看.*(?:新建|创建)|跳转.*(?:新建|创建)/.test(item.label)).slice(0, 4) : [];
        update({ content: answer, suggestions });
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
