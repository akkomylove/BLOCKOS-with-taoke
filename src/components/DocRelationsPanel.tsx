'use client';

import { useState, useEffect } from 'react';
import { X, Link2, Loader2, ShieldCheck, ShieldAlert, Shield, Pencil, FileText, ChevronRight, BookOpen, ListChecks, ExternalLink } from 'lucide-react';
import { useDocRelations } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import type { DocRelationsResponse } from '@/lib/ai';

interface DocRelationsPanelProps { isOpen: boolean; onClose: () => void; }

interface DocCandidate {
  documentId: string;
  documentName: string;
  summary: string;
  sourceType: string;
}

export default function DocRelationsPanel({ isOpen, onClose }: DocRelationsPanelProps) {
  const { data, loading, error, execute } = useDocRelations();
  const [currentRole, setCurrentRole] = useState('产品经理');
  const blocks = useBlockStore((state) => state.blocks);
  const pages = useBlockStore((state) => state.pages);
  const pageBlocks = useBlockStore((state) => state.pageBlocks);
  const setCurrentPage = useBlockStore((state) => state.setCurrentPage);
  const [candidates, setCandidates] = useState<DocCandidate[]>([]);
  const [showReadingGuide, setShowReadingGuide] = useState(true);

  useEffect(() => {
    const docs: DocCandidate[] = [];
    for (const page of pages) {
      const pBlocks = pageBlocks[page.id] || [];
      const content = pBlocks.map((b) => typeof b.content === 'string' ? b.content : JSON.stringify(b.content)).join(' ').slice(0, 300);
      docs.push({
        documentId: page.id,
        documentName: page.title,
        summary: content || '无内容摘要',
        sourceType: 'page',
      });
    }
    setCandidates(docs);
  }, [pages, pageBlocks]);

  const handleAnalyze = async () => {
    const content = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
    await execute({
      documentName: '当前文档',
      currentRole,
      workflow: ['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师'],
      documentSummary: content.slice(0, 500),
      candidates: candidates.length > 0 ? candidates : [
        { documentId: 'preset-1', documentName: '产品需求说明', summary: '产品需求文档', sourceType: 'preset' },
        { documentId: 'preset-2', documentName: '技术方案说明', summary: '技术方案文档', sourceType: 'preset' },
        { documentId: 'preset-3', documentName: '数据复盘摘要', summary: '数据复盘文档', sourceType: 'preset' },
      ],
    });
  };

  const handleJumpToDocument = (documentId: string) => {
    const page = pages.find((p) => p.id === documentId);
    if (page) {
      setCurrentPage(page.id);
      onClose();
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'low': return <Shield className="w-4 h-4 text-gray-400" />;
      default: return <ShieldAlert className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: 'P0 - 必读', color: 'bg-red-100 text-red-700' };
      case 2: return { label: 'P1 - 重要', color: 'bg-orange-100 text-orange-700' };
      case 3: return { label: 'P2 - 参考', color: 'bg-blue-100 text-blue-700' };
      default: return { label: 'P3 - 可选', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const renderReadingGuide = (guide: NonNullable<DocRelationsResponse['readingGuide']>) => {
    const sortedDocs = [...guide.documents].sort((a, b) => a.readingOrder - b.readingOrder);
    return (
      <div className="border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{guide.title}</h3>
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{guide.description}</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {sortedDocs.map((doc, index) => {
            const priority = getPriorityLabel(doc.priority);
            return (
              <div key={doc.documentId} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{doc.documentName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${priority.color}`}>{priority.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{doc.reason}</p>
                    {doc.keyPoints.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {doc.keyPoints.slice(0, 3).map((point, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded">
                            {point}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {doc.jumpToSection && (
                        <span className="text-xs text-blue-500 dark:text-blue-400">
                          推荐章节：{doc.jumpToSection}
                        </span>
                      )}
                      <button
                        onClick={() => handleJumpToDocument(doc.documentId)}
                        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                        跳转文档
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">文档关联推荐</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* 可选文档列表 */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                <FileText className="w-4 h-4 text-gray-500" />
                可选关联文档（{candidates.length} 个）
              </div>
            </div>
            <div className="max-h-32 overflow-auto">
              {candidates.length === 0 ? (
                <div className="p-3 text-sm text-gray-400 text-center">暂无其他文档，请先创建文档</div>
              ) : (
                candidates.map((doc) => (
                  <div key={doc.documentId} className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-b-0 text-sm text-gray-600 dark:text-zinc-400">
                    <span className="font-medium text-gray-800 dark:text-zinc-200">{doc.documentName}</span>
                    <span className="text-xs text-gray-400 ml-2">{doc.summary.slice(0, 60)}...</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none"
            >
              {['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {loading ? '分析中...' : '分析关联'}
            </button>
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {data && (
            <>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-zinc-300">{data.overview}</p>
              </div>

              {data.readingGuide && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-zinc-300">
                      <ListChecks className="w-4 h-4" />
                      阅读指南
                    </div>
                    <button
                      onClick={() => setShowReadingGuide(!showReadingGuide)}
                      className="text-xs text-indigo-500 hover:text-indigo-600"
                    >
                      {showReadingGuide ? '收起' : '展开'}
                    </button>
                  </div>
                  {showReadingGuide && renderReadingGuide(data.readingGuide)}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">关联文档详情</h3>
                {data.relations.map((rel) => (
                  <div key={rel.documentId} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {getConfidenceIcon(rel.confidence)}
                      <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{rel.documentName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        rel.confidence === 'high' ? 'bg-green-100 text-green-700' : rel.confidence === 'low' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{rel.confidence}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{rel.relationType}</span>
                      <button
                        onClick={() => handleJumpToDocument(rel.documentId)}
                        className="ml-auto flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600"
                      >
                        <ExternalLink className="w-3 h-3" />
                        跳转
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mb-1">{rel.relationDescription}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500">{rel.relationReason}</p>
                  </div>
                ))}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Pencil className="w-3 h-3" />
                  <span>{data.editableNote}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
