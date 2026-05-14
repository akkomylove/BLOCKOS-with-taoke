'use client';

import { useState } from 'react';
import {
  X, BookOpen, Zap, HelpCircle, Settings,
  Key, Globe, Cpu, Sparkles, ArrowRight, CheckCircle2,
  Type, CheckSquare, Code, Table, ImageIcon, Quote, ChevronRight
} from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'guide', label: '使用指南', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'ai', label: 'AI 功能', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'settings', label: '设置', icon: Settings, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

const BLOCK_TYPES = [
  { icon: Type, label: '文本', desc: '富文本内容，支持多种格式', color: 'text-blue-400' },
  { icon: CheckSquare, label: '待办', desc: '可勾选的任务列表', color: 'text-emerald-400' },
  { icon: Code, label: '代码', desc: '代码片段，支持实时运行', color: 'text-amber-400' },
  { icon: Table, label: '表格', desc: '结构化数据，支持多种列类型', color: 'text-purple-400' },
  { icon: ImageIcon, label: '媒体', desc: '图片、视频、音频', color: 'text-rose-400' },
  { icon: Quote, label: '引用', desc: '引用文本块', color: 'text-cyan-400' },
  { icon: ChevronRight, label: '折叠', desc: '可展开/折叠的内容块', color: 'text-orange-400' },
];

export default function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState('guide');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = () => {
    if (apiKey) localStorage.setItem('blockos-custom-api-key', apiKey);
    if (baseURL) localStorage.setItem('blockos-custom-base-url', baseURL);
    if (model) localStorage.setItem('blockos-custom-model', model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearSettings = () => {
    localStorage.removeItem('blockos-custom-api-key');
    localStorage.removeItem('blockos-custom-base-url');
    localStorage.removeItem('blockos-custom-model');
    setApiKey('');
    setBaseURL('');
    setModel('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">帮助中心</h2>
              <p className="text-[10px] text-zinc-500">BlockOS 使用指南与设置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800/60 px-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? `${tab.color} border-current`
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-md ${tab.bg} flex items-center justify-center`}>
                <tab.icon className="w-3 h-3" />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-zinc-200">快速开始</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  BlockOS 是一个 AI 原生的知识操作系统。创建不同类型的 Block 来组织信息，所有数据自动保存。
                  点击 AI 助手按钮，用自然语言操作 Block。
                </p>
              </div>

              <div>
                <h3 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3 rounded-full bg-blue-400" />
                  Block 类型
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((bt) => (
                    <div key={bt.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bt.color} bg-zinc-900`}>
                        <bt.icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-200 font-medium">{bt.label}</p>
                        <p className="text-[10px] text-zinc-500">{bt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3 rounded-full bg-purple-400" />
                  父子关系
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  拖入 Block 使其成为子 Block，父 Block 可折叠/展开。通过关系视图可查看 Block 之间的连接。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-zinc-200">AI Agent</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  AI 助手是 BlockOS 的 Agent 核心。输入自然语言指令，AI 自动判断意图并执行操作：
                  删除/创建/更新 Block、高亮内容、生成文本等。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
                <h3 className="text-xs font-medium text-zinc-300 mb-3">支持的操作</h3>
                <div className="space-y-2">
                  {[
                    { label: '删除所有 Block', cmd: '删除所有 Block' },
                    { label: '创建文本 Block', cmd: '创建 3 个文本 Block' },
                    { label: '高亮 Block', cmd: '高亮所有包含风险的 Block' },
                    { label: '生成内容', cmd: '写一篇关于人工智能的介绍' },
                    { label: '更新 Block', cmd: '把第一个 Block 的内容改为...' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/50">
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                      <span className="text-xs text-zinc-300">{item.label}</span>
                      <code className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{item.cmd}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
                <h3 className="text-xs font-medium text-zinc-300 mb-2">Block 专属 AI</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  选中 Block 后点击右侧 Sparkles 按钮可使用类型专属 AI：文本总结/改写/扩展，代码解释/优化，表格数据分析。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-zinc-200">自定义 API</h3>
                </div>
                <p className="text-xs text-zinc-400">
                  配置你自己的 API 密钥以使用自定义模型。留空则使用系统默认的 SiliconFlow API。
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                    <Key className="w-3 h-3" />
                    API 密钥
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                    <Globe className="w-3 h-3" />
                    基础 URL
                  </label>
                  <input
                    type="text"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api.siliconflow.cn/v1"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                    <Cpu className="w-3 h-3" />
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Qwen/Qwen3-8B"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                  {saved ? '已保存' : '保存设置'}
                </button>
                <button
                  onClick={handleClearSettings}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors"
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}