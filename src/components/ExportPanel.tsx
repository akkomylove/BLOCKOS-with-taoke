'use client';

import { X, Download, FileCode, FileText, FileImage, Loader2, CheckCircle2 } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import { useState } from 'react';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportPanel({ isOpen, onClose }: ExportPanelProps) {
  const exportToMarkdown = useBlockStore((state) => state.exportToMarkdown);
  const exportToHtml = useBlockStore((state) => state.exportToHtml);
  const currentPageId = useBlockStore((state) => state.currentPageId);
  const pages = useBlockStore((state) => state.pages);
  const blocks = useBlockStore((state) => state.blocks);
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPage = pages.find((p) => p.id === currentPageId);
  const title = currentPage?.title || 'export';

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markDone = (key: string) => {
    setDone(key);
    setTimeout(() => setDone(null), 2000);
  };

  const handleExportMarkdown = () => {
    setExporting('md');
    setTimeout(() => {
      const md = exportToMarkdown();
      triggerDownload(new Blob([md], { type: 'text/markdown' }), `${title}.md`);
      setExporting(null);
      markDone('md');
    }, 300);
  };

  const handleExportHtml = () => {
    setExporting('html');
    setTimeout(() => {
      const html = exportToHtml();
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body { font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 40px; color: #333; line-height: 1.6; font-size: 14px; max-width: 800px; margin: 0 auto; }
h1, h2, h3 { color: #1a1a1a; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
h2 { font-size: 20px; }
h3 { font-size: 16px; }
p { margin: 0.5em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace; font-size: 12px; }
pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace; font-size: 12px; }
blockquote { border-left: 3px solid #ccc; padding-left: 12px; margin: 1em 0; color: #666; font-style: italic; }
img { max-width: 100%; height: auto; }
hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
li { margin: 0.25em 0; }
</style>
</head>
<body>${html}</body>
</html>`;
      triggerDownload(new Blob([fullHtml], { type: 'text/html' }), `${title}.html`);
      setExporting(null);
      markDone('html');
    }, 300);
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    const html = exportToHtml();
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, title }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      triggerDownload(blob, `${title}.pdf`);
      markDone('pdf');
    } catch {
      alert('PDF 导出失败，请确保 Playwright 已正确安装');
    }
    setExporting(null);
  };

  const handleExportWord = () => {
    setExporting('doc');
    setTimeout(() => {
      const html = exportToHtml();
      const docContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>${title}</title>
        <style>
          body { font-family: "Microsoft YaHei", "SimSun", sans-serif; font-size: 12pt; line-height: 1.5; }
          h1 { font-size: 18pt; font-weight: bold; }
          h2 { font-size: 16pt; font-weight: bold; }
          h3 { font-size: 14pt; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 5pt; }
          pre { background: #f5f5f5; padding: 10pt; font-family: monospace; }
          blockquote { border-left: 3pt solid #ccc; padding-left: 10pt; margin-left: 0; color: #666; }
        </style></head>
        <body>${html}</body></html>
      `;
      triggerDownload(new Blob(['\ufeff', docContent], { type: 'application/msword' }), `${title}.doc`);
      setExporting(null);
      markDone('doc');
    }, 300);
  };

  const formats = [
    {
      key: 'md',
      icon: FileCode,
      label: 'Markdown',
      ext: '.md',
      desc: '纯文本标记格式，适合开发者和版本控制',
      gradient: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/30 hover:border-blue-400/60',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      handler: handleExportMarkdown,
    },
    {
      key: 'html',
      icon: FileText,
      label: 'HTML',
      ext: '.html',
      desc: '完整网页格式，含样式可直接在浏览器打开',
      gradient: 'from-orange-500/20 to-amber-500/10',
      border: 'border-orange-500/30 hover:border-orange-400/60',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
      handler: handleExportHtml,
    },
    {
      key: 'pdf',
      icon: FileImage,
      label: 'PDF',
      ext: '.pdf',
      desc: '便携文档格式，适合打印和跨平台分享',
      gradient: 'from-red-500/20 to-rose-500/10',
      border: 'border-red-500/30 hover:border-red-400/60',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      handler: handleExportPdf,
    },
    {
      key: 'doc',
      icon: FileText,
      label: 'Word',
      ext: '.doc',
      desc: 'Microsoft Word 格式，适合办公场景编辑',
      gradient: 'from-sky-500/20 to-indigo-500/10',
      border: 'border-sky-500/30 hover:border-sky-400/60',
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-400',
      handler: handleExportWord,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">导出页面</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4 mb-5 px-3 py-3 bg-gray-100/30 dark:bg-zinc-800/30 rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">页面名称</div>
              <div className="text-sm text-gray-800 dark:text-zinc-200 font-medium truncate">{title}</div>
            </div>
            <div className="w-px h-8 bg-gray-300/50 dark:bg-zinc-700/50" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Block</div>
              <div className="text-sm text-gray-700 dark:text-zinc-300 font-mono font-semibold">{blocks.length}</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3 font-medium">选择导出格式</p>
          <div className="space-y-2.5">
            {formats.map((fmt) => (
              <button
                key={fmt.key}
                onClick={fmt.handler}
                disabled={exporting !== null}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-200 group ${
                  exporting === fmt.key
                    ? 'bg-gray-100/80 dark:bg-zinc-800/80 border-gray-300/50 dark:border-zinc-600/50 opacity-70'
                    : `bg-gradient-to-r ${fmt.gradient} ${fmt.border} hover:shadow-lg hover:scale-[1.01]`
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${fmt.iconBg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  {exporting === fmt.key ? (
                    <Loader2 className={`w-5 h-5 ${fmt.iconColor} animate-spin`} />
                  ) : done === fmt.key ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <fmt.icon className={`w-5 h-5 ${fmt.iconColor}`} />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{fmt.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">{fmt.ext}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{fmt.desc}</div>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}