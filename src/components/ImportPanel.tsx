'use client';

import { X, Upload, FileText, Table, ImageIcon, Loader2, CheckCircle2, FileUp, FileCode2, AlertCircle } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import { useState, useRef } from 'react';

interface ImportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'json' | 'markdown' | 'csv' | 'image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 安全防护

const tabs: { key: TabType; label: string; icon: typeof FileText; desc: string; accept: string }[] = [
  { key: 'json', label: 'BlockOS JSON', icon: FileCode2, desc: '导入结构化画幅数据 (.json)', accept: '.json' },
  { key: 'markdown', label: 'Markdown', icon: FileText, desc: '导入 .md 文档或粘贴内容', accept: '.md,.markdown' },
  { key: 'csv', label: 'CSV 表格', icon: Table, desc: '导入 .csv 表格或粘贴内容', accept: '.csv' },
  { key: 'image', label: '图片', icon: ImageIcon, desc: '拖放或选择图片文件', accept: 'image/*' },
];

export default function ImportPanel({ isOpen, onClose }: ImportPanelProps) {
  const importFromMarkdown = useBlockStore((state) => state.importFromMarkdown);
  const importFromCsv = useBlockStore((state) => state.importFromCsv);
  const importFromJson = useBlockStore((state) => state.importFromJson);
  const importImage = useBlockStore((state) => state.importImage);

  const [activeTab, setActiveTab] = useState<TabType>('json');
  const [jsonContent, setJsonContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escape key to close
  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`文件大小 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过 10MB 限制，请上传较小文件`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    if (activeTab === 'image') {
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          importImage(result, file.name);
          setSuccess(true);
          setImportMessage('图片已成功插入画布并同步云端');
          setTimeout(() => {
            setSuccess(false);
            setImportMessage(null);
            setFileName('');
            onClose();
          }, 800);
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (activeTab === 'json') setJsonContent(result);
        else if (activeTab === 'markdown') setTextContent(result);
        else if (activeTab === 'csv') setCsvContent(result);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = () => {
    setErrorMessage(null);
    setLoading(true);

    setTimeout(() => {
      try {
        if (activeTab === 'json') {
          if (!jsonContent.trim()) {
            setErrorMessage('请输入或上传 JSON 内容');
            setLoading(false);
            return;
          }
          const result = importFromJson(jsonContent.trim(), importMode);
          if (result.success) {
            setSuccess(true);
            setImportMessage(`成功导入 ${result.count} 个 Block (${importMode === 'replace' ? '覆盖画布' : '追加到末尾'})`);
            setTimeout(() => {
              setSuccess(false);
              setImportMessage(null);
              setJsonContent('');
              setFileName('');
              onClose();
            }, 800);
          } else {
            setErrorMessage(result.error || 'JSON 解析或校验失败');
          }
        } else if (activeTab === 'markdown' && textContent.trim()) {
          importFromMarkdown(textContent);
          setSuccess(true);
          setImportMessage('Markdown 导入成功');
          setTimeout(() => {
            setSuccess(false);
            setImportMessage(null);
            setTextContent('');
            setFileName('');
            onClose();
          }, 800);
        } else if (activeTab === 'csv' && csvContent.trim()) {
          importFromCsv(csvContent);
          setSuccess(true);
          setImportMessage('CSV 表格导入成功');
          setTimeout(() => {
            setSuccess(false);
            setImportMessage(null);
            setCsvContent('');
            setFileName('');
            onClose();
          }, 800);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '导入过程出现异常';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`文件大小 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过 10MB 限制，请上传较小文件`);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (file.type.startsWith('image/')) {
        importImage(result, file.name);
        setActiveTab('image');
      } else if (file.name.endsWith('.json')) {
        setJsonContent(result);
        setActiveTab('json');
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        setTextContent(result);
        setActiveTab('markdown');
      } else if (file.name.endsWith('.csv')) {
        setCsvContent(result);
        setActiveTab('csv');
      }
    };
    if (file.type.startsWith('image/')) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">导入内容</h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">支持拖放文件或粘贴内容 (上限 10MB)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-1 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setErrorMessage(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm'
                    : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示横幅 */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 成功提示横幅 */}
        {success && importMessage && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importMessage}</span>
          </div>
        )}

        <div className="p-5">
          {activeTab !== 'image' && (
            <>
              <div className="mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300/60 dark:border-zinc-700/60 hover:border-blue-500/30 bg-gray-50/30 dark:bg-zinc-900/30 hover:bg-gray-100/50 dark:hover:bg-zinc-900/50 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-700 dark:text-zinc-300">
                      {fileName ? fileName : `点击选择 ${currentTab.label} 文件`}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-0.5">或拖放文件到此处 (上限 10MB)</p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={currentTab.accept}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                <span className="text-[10px] text-gray-400 dark:text-zinc-600">或粘贴内容</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
              </div>
            </>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 px-1">
                <span>导入模式:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="jsonMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-500"
                    />
                    <span>覆盖当前画布</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="jsonMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-500"
                    />
                    <span>追加到末尾</span>
                  </label>
                </div>
              </div>
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder='在此粘贴 BlockOS JSON 内容，例如 {"blocks": [...]} ...'
                className="w-full h-36 bg-gray-100/50 dark:bg-zinc-800/50 border border-gray-300/60 dark:border-zinc-700/60 rounded-xl p-3 text-xs text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none font-mono"
              />
              <button
                onClick={handleImport}
                disabled={!jsonContent.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-sm font-medium hover:from-blue-500/25 hover:to-purple-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <FileCode2 className="w-4 h-4" />}
                {success ? '导入完成' : loading ? '解析导入中...' : '导入 BlockOS JSON'}
              </button>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-3">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="# 在此粘贴 Markdown 内容..."
                className="w-full h-36 bg-gray-100/50 dark:bg-zinc-800/50 border border-gray-300/60 dark:border-zinc-700/60 rounded-xl p-3 text-sm text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none font-mono"
              />
              <button
                onClick={handleImport}
                disabled={!textContent.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-sm font-medium hover:from-blue-500/25 hover:to-purple-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
                {success ? '导入完成' : loading ? '导入中...' : '导入 Markdown'}
              </button>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-3">
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="姓名,年龄,城市&#10;张三,28,北京&#10;李四,32,上海"
                className="w-full h-36 bg-gray-100/50 dark:bg-zinc-800/50 border border-gray-300/60 dark:border-zinc-700/60 rounded-xl p-3 text-sm text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-emerald-500/40 transition-colors resize-none font-mono"
              />
              <button
                onClick={handleImport}
                disabled={!csvContent.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-sm font-medium hover:from-emerald-500/25 hover:to-teal-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Table className="w-4 h-4" />}
                {success ? '导入完成' : loading ? '导入中...' : '导入 CSV 表格'}
              </button>
            </div>
          )}

          {activeTab === 'image' && (
            <div
              className="border-2 border-dashed border-gray-300/60 dark:border-zinc-700/60 rounded-xl p-12 text-center hover:border-blue-500/30 transition-colors cursor-pointer bg-gray-50/30 dark:bg-zinc-900/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-gray-400 dark:text-zinc-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">拖放图片到此处</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600">支持 JPG、PNG、GIF、WebP、SVG (上限 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}