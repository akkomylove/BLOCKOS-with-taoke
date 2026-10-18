'use client';

import { useState, useEffect } from 'react';
import { useAccountStore } from '@/store/accountStore';
import {
  X, BookOpen, Zap, HelpCircle, Settings, Key, Globe, Cpu,
  Sparkles, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  Type, CheckSquare, Code, Table, ImageIcon, Quote, ChevronRight as ChevronRightIcon,
  Search, Tag, History, Link2, Wand2, Palette, Lightbulb,
  Users, BarChart3, UserCircle, FileText, ExternalLink,
  Terminal, Copy, Check, Plus, Trash2, Loader2, ShieldCheck, AlertCircle
} from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTour?: () => void;
}

const TABS = [
  { id: 'guide', label: '使用指南', icon: BookOpen, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'ai', label: 'AI 功能', icon: Zap, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'mcp', label: 'MCP 智能体接入', icon: Terminal, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'settings', label: '设置', icon: Settings, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
];

const BLOCK_TYPES = [
  { icon: Type, label: '文本', desc: '富文本编辑，支持格式、字体、AI 续写', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: CheckSquare, label: '待办', desc: '可勾选的任务清单', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Code, label: '代码', desc: '多语言代码块，支持实时代码运行', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Table, label: '表格', desc: '结构化数据，支持多种列类型', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: ImageIcon, label: '媒体', desc: '图片、视频、音频、文件链接', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { icon: Quote, label: '引用', desc: '引用文本块', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { icon: ChevronRightIcon, label: '折叠', desc: '可展开/折叠的内容块', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
];

const FEATURES = [
  { icon: Search, title: '全文搜索', desc: '按内容、类型、标签快速定位 Block。支持 Ctrl+K / Cmd+K 唤起搜索面板。' },
  { icon: Tag, title: '标签系统', desc: '为 Block 添加标签（工作/个人/重要/待办/灵感/笔记），左侧导航栏可按标签筛选。' },
  { icon: History, title: '版本历史', desc: '自动保存每次编辑的版本，可随时撤销、重做或恢复到任意历史状态。' },
  { icon: Link2, title: 'Block 关联', desc: '通过链接建立 Block 之间的引用关系，关系视图可直观查看数据流向。' },
  { icon: Palette, title: '主题切换', desc: '支持深色/浅色主题切换，所有 Block 和 UI 自动适配。' },
  { icon: Wand2, title: 'AI 自动补全', desc: '在文本 Block 中输入内容后等待 1.5 秒，AI 会自动提示续写内容，按 Tab 接受。' },
  { icon: Users, title: '团队管理', desc: '创建团队、添加成员、分配角色。团队详情面板可查看成员职能和项目参与情况。' },
  { icon: BarChart3, title: '项目协作', desc: '项目看板（待办/进行中/已完成）、甘特图、里程碑追踪，支持 AI 自动导入计划书并切分任务。' },
  { icon: UserCircle, title: '个人中心', desc: '设置个人信息、职务职能，查看跨项目任务分配情况。' },
];

function AccordionItem({ icon: Icon, title, children, defaultOpen = false }: { icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#dee0e3] dark:border-[#2e3238] rounded-xl overflow-hidden bg-white dark:bg-[#1f2125] transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#252830] transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-[#eff4ff] dark:bg-[#3370ff]/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#3370ff] dark:text-[#5b8cff]" />
        </div>
        <span className="text-sm font-medium text-[#1f2329] dark:text-[#f7f8fa] flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[#8f959e]" /> : <ChevronDown className="w-4 h-4 text-[#8f959e]" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#eff0f2] dark:border-[#24272e] pt-3">{children}</div>}
    </div>
  );
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: number;
}

export default function HelpPanel({ isOpen, onClose, onRestartTour }: HelpPanelProps) {
  const enterprise = useAccountStore(state => state.user?.mode === 'enterprise');
  const [activeTab, setActiveTab] = useState('guide');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // API Key 凭据管理状态
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedRawKey, setNewlyCreatedRawKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/open/keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // 忽略请求异常
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'mcp') {
      fetchApiKeys();
    }
  }, [isOpen, activeTab]);

  const handleGenerateApiKey = async () => {
    setGeneratingKey(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/open/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim() || 'My External Agent Key',
          permissions: ['read', 'write'],
          ttlDays: 90
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '生成密钥失败');
      }
      setNewlyCreatedRawKey(data.rawKey);
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setKeyError(msg || '生成失败，请确认您已登录账户');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!window.confirm('确定要注销并废除该 API Key 吗？废除后使用此密钥的 Agent 将无法再访问您的画布。')) {
      return;
    }
    try {
      const res = await fetch(`/api/open/keys?id=${encodeURIComponent(keyId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchApiKeys();
        if (newlyCreatedRawKey) setNewlyCreatedRawKey(null);
      }
    } catch (err) {
      console.error('Revoke key error:', err);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#1a1c20] border border-[#dee0e3] dark:border-[#2e3238] rounded-2xl shadow-modal overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eff0f2] dark:border-[#24272e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] dark:bg-[#3370ff]/15 border border-[#3370ff]/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-[#3370ff] dark:text-[#5b8cff]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1f2329] dark:text-[#f7f8fa]">帮助中心</h2>
              <p className="text-[11px] text-[#8f959e]">BlockOS 使用指南与设置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#f0f2f5] dark:hover:bg-[#252830] rounded-lg transition-colors text-[#646a73] dark:text-[#8f959e]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-[#eff0f2] dark:border-[#24272e] px-4 gap-1 bg-white dark:bg-[#1a1c20]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-medium transition-all border-b-2 -mb-px ${
                  isActive
                    ? 'text-[#3370ff] dark:text-[#5b8cff] border-[#3370ff] dark:border-[#5b8cff]'
                    : 'text-[#646a73] dark:text-[#8f959e] border-transparent hover:text-[#1f2329] dark:hover:text-[#f7f8fa]'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isActive ? 'bg-[#eff4ff] dark:bg-[#3370ff]/20 text-[#3370ff] dark:text-[#5b8cff]' : 'bg-[#f0f2f5] dark:bg-[#252830] text-[#646a73] dark:text-[#8f959e]'}`}>
                  <tab.icon className="w-3 h-3" />
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f7f8fa] dark:bg-[#141517]">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#eff4ff] dark:bg-[#3370ff]/10 border border-[#3370ff]/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#3370ff] dark:text-[#5b8cff]" />
                    <h3 className="text-sm font-semibold text-[#1f2329] dark:text-[#f7f8fa]">快速开始</h3>
                  </div>
                  {onRestartTour && (
                    <button
                      onClick={onRestartTour}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3370ff] hover:bg-[#215fe9] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      重新启动新手交互引导
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#646a73] dark:text-[#8f959e] leading-relaxed">
                  BlockOS 是一个 AI 原生的知识操作系统。在画布上创建不同类型的 Block 来自由组织想法，所有数据自动保存到本地。
                  点击任意 Block 顶部标题栏可自由移动，悬停点击右侧 Sparkles (✨) 按钮可使用 AI 功能。
                </p>
              </div>

              <AccordionItem icon={Type} title="Block 类型">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((bt) => (
                    <div key={bt.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bt.bg} ${bt.color} border ${bt.border}`}>
                        <bt.icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-900 dark:text-zinc-200 font-medium">{bt.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-500">{bt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionItem>

              <AccordionItem icon={Sparkles} title="核心功能">
                <div className="space-y-3">
                  {FEATURES.filter(f => enterprise || !['团队管理', '项目协作'].includes(f.title)).map((feature) => {
                    const f = feature.title === '个人中心' ? { ...feature, title: '账号中心', desc: '管理昵称、简介、密码与使用模式，切换模式时保留已有内容。' } : feature;
                    return (
                    <div key={f.title} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <f.icon className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-200">{f.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ); })}
                </div>
              </AccordionItem>

              <AccordionItem icon={Link2} title="父子关系与关联">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                  拖入 Block 使其成为子 Block，父 Block 可折叠/展开。通过关系视图可查看 Block 之间的连接。
                  选中 Block 后点击工具栏的链接按钮，可建立 Block 之间的引用关系。
                </p>
              </AccordionItem>

              <AccordionItem icon={Tag} title="标签与导航">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                  选中 Block 后点击标签按钮，从圆盘中选择标签（工作、个人、重要、待办、灵感、笔记、其他）。
                  左侧导航栏的标签页可按标签筛选 Block，快速定位相关内容。
                </p>
              </AccordionItem>

              <AccordionItem icon={FileText} title="说明文档">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-3">
                  查看 BlockOS 参赛说明文档，了解项目背景、功能介绍和技术实现。
                </p>
                <button
                  onClick={() => window.open('/FDoc-赛道四-曹琅+杜诺琦+伍菲琪_说明文档(1).pdf', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  查看说明文档 (PDF)
                  <ExternalLink className="w-3 h-3" />
                </button>
              </AccordionItem>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <AccordionItem icon={Zap} title="AI Agent">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-3">
                  AI 助手是 BlockOS 的 Agent 核心。输入自然语言指令，AI 自动判断意图并执行操作：
                  删除/创建/更新 Block、高亮内容、生成文本等。
                </p>
              </AccordionItem>

              <AccordionItem icon={Sparkles} title="支持的操作">
                <div className="space-y-2">
                  {[
                    { label: '删除所有 Block', cmd: '删除所有 Block' },
                    { label: '创建文本 Block', cmd: '创建 3 个文本 Block' },
                    { label: '高亮 Block', cmd: '高亮所有包含风险的 Block' },
                    { label: '生成内容', cmd: '写一篇关于人工智能的介绍' },
                    { label: '更新 Block', cmd: '把第一个 Block 的内容改为...' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                      <ArrowRight className="w-3 h-3 text-gray-400 dark:text-zinc-600 flex-shrink-0" />
                      <span className="text-xs text-gray-800 dark:text-zinc-300">{item.label}</span>
                      <code className="ml-auto text-[10px] text-gray-500 dark:text-zinc-600 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{item.cmd}</code>
                    </div>
                  ))}
                </div>
              </AccordionItem>

              <AccordionItem icon={Wand2} title="Block 专属 AI">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                  选中 Block 后点击右侧 Sparkles 按钮可使用类型专属 AI：文本总结/改写/扩展，代码解释/优化，表格数据分析。
                </p>
              </AccordionItem>

              <AccordionItem icon={Zap} title="AI 自动补全">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                  在文本 Block 中输入内容后暂停 1.5 秒，AI 会自动显示续写建议（半透明文字）。按 Tab 键接受建议，继续输入则忽略。
                  可在文本 Block 的工具栏中开启/关闭此功能。
                </p>
              </AccordionItem>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Model Context Protocol (MCP) 开放互通协议</h3>
                </div>
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                  BlockOS 已全面打通 Model Context Protocol (MCP) 标准协议。任何外部 AI Agent（如 Cursor、Claude Desktop、LangChain、AutoGPT 或 Python 脚本）均可作为独立协同者直接接入，自动化读取画布全局结构、编排 Block 卡片与自适应挂载子 Block 层级。
                </p>
              </div>

              <AccordionItem icon={Terminal} title="方式一：Cursor / Claude Desktop 客户端配置 (stdio 协议)" defaultOpen>
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-2">
                  将以下配置填入 Claude Desktop (<code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">claude_desktop_config.json</code>) 或 Cursor (<code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">.cursor/mcp.json</code>) 的 <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">mcpServers</code> 字段中：
                </p>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <button
                    onClick={() => copyToClipboard(`{\n  "mcpServers": {\n    "blockos": {\n      "command": "node",\n      "args": [\n        "<your-project-path>/scripts/blockos-mcp-stdio.js"\n      ],\n      "env": {\n        "BLOCKOS_URL": "https://blockos.hiakkocv.xyz/api/open/v1/mcp",\n        "BLOCKOS_API_KEY": "your_blockos_api_key_here"\n      }\n    }\n  }\n}`, 'mcp-config')}
                    className="absolute top-2.5 right-2.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copiedSection === 'mcp-config' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedSection === 'mcp-config' ? '已复制' : '复制配置'}
                  </button>
                  <pre>{`{
  "mcpServers": {
    "blockos": {
      "command": "node",
      "args": [
        "<your-project-path>/scripts/blockos-mcp-stdio.js"
      ],
      "env": {
        "BLOCKOS_URL": "https://blockos.hiakkocv.xyz/api/open/v1/mcp",
        "BLOCKOS_API_KEY": "your_blockos_api_key_here"
      }
    }
  }
}`}</pre>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-2">
                  * 注：请将 <code className="font-mono text-indigo-500">&lt;your-project-path&gt;</code> 替换为您本地项目的实际绝对路径。
                </p>
              </AccordionItem>

              <AccordionItem icon={Code} title="方式二：自研 Agent / Python / HTTP JSON-RPC 接入">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-2">
                  外部自研脚本或 LangChain Agent 可直接向线上开放接口发起标准 HTTP POST 请求：
                </p>
                <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400 mb-2">
                  <div><strong>Endpoint:</strong> <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-500 font-mono">POST https://blockos.hiakkocv.xyz/api/open/v1/mcp</code></div>
                  <div><strong>Header:</strong> <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-500 font-mono">Authorization: Bearer your_blockos_api_key_here</code></div>
                </div>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <button
                    onClick={() => copyToClipboard(`import requests\n\nres = requests.post(\n    "https://blockos.hiakkocv.xyz/api/open/v1/mcp",\n    headers={\n        "Authorization": "Bearer your_blockos_api_key_here",\n        "Content-Type": "application/json"\n    },\n    json={\n        "jsonrpc": "2.0",\n        "id": 1,\n        "method": "tools/call",\n        "params": {\n            "name": "read_canvas",\n            "arguments": {}\n        }\n    }\n)\nprint(res.json())`, 'python-code')}
                    className="absolute top-2.5 right-2.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copiedSection === 'python-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedSection === 'python-code' ? '已复制' : '复制代码'}
                  </button>
                  <pre>{`import requests

res = requests.post(
    "https://blockos.hiakkocv.xyz/api/open/v1/mcp",
    headers={
        "Authorization": "Bearer your_blockos_api_key_here",
        "Content-Type": "application/json"
    },
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "read_canvas",
            "arguments": {}
        }
    }
)
print(res.json())`}</pre>
                </div>
              </AccordionItem>

              <AccordionItem icon={Cpu} title="MCP 开放工具能力范围说明">
                <div className="space-y-3">
                  <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    当前 MCP 重点打通了<strong>画布知识库与卡片拓扑编排</strong>的核心操作，注册了以下 6 大标准原子工具：
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { name: 'read_canvas', desc: '读取画布所有卡片与层级树 (blockTree)' },
                      { name: 'create_block', desc: '创建单个卡片（可指定 parentId 设为子卡片）' },
                      { name: 'batch_create_hierarchy', desc: '一步批量创建 1 个父 Block 并挂载 N 个子 Block' },
                      { name: 'set_subblock', desc: '将卡片设为子卡片或移出提升为独立卡片' },
                      { name: 'create_link', desc: '在两张卡片之间建立拓扑连接关系' },
                      { name: 'delete_block', desc: '删除指定卡片并安全解耦子卡片（防悬空）' },
                    ].map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                        <code className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">{tool.name}</code>
                        <span className="text-xs text-gray-600 dark:text-zinc-400">{tool.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    💡 <strong>边界说明：</strong>系统后台的敏捷看板任务流转、代码沙箱执行、PDF 导出与团队管理功能当前仍通过标准的 REST API (<code className="font-mono">/api/tasks</code>, <code className="font-mono">/api/projects</code>) 开放，后续将按需增量封装为更多专属 MCP 工具。
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem icon={Key} title="API Key 凭据管理" defaultOpen={true}>
                <div className="space-y-4">
                  <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
                    供 Cursor、Claude Desktop 或自研 Python Agent 鉴权调用。密钥拥有您账户画布的读写控制权限，请妥善保存。
                  </p>

                  {/* 一键生成区域 */}
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-3">
                    <div className="text-xs font-semibold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-indigo-500" />
                      创建新专属 Agent API Key
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="输入密钥用途（例如：Cursor 插件、Claude Desktop）"
                        className="flex-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateApiKey(); }}
                      />
                      <button
                        onClick={handleGenerateApiKey}
                        disabled={generatingKey}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors flex-shrink-0"
                      >
                        {generatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                        {generatingKey ? '生成中...' : '一键生成 Key'}
                      </button>
                    </div>

                    {keyError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{keyError}</span>
                      </div>
                    )}

                    {/* 新生成密钥展示高亮卡片 */}
                    {newlyCreatedRawKey && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            新密钥已签发成功（仅展示一次，请立即复制）：
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700/50 font-mono text-xs text-emerald-700 dark:text-emerald-300 select-all overflow-x-auto">
                            {newlyCreatedRawKey}
                          </code>
                          <button
                            onClick={() => copyToClipboard(newlyCreatedRawKey, 'new-raw-key')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors flex-shrink-0"
                          >
                            {copiedSection === 'new-raw-key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedSection === 'new-raw-key' ? '已复制' : '复制密钥'}
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                          💡 复制后，直接填入上方客户端配置的 <code className="font-mono font-semibold">BLOCKOS_API_KEY</code> 即可立即接入！
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 已签发密钥列表 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                      <span>已签发密钥列表 ({apiKeys.length})</span>
                      <button
                        onClick={fetchApiKeys}
                        className="text-[11px] text-indigo-500 hover:underline"
                      >
                        刷新
                      </button>
                    </div>

                    {loadingKeys ? (
                      <div className="flex items-center justify-center p-4 text-xs text-gray-400 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在加载密钥列表...</span>
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-center text-xs text-gray-400 dark:text-zinc-500">
                        暂无已签发的 API Key，点击上方“一键生成 Key”即可派发。
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {apiKeys.map((k) => (
                          <div
                            key={k.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-900 dark:text-zinc-200">{k.name}</span>
                                <code className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                                  {k.keyPrefix}
                                </code>
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                                创建于：{new Date(k.createdAt).toLocaleDateString()} · 权限：{Array.isArray(k.permissions) ? k.permissions.join(', ') : '读/写'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeApiKey(k.id)}
                              title="注销此密钥"
                              className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionItem>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <AccordionItem icon={Key} title="自定义 API">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-3">
                  配置你自己的 API 密钥以使用自定义模型。留空则使用系统默认的阿里云百炼 API。
                </p>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#2e3238]">
                    <label className="flex items-center gap-2 text-xs text-[#646a73] dark:text-[#8f959e] mb-2">
                      <Key className="w-3 h-3 text-[#3370ff]" />
                      API 密钥
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#f7f8fa] dark:bg-[#141517] border border-[#dee0e3] dark:border-[#2e3238] rounded-lg px-3 py-2 text-sm text-[#1f2329] dark:text-[#f7f8fa] placeholder-[#8f959e] outline-none focus:border-[#3370ff] focus:ring-2 focus:ring-[#3370ff]/10 transition-colors"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#2e3238]">
                    <label className="flex items-center gap-2 text-xs text-[#646a73] dark:text-[#8f959e] mb-2">
                      <Globe className="w-3 h-3 text-[#3370ff]" />
                      基础 URL
                    </label>
                    <input
                      type="text"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                      className="w-full bg-[#f7f8fa] dark:bg-[#141517] border border-[#dee0e3] dark:border-[#2e3238] rounded-lg px-3 py-2 text-sm text-[#1f2329] dark:text-[#f7f8fa] placeholder-[#8f959e] outline-none focus:border-[#3370ff] focus:ring-2 focus:ring-[#3370ff]/10 transition-colors"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#2e3238]">
                    <label className="flex items-center gap-2 text-xs text-[#646a73] dark:text-[#8f959e] mb-2">
                      <Cpu className="w-3 h-3 text-[#3370ff]" />
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="qwen3.6-plus"
                      className="w-full bg-[#f7f8fa] dark:bg-[#141517] border border-[#dee0e3] dark:border-[#2e3238] rounded-lg px-3 py-2 text-sm text-[#1f2329] dark:text-[#f7f8fa] placeholder-[#8f959e] outline-none focus:border-[#3370ff] focus:ring-2 focus:ring-[#3370ff]/10 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveSettings}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#3370ff] hover:bg-[#215fe9] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                      {saved ? '已保存' : '保存设置'}
                    </button>
                    <button
                      onClick={handleClearSettings}
                      className="px-5 py-2.5 bg-[#f0f2f5] dark:bg-[#252830] hover:bg-[#e4e6eb] dark:hover:bg-[#2e3238] text-[#646a73] dark:text-[#8f959e] text-sm font-medium rounded-lg transition-colors"
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
              </AccordionItem>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
