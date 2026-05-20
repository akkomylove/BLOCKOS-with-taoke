'use client';

import { useState } from 'react';
import { X, BrainCircuit, Loader2, Send, MessageSquare, AlertTriangle, Lightbulb, FileCheck, ClipboardList, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useCopilot } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import type { CopilotResponse } from '@/lib/ai';

interface CopilotPanelProps { isOpen: boolean; onClose: () => void; }

const MODE_INFO = {
  plan_next: {
    label: '计划',
    title: 'AI 计划助手',
    description: 'AI 通过多轮对话理解你的需求，逐步生成项目计划。',
    scene: '项目启动初期，思路不清晰，需要 AI 协助梳理',
    icon: Lightbulb,
    color: 'purple',
    placeholder: '描述你的项目目标或需求，AI 会逐步追问以完善计划...',
    quickPrompts: [
      '我要开发一个电商小程序',
      '帮我制定一个数据迁移方案',
      '设计一个用户增长策略',
    ],
  },
  plan_finalize: {
    label: '定稿',
    title: 'AI 定稿助手',
    description: '基于已有内容和对话历史，生成完整的项目计划文档。',
    scene: '需求已明确，需要输出标准化的计划文档',
    icon: FileCheck,
    color: 'blue',
    placeholder: '基于之前的对话，AI 将生成完整的项目计划文档...',
    quickPrompts: [],
  },
  critique_generate: {
    label: '审阅',
    title: 'AI 审阅助手',
    description: 'AI 对当前文档进行质量检查，发现潜在问题和风险。',
    scene: '文档完成初稿，需要进行质量把关',
    icon: ClipboardList,
    color: 'amber',
    placeholder: 'AI 将从完整性、准确性、可行性三个维度审阅文档...',
    quickPrompts: [],
  },
} as const;

export default function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
  const [action, setAction] = useState<'plan_next' | 'plan_finalize' | 'critique_generate'>('plan_next');
  const [userMessage, setUserMessage] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const { loading, error, execute } = useCopilot();
  const blocks = useBlockStore((state) => state.blocks);

  const mode = MODE_INFO[action];
  const colorClass = {
    purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', ring: 'focus:ring-purple-500/20', border: 'border-purple-200 dark:border-purple-800' },
    blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', ring: 'focus:ring-blue-500/20', border: 'border-blue-200 dark:border-blue-800' },
    amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', ring: 'focus:ring-amber-500/20', border: 'border-amber-200 dark:border-amber-800' },
  }[mode.color];

  const handleSubmit = async () => {
    const content = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
    const res = await execute({ action, documentName: '当前文档', documentContent: content.slice(0, 5000), workflow: ['作者', '审阅者'], userMessage: userMessage || undefined, qaHistory: qaHistory.length > 0 ? qaHistory : undefined });
    if (res) {
      setResult(res);
      if (action === 'plan_next' && 'nextQuestion' in res && res.nextQuestion) {
        setQaHistory((prev) => [...prev, { question: userMessage || '开始计划', answer: res.understandingSummary }]);
      }
    }
  };

  const handleModeChange = (newAction: typeof action) => {
    setAction(newAction);
    setResult(null);
    setUserMessage('');
  };

  const applyQuickPrompt = (prompt: string) => {
    setUserMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">AI Copilot</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* 模式切换 */}
          <div className="flex gap-2">
            {(['plan_next', 'plan_finalize', 'critique_generate'] as const).map((key) => (
              <button
                key={key}
                onClick={() => handleModeChange(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  action === key
                    ? `${colorClass.bg} text-white`
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                {MODE_INFO[key].label}
              </button>
            ))}
          </div>

          {/* 功能说明卡片 */}
          <div className={`${colorClass.light} rounded-lg border ${colorClass.border}`}>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <mode.icon className={`w-4 h-4 ${colorClass.text}`} />
                <span className={`text-sm font-medium ${colorClass.text}`}>{mode.title}</span>
              </div>
              {showGuide ? <ChevronUp className={`w-4 h-4 ${colorClass.text}`} /> : <ChevronDown className={`w-4 h-4 ${colorClass.text}`} />}
            </button>
            {showGuide && (
              <div className="px-4 pb-3 space-y-2">
                <p className="text-sm text-gray-700 dark:text-zinc-300">{mode.description}</p>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-zinc-500">适用场景：{mode.scene}</span>
                </div>
              </div>
            )}
          </div>

          {/* 对话历史（计划模式） */}
          {action === 'plan_next' && qaHistory.length > 0 && (
            <div className="space-y-2">
              {qaHistory.map((qa, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700">
                  <div className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1">Q{i + 1}: {qa.question}</div>
                  <p className="text-sm text-gray-700 dark:text-zinc-300">{qa.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* 输入区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              {action === 'critique_generate' ? '审阅说明（可选）' : '补充信息'}
            </label>
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder={mode.placeholder}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 ${colorClass.ring} resize-none`}
            />
          </div>

          {/* 快捷输入 */}
          {mode.quickPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mode.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => applyQuickPrompt(prompt)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-600 dark:text-zinc-400 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${colorClass.bg} ${colorClass.hover} disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? '处理中...' : action === 'critique_generate' ? '生成审阅' : action === 'plan_finalize' ? '生成定稿' : '生成计划'}
          </button>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* 结果展示 */}
          {result && result.action === 'critique_generate' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 审阅概览</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{result.overview}</p>
              </div>
              {result.issues.map((issue) => (
                <div key={issue.id} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${issue.severity === 'high' ? 'bg-red-100 text-red-700' : issue.severity === 'low' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{issue.severity}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{issue.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{issue.reason}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">建议：{issue.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {result && (result.action === 'plan_next' || result.action === 'plan_finalize') && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 理解摘要</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{'understandingSummary' in result ? result.understandingSummary : result.summary}</p>
              </div>
              {'draftMarkdown' in result && result.draftMarkdown && <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"><h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">草稿</h3><pre className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{result.draftMarkdown}</pre></div>}
              {'finalMarkdown' in result && result.finalMarkdown && <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"><h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">最终计划</h3><pre className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{result.finalMarkdown}</pre></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
