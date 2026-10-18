'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, User, Bot, ChevronDown } from 'lucide-react';
import { useChat } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import { useAccountStore } from '@/store/accountStore';
import { PERSONAL_CHAT_PRESET } from '@/config/ai-modes';
import type { ChatMessageItem, ChatContextItem } from '@/lib/ai';

const ROLE_PRESETS = [
  { key: '专业产品经理', label: '产品经理', color: 'bg-blue-500' },
  { key: '专业投资人', label: '投资人', color: 'bg-green-500' },
  { key: '专业工程师', label: '工程师', color: 'bg-purple-500' },
  { key: '专业数据分析师', label: '数据分析师', color: 'bg-orange-500' },
];

interface ChatPanelProps { isOpen: boolean; onClose: () => void; }

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const enterprise = useAccountStore((state) => state.user?.mode === 'enterprise');
  const [rolePreset, setRolePreset] = useState('专业产品经理');
  const effectiveRole = enterprise ? rolePreset : PERSONAL_CHAT_PRESET;
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [selectedContexts] = useState<ChatContextItem[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { loading, error, execute } = useChat();
  const blocks = useBlockStore((state) => state.blocks);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const newMessages: ChatMessageItem[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');

    const content = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');

    const res = await execute({
      documentName: '当前文档',
      documentSummary: content.slice(0, 500),
      workflow: enterprise ? ['作者'] : [],
      currentRole: effectiveRole,
      rolePreset: effectiveRole,
      selectedContexts,
      messages: newMessages,
      userMessage: userMsg,
    });

    if (res) {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.assistantMessage }]);
    }
  };

  const currentRole = ROLE_PRESETS.find((r) => r.key === rolePreset) || ROLE_PRESETS[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-4 sm:pr-6 pointer-events-none">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-xs pointer-events-auto transition-opacity" onClick={onClose} />
      <div className="pointer-events-auto relative bg-white dark:bg-[#1a1c20] rounded-2xl shadow-modal w-full max-w-md max-h-[82vh] overflow-hidden flex flex-col border border-line dark:border-zinc-800 transition-all">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle dark:border-zinc-800 bg-white dark:bg-[#1a1c20]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-light dark:bg-blue-950/50 flex items-center justify-center text-brand">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-content dark:text-zinc-100">AI 对话助手</h2>
              <p className="text-[11px] text-content-tertiary dark:text-zinc-500">基于当前画布内容上下文协同</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary transition-colors"
            title="关闭对话"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 角色选择 */}
        {enterprise && (
          <div className="px-4 py-2 border-b border-line-subtle dark:border-zinc-800 bg-page/50 dark:bg-zinc-900/50">
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700/80 hover:bg-surface-hover rounded-lg text-xs font-medium text-content-secondary dark:text-zinc-300 transition-colors shadow-xs"
              >
                <span className={`w-2 h-2 rounded-full ${currentRole.color}`} />
                {currentRole.label}
                <ChevronDown className="w-3 h-3 text-content-tertiary" />
              </button>
              {showRoleDropdown && (
                <div className="absolute z-10 mt-1.5 w-44 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl shadow-popover py-1">
                  {ROLE_PRESETS.map((role) => (
                    <button
                      key={role.key}
                      onClick={() => { setRolePreset(role.key); setShowRoleDropdown(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-hover dark:hover:bg-zinc-700/60 w-full text-left text-content-secondary dark:text-zinc-200 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full ${role.color}`} />
                      {role.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3 min-h-0 bg-page/40 dark:bg-zinc-950/40">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-content dark:text-zinc-200">
                {enterprise ? '选择角色后开始对话' : '直接提问，或让我帮你整理思路'}
              </p>
              <p className="text-xs text-content-tertiary dark:text-zinc-500 mt-1">
                AI 会实时结合当前文档与画布节点内容回答
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-brand-light dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 mt-0.5 text-brand shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-2xl rounded-br-sm shadow-xs font-normal'
                    : 'bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700/80 text-content dark:text-zinc-100 rounded-2xl rounded-bl-sm shadow-xs'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-surface-hover dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-content-secondary shadow-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-brand-light dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-brand">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700/80 rounded-2xl rounded-bl-sm shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
              </div>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg p-2 text-center">
              {error}
            </div>
          )}
        </div>

        {/* 输入 */}
        <div className="p-3 border-t border-line-subtle dark:border-zinc-800 bg-white dark:bg-[#1a1c20]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="输入问题或协同需求..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-line dark:border-zinc-700 bg-page dark:bg-zinc-800 text-xs sm:text-sm text-content dark:text-zinc-100 placeholder-content-tertiary outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active disabled:opacity-40 text-white rounded-xl transition-all shadow-xs flex items-center justify-center"
              title="发送"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
