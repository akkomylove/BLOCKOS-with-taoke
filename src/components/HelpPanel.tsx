'use client';

import { useState } from 'react';
import {
  X, BookOpen, Zap, HelpCircle, Settings, Key, Globe, Cpu,
  Sparkles, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  Type, CheckSquare, Code, Table, ImageIcon, Quote, ChevronRight as ChevronRightIcon,
  Search, Tag, History, Link2, Wand2, Palette, Lightbulb,
  Users, BarChart3, UserCircle, FileText, ExternalLink,
  Terminal, Copy, Check
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
    <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-zinc-100 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function HelpPanel({ isOpen, onClose, onRestartTour }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState('guide');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">帮助中心</h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">BlockOS 使用指南与设置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-zinc-700 px-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? `${tab.color} border-current`
                  : 'text-gray-500 dark:text-zinc-500 border-transparent hover:text-gray-800 dark:hover:text-zinc-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-md ${tab.bg} ${tab.color} flex items-center justify-center`}>
                <tab.icon className="w-3 h-3" />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-zinc-950">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">快速开始</h3>
                  </div>
                  {onRestartTour && (
                    <button
                      onClick={onRestartTour}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      重新启动新手交互引导
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed">
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
                  {FEATURES.map((f) => (
                    <div key={f.title} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <f.icon className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-200">{f.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
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

              <AccordionItem icon={Key} title="API Key 凭据管理">
                <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed mb-2">
                  系统采用标准 Bearer Token 鉴权体系：
                </p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span><strong>专属 Key 派发：</strong>可通过发送 <code className="font-mono text-indigo-500">POST /api/open/keys</code> 生成独立的 <code className="font-mono">bk_live_...</code> 密钥，支持权限细分与有效期管理。</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span><strong>安全防护原则：</strong>API Key 享有您账户画布的读写权限，切勿将其硬编码提交至 GitHub 或任何公开渠道。</span>
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
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 mb-2">
                      <Key className="w-3 h-3" />
                      API 密钥
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 mb-2">
                      <Globe className="w-3 h-3" />
                      基础 URL
                    </label>
                    <input
                      type="text"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 mb-2">
                      <Cpu className="w-3 h-3" />
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="qwen3.6-plus"
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveSettings}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                      {saved ? '已保存' : '保存设置'}
                    </button>
                    <button
                      onClick={handleClearSettings}
                      className="px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-400 text-sm rounded-xl transition-colors"
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
