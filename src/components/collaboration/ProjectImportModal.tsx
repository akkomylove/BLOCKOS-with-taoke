'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { AIAnalysisPreview } from './AIAnalysisPreview';
import type { AIAnalysisResult } from '@/types/collaboration';
import { normalizeProjectAnalysis } from '@/lib/project-analysis';
import { useAccountStore } from '@/store/accountStore';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onImported?: (count: number) => void;
}

type Step = 'upload' | 'analyzing' | 'preview' | 'importing' | 'complete';

export function ProjectImportModal({ isOpen, onClose, projectId, onImported }: ProjectImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [receiptCount, setReceiptCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);
  const batchRef = useRef('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      setStep('analyzing');
      setError('');

      try {
        const bytes = new TextEncoder().encode(`${projectId}\n${text}`);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        batchRef.current = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        const receipt = await fetch(`/api/projects/${projectId}/ai-import?requestId=${batchRef.current}`);
        if (!receipt.ok) throw new Error('无法核对导入记录');
        const previous = await receipt.json();
        if (previous.found) { setReceiptCount(previous.importedCount); setStep('complete'); return; }
        const cacheKey = `blockos-plan:${useAccountStore.getState().user?.id}:${projectId}`;
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (cached?.batchId === batchRef.current && normalizeProjectAnalysis(cached.analysis).tasks.length) {
            setAnalysis(normalizeProjectAnalysis(cached.analysis));
            setStep('preview');
            return;
          }
        } catch {}
        const res = await fetch(`/api/projects/${projectId}/ai-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '分析失败');
          setStep('upload');
          return;
        }

        const normalized = normalizeProjectAnalysis(data.analysis);
        if (!normalized.tasks.length) {
          setError('没有识别到有效任务，请补充计划书中的任务标题和内容后重试');
          setStep('upload');
          return;
        }
        setAnalysis(normalized);
        try { localStorage.setItem(cacheKey, JSON.stringify({ batchId: batchRef.current, analysis: normalized })); } catch {}
        setStep('preview');
      } catch {
        setError('请求失败，请检查网络和API配置');
        setStep('upload');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    if (!analysis || importingRef.current) return;
    importingRef.current = true;
    setStep('importing');
    setError('');

    try {
      let data;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`/api/projects/${projectId}/ai-import`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: analysis.tasks, workflow: analysis.workflow, requestId: batchRef.current }),
        });
        data = await res.json();
        if (res.status === 409 && data.code === 'DATABASE_CONFLICT') continue;
        if (!res.ok || !data.success) throw new Error(data.error || '尚未确认保存成功，请重试同一批次');
        break;
      }
      if (!data?.success) throw new Error('其他操作正在保存，请重试此批次');
      onImported?.(data.importedCount);
      onClose();
    } catch (error) {
      setError(`${error instanceof Error ? error.message : '连接中断，尚未确认结果'}。可重试此批次，已保存的任务不会重复创建。`);
      setStep('preview');
    } finally { importingRef.current = false; }
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setAnalysis(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="导入项目计划书" aria-busy={step === 'importing'} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            {step === 'upload' ? '导入项目计划书' : step === 'analyzing' ? 'AI 分析中...' : 'AI 分析结果'}
          </h2>
          <button
            aria-label="关闭计划书导入"
            disabled={step === 'importing'}
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'complete' && <div role="status" className="space-y-4 text-sm">
            <p>这份计划已经保存，共 {receiptCount} 条任务，无需重复导入。</p>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={() => { onImported?.(receiptCount); onClose(); }}>返回看板</button>
          </div>}
          {step === 'importing' && <p role="status" className="mb-4 text-sm text-blue-600">正在保存任务和里程碑，请稍候。收到保存确认后会自动更新看板。</p>}
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-zinc-100 mb-2">
                上传 Markdown 文件
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                支持 .md 格式的项目计划书或执行方案
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <FileText className="w-4 h-4" />
                选择文件
              </span>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-zinc-400">正在分析 {fileName}...</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">AI 正在切分任务、审查项目和生成工作流</p>
            </div>
          )}

          {(step === 'preview' || step === 'importing') && analysis && (
            <AIAnalysisPreview
              analysis={analysis}
              onConfirm={handleConfirm}
              onCancel={() => { reset(); onClose(); }}
              loading={step === 'importing'}
            />
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
