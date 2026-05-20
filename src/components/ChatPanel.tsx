'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, User, Bot, ChevronDown } from 'lucide-react';
import { useChat } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import type { ChatMessageItem, ChatContextItem } from '@/lib/ai';

const ROLE_PRESETS = [
  { key: '专业产品经理', label: '产品经理', color: 'bg-blue-500' },
  { key: '专业投资人', label: '投资人', color: 'bg-green-500' },
  { key: '专业工程师', label: '工程师', color: 'bg-purple-500' },
  { key: '专业数据分析师', label: '数据分析师', color: 'bg-orange-500' },
];

interface ChatPanelProps { isOpen: boolean; onClose: () => void; }

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [rolePreset, setRolePreset] = useState('专业产品经理');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<ChatContextItem[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, execute } = useChat();
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
      workflow: ['作者'],
      currentRole: rolePreset,
      rolePreset,
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
    <div className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">AI 对话</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* 角色选择 */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-sm text-gray-700 dark:text-zinc-300"
            >
              <span className={`w-2 h-2 rounded-full ${currentRole.color}`} />
              {currentRole.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showRoleDropdown && (
              <div className="absolute z-10 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg">
                {ROLE_PRESETS.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => { setRolePreset(role.key); setShowRoleDropdown(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 w-full text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${role.color}`} />
                    {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>选择角色后开始对话</p>
              <p className="text-xs mt-1">AI 会结合当前文档内容回答</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-500" />
                </div>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl rounded-bl-md">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          {error && <div className="text-xs text-red-500 text-center">{error}</div>}
        </div>

        {/* 输入 */}
        <div className="p-3 border-t border-gray-200 dark:border-zinc-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="输入问题..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
