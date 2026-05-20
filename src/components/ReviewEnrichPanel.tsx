'use client';

import { useState } from 'react';
import { X, ClipboardCheck, Loader2, Eye, ListChecks, Sparkles, FileText, Plus, Wand2, ChevronDown, Check } from 'lucide-react';
import { useReviewEnrich } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import type { ReviewEnrichRole } from '@/lib/ai';
import type { BlockType } from '@/types/block';

interface ReviewEnrichPanelProps { isOpen: boolean; onClose: () => void; }

interface RoleViewDocument {
  role: string;
  content: string;
  keySections: string[];
}

export default function ReviewEnrichPanel({ isOpen, onClose }: ReviewEnrichPanelProps) {
  const { data, loading, error, execute } = useReviewEnrich();
  const blocks = useBlockStore((state) => state.blocks);
  const addBlock = useBlockStore((state) => state.addBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [showContext, setShowContext] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<RoleViewDocument[]>([]);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedRoleForDoc, setSelectedRoleForDoc] = useState<string>('');
  const [insertedBlocks, setInsertedBlocks] = useState<Set<string>>(new Set());

  const documentContent = blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');

  const handleEnrich = async () => {
    const roles = ['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师'];
    await execute({
      documentName: '当前文档',
      documentContent: documentContent.slice(0, 5000),
      workflow: roles,
      roles: roles.map((r) => ({
        role: r,
        task: `${r}相关任务`,
        focusPoints: [`${r}关注点`],
        briefSummary: `${r}职责概述`,
      })),
    });
  };

  const generateRoleDocument = async (roleData: ReviewEnrichRole) => {
    setGeneratingDoc(true);
    try {
      const systemPrompt = '你是 FDoc 的角色视角文档精简助手。只输出合法 JSON，不要 markdown，不要解释。';
      const userPrompt = (
        '返回固定 JSON，字段只有 content 和 key_sections。\n'
        + 'content：根据原文档和角色信息，生成精简后的文档内容，只保留该角色需要关注的核心内容。\n'
        + 'key_sections：列出 3-5 个关键章节/段落标题。\n'
        + '要求：\n'
        + '1. 删除与该角色无关的内容\n'
        + '2. 保留该角色需要了解的关键信息\n'
        + '3. 内容结构清晰，便于快速阅读\n'
        + '4. 不改变原文，只做精简\n\n'
        + `角色：${roleData.role}\n`
        + `角色职责：${roleData.reviewSummary}\n`
        + `关注重点：${roleData.viewHints.priorityTopics.join('、')}\n`
        + `折叠内容：${roleData.viewHints.foldableTopics.join('、')}\n`
        + `审查关键词：${roleData.viewHints.reviewKeywords.join('、')}\n\n`
        + `原文：\n${documentContent.slice(0, 5000)}`
      );

      const response = await fetch('/api/ai/generate-role-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt }),
      });

      if (!response.ok) throw new Error('Failed to generate document');
      const result = await response.json();

      const newDoc: RoleViewDocument = {
        role: roleData.role,
        content: result.content,
        keySections: result.keySections || [],
      };
      setGeneratedDocs(prev => [...prev.filter(d => d.role !== roleData.role), newDoc]);
    } catch {
      console.error('Failed to generate role document');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const insertRoleDocument = (doc: RoleViewDocument) => {
    const blockId = addBlock('text' as BlockType);
    updateBlock(blockId, {
      title: `${doc.role}专属视图`,
      content: `# ${doc.role}专属文档\n\n${doc.content}`,
      meta: { tags: [`${doc.role}专属`, '角色视图'] },
    });
    setInsertedBlocks(prev => new Set(prev).add(doc.role));
  };

  const handleSelectRoleForDoc = (role: string) => {
    setSelectedRoleForDoc(role);
    setShowRoleSelector(false);
    const roleData = data?.roles.find(r => r.role === role);
    if (roleData) {
      generateRoleDocument(roleData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">角色审阅增强</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* 文档上下文预览 */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                <FileText className="w-4 h-4 text-gray-500" />
                文档上下文预览
                <span className="text-xs text-gray-400">({documentContent.length} 字符)</span>
              </div>
              <span className="text-xs text-gray-500">{showContext ? '收起' : '展开'}</span>
            </button>
            {showContext && (
              <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/30 max-h-40 overflow-auto">
                <pre className="text-xs text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{documentContent.slice(0, 800)}{documentContent.length > 800 ? '...' : ''}</pre>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleEnrich}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? '生成中...' : '生成角色审阅'}
            </button>
            {data && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleSelector(!showRoleSelector)}
                  disabled={generatingDoc}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {generatingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {generatingDoc ? '生成中...' : '生成专属文档'}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showRoleSelector && (
                  <div className="absolute right-0 z-10 w-48 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg">
                    {data.roles.map((role) => (
                      <button
                        key={role.role}
                        onClick={() => handleSelectRoleForDoc(role.role)}
                        disabled={generatedDocs.some(d => d.role === role.role)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-gray-700 dark:text-zinc-300 flex items-center justify-between"
                      >
                        <span>{role.role}</span>
                        {insertedBlocks.has(role.role) && <Check className="w-4 h-4 text-green-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* 生成的专属文档 */}
          {generatedDocs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                已生成的专属文档
              </h3>
              {generatedDocs.map((doc) => (
                <div key={doc.role} className="border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{doc.role}专属文档</span>
                    {!insertedBlocks.has(doc.role) ? (
                      <button
                        onClick={() => insertRoleDocument(doc)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <Plus className="w-3 h-3" />
                        插入Block
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="w-3 h-3" />
                        已插入
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <pre className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-6">{doc.content.slice(0, 500)}{doc.content.length > 500 ? '...' : ''}</pre>
                    {doc.keySections.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {doc.keySections.map((section, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded">{section}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {data.roles.map((role) => (
                <div key={role.role} className="border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{role.role}</span>
                    <button
                      onClick={() => generateRoleDocument(role)}
                      disabled={generatingDoc}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 disabled:opacity-50"
                    >
                      <Wand2 className="w-3 h-3" />
                      生成专属文档
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-zinc-300 mb-3">{role.reviewSummary}</p>

                  <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 mb-1">
                      <ListChecks className="w-3.5 h-3.5" /> 检查清单
                    </div>
                    <ul className="space-y-1">
                      {role.reviewChecklist.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-zinc-400 flex items-start gap-1.5">
                          <span className="text-purple-400 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 mb-2">
                      <Eye className="w-3.5 h-3.5" /> 视图提示
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {role.viewHints.priorityTopics.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">{t}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {role.viewHints.foldableTopics.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded">{t}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.viewHints.reviewKeywords.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{t}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{role.viewHints.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
