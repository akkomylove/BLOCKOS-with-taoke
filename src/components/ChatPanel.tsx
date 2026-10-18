'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, CheckCircle2, FilePlus2, Loader2, Mic, MicOff, Send, Sparkles, Square, Trash2, X } from 'lucide-react';
import { useCanvasAssistant, type AssistantMessage } from '@/hooks/useCanvasAssistant';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAccountStore } from '@/store/accountStore';
import { useBlockStore } from '@/store/blockStore';
import { saveAssistantReply } from '@/lib/canvas-assistant';

interface ChatPanelProps { isOpen: boolean; onClose: () => void; }

const PERSONAL_STARTERS = ['总结当前文档的重点', '帮我梳理接下来要做的事', '创建一个待办卡片', '你能帮我做什么？'];
const ENTERPRISE_STARTERS = ['从我的岗位视角分析当前文档', '梳理当前方案的风险和下一步', '把当前需求拆成任务卡片', '你能帮我做什么？'];

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const enterprise = useAccountStore(state => state.user?.mode === 'enterprise');
  const { messages, loading, roleLabel, send, stop, clear, markSaved } = useCanvasAssistant();
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<{ title?: string; functions: string[] } | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedCount = useBlockStore(state => state.selectedIds.length);
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported, error: speechError } = useSpeechRecognition();

  useEffect(() => {
    if (!isOpen) { stopListening(); return; }
    inputRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, stopListening]);

  useEffect(() => {
    if (!isOpen || !enterprise) return;
    const controller = new AbortController();
    setProfileFailed(false);
    fetch('/api/user/profile', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setProfile({ title: data.title, functions: Array.isArray(data.functions) ? data.functions : [] }); })
      .catch(() => { if (!controller.signal.aborted) setProfileFailed(true); });
    return () => controller.abort();
  }, [isOpen, enterprise]);

  useEffect(() => { if (transcript && isOpen) setInput(transcript); }, [transcript, isOpen]);
  useEffect(() => { const element = scrollRef.current; if (element) element.scrollTop = element.scrollHeight; }, [messages, loading, isOpen]);

  function submit(text = input, reply?: AssistantMessage) {
    if (!text.trim() || loading) return;
    stopListening();
    resetTranscript();
    setInput('');
    void send(text, reply ? { content: reply.content, prompt: reply.prompt || '' } : undefined);
  }

  function saveReply(message: AssistantMessage) {
    if (loading || message.saved) return;
    saveAssistantReply(message.content, message.prompt || 'AI 整理');
    markSaved(message.id);
  }

  if (!isOpen) return null;
  const job = profile?.title || profile?.functions.join('、');
  const roleDescription = profileFailed ? '岗位信息暂未加载，发送时将自动读取' : job
    ? `参考岗位：${job} · AI 自动适配专业视角`
    : profile ? '尚未填写岗位，先以通用视角协助你；可在账号中心补充' : '正在读取岗位信息…';

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="ai-assistant-heading" className="fixed z-[100] right-3 sm:right-5 top-16 bottom-4 w-[calc(100vw-24px)] sm:w-[440px] flex flex-col overflow-hidden rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-[#1a1c20] shadow-modal pointer-events-auto">
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line-subtle dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light dark:bg-blue-950/50 text-brand"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 id="ai-assistant-heading" className="text-sm font-semibold text-content dark:text-zinc-100">AI 助手</h2>
            <p className="mt-0.5 text-[11px] text-content-tertiary">提问、整理内容、操作画布</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} disabled={loading || !messages.length} title="清空对话" aria-label="清空对话" className="p-2 rounded-lg text-content-tertiary hover:bg-surface-hover dark:hover:bg-zinc-800 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          <button onClick={onClose} title="关闭 AI 助手" aria-label="关闭 AI 助手" className="p-2 rounded-lg text-content-tertiary hover:bg-surface-hover dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
      </header>
      {enterprise && <div className="px-4 py-2.5 border-b border-line-subtle dark:border-zinc-800 bg-page/50 dark:bg-zinc-900/40">
        <p className="text-xs text-content-secondary dark:text-zinc-300">{roleLabel ? `当前专业视角：${roleLabel}` : '根据岗位自动适配'}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-content-tertiary">{roleDescription}</p>
      </div>}
      <div ref={scrollRef} role="log" aria-label="与 AI 助手的对话" className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-page/40 dark:bg-zinc-950/30">
        {!messages.length && <div className="py-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light dark:bg-blue-950/40 text-brand"><Bot className="h-6 w-6" /></span>
          <p className="text-sm font-medium text-content dark:text-zinc-100">从一个问题，或一句指令开始</p>
          <p className="mt-2 text-xs leading-relaxed text-content-tertiary">结合当前文档回答，也能帮你创建、修改和整理卡片。<br />提问与操作可以在同一段对话中继续。</p>
          <div className="mt-5 grid gap-2 text-left">
            {(enterprise ? ENTERPRISE_STARTERS : PERSONAL_STARTERS).map(prompt => <button key={prompt} onClick={() => submit(prompt)} className="rounded-xl border border-line dark:border-zinc-700/80 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs text-content-secondary dark:text-zinc-300 hover:border-brand hover:bg-brand-light dark:hover:bg-blue-950/30 transition-colors">{prompt}</button>)}
          </div>
        </div>}
        {messages.map((message, index) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[94%] min-w-0 ${message.role === 'user' ? 'bg-brand text-white rounded-2xl rounded-br-sm px-3.5 py-2.5' : 'w-full bg-white dark:bg-zinc-800 text-content dark:text-zinc-100 rounded-2xl rounded-bl-sm border border-line dark:border-zinc-700/80 px-3.5 py-3'}`}>
            <div className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${message.error ? 'text-red-600 dark:text-red-400' : ''}`}>{message.content || (loading && index === messages.length - 1 ? <span className="inline-flex items-center gap-2 text-xs text-content-tertiary"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在思考…</span> : '')}</div>
            {!!message.operations?.length && <div className="mt-2 space-y-1.5 border-t border-line-subtle dark:border-zinc-700 pt-2">
              {message.operations.map((operation, operationIndex) => <p key={operationIndex} className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{operation}</span></p>)}
            </div>}
            {message.role === 'assistant' && message.content && !message.error && !message.operations?.length && !(loading && index === messages.length - 1) && <div className="mt-3 space-y-2">
              {!!message.suggestions?.length && <div className="flex flex-wrap gap-1.5">{message.suggestions.map((suggestion, suggestionIndex) => <button key={suggestionIndex} disabled={loading} onClick={() => submit(suggestion.command, message)} className="rounded-lg border border-line dark:border-zinc-700 px-2 py-1.5 text-xs text-content-secondary hover:text-brand hover:border-brand disabled:opacity-40">{suggestion.label}</button>)}</div>}
              <button onClick={() => saveReply(message)} disabled={loading || message.saved} className="inline-flex items-center gap-1.5 text-xs text-brand disabled:opacity-60">{message.saved ? <Check className="h-3.5 w-3.5" /> : <FilePlus2 className="h-3.5 w-3.5" />}{message.saved ? '已加入画布' : '保存为卡片'}</button>
            </div>}
          </div>
        </div>)}
      </div>
      <footer className="border-t border-line-subtle dark:border-zinc-800 p-3">
        <p className="mb-2 text-[11px] text-content-tertiary">{selectedCount ? `参考当前文档 · 已选 ${selectedCount} 张卡片` : '参考当前文档'} · 画布修改可用撤销恢复</p>
        <div className="rounded-xl border border-line dark:border-zinc-700 bg-page dark:bg-zinc-800 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 p-2">
          <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="问点什么，或告诉我如何调整画布…" aria-label="向 AI 助手提问或发送画布指令" rows={2} className="w-full resize-none bg-transparent p-1 text-sm leading-relaxed text-content dark:text-zinc-100 outline-none placeholder-content-tertiary" />
          <div className="flex items-center justify-between gap-2">
            <span className="pl-1 text-[10px] text-content-tertiary">Enter 发送 · Shift+Enter 换行</span>
            <div className="flex items-center gap-1">
              {isSupported && <button onClick={isListening ? stopListening : startListening} disabled={loading} aria-label={isListening ? '停止语音输入' : '语音输入'} title={isListening ? '停止语音输入' : '语音输入'} className={`p-2 rounded-lg hover:bg-surface-hover dark:hover:bg-zinc-700 ${isListening ? 'text-red-500' : 'text-content-tertiary'}`}>{isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>}
              {loading ? <button onClick={stop} title="停止生成" aria-label="停止生成" className="rounded-lg bg-brand p-2 text-white"><Square className="h-4 w-4" /></button> : <button onClick={() => submit()} disabled={!input.trim()} title="发送" aria-label="发送" className="rounded-lg bg-brand hover:bg-brand-hover p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>
        {speechError && <p role="status" className="mt-1.5 text-xs text-red-500">语音输入暂不可用，请使用文字输入。</p>}
      </footer>
    </section>
  );
}
