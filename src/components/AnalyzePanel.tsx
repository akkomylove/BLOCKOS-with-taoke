'use client';

import { useState, useCallback, useRef } from 'react';
import { X, BarChart3, Loader2, Users, CheckCircle, FileText, Upload, Layout, ChevronDown, Search, Save, FolderPlus, ChevronRight, FolderOpen, Check } from 'lucide-react';
import { useAnalyze } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import RoleSelector from './RoleSelector';
import type { Page } from '@/types/page';

type SourceType = 'canvas' | 'multi-page' | 'page' | 'upload';

interface AnalyzePanelProps { isOpen: boolean; onClose: () => void; }

export default function AnalyzePanel({ isOpen, onClose }: AnalyzePanelProps) {
  const [sourceType, setSourceType] = useState<SourceType>('multi-page');
  const [documentName, setDocumentName] = useState('');
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [singlePageId, setSinglePageId] = useState('');
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师']);
  const [pageSearch, setPageSearch] = useState('');
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const [showMultiPageDropdown, setShowMultiPageDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [showProjectImportDropdown, setShowProjectImportDropdown] = useState(false);
  const [importedProjectId, setImportedProjectId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error, execute } = useAnalyze();
  const blocks = useBlockStore((state) => state.blocks);
  const pages = useBlockStore((state) => state.pages);
  const pageBlocks = useBlockStore((state) => state.pageBlocks);
  const teams = useCollaborationStore((state) => state.teams);
  const fetchTeams = useCollaborationStore((state) => state.fetchTeams);
  const projects = useCollaborationStore((state) => state.projects);
  const saveAnalysis = useCollaborationStore((state) => state.saveAnalysis);
  const createTasksFromAnalysis = useCollaborationStore((state) => state.createTasksFromAnalysis);
  const fetchProjects = useCollaborationStore((state) => state.fetchProjects);
  const setCurrentTeam = useCollaborationStore((state) => state.setCurrentTeam);

  const getCanvasContent = useCallback(() => {
    return blocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
  }, [blocks]);

  const getPageContent = useCallback((pageId: string) => {
    const pBlocks = pageBlocks[pageId] || [];
    const page = pages.find(p => p.id === pageId);
    const header = `===== ${page?.title || '未命名页面'} =====`;
    const content = pBlocks.map((b) => `[${b.type}] ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`).join('\n\n');
    return `${header}\n${content}`;
  }, [pageBlocks, pages]);

  const getMultiPageContent = useCallback(() => {
    if (selectedPageIds.length === 0) return '';
    return selectedPageIds.map(id => getPageContent(id)).join('\n\n');
  }, [selectedPageIds, getPageContent]);

  const getDocumentContent = useCallback(() => {
    switch (sourceType) {
      case 'canvas': return getCanvasContent();
      case 'multi-page': return getMultiPageContent();
      case 'page': return singlePageId ? getPageContent(singlePageId) : '';
      case 'upload': return uploadedContent;
      default: return '';
    }
  }, [sourceType, getCanvasContent, getMultiPageContent, singlePageId, getPageContent, uploadedContent]);

  const getDocumentName = useCallback(() => {
    if (documentName.trim()) return documentName.trim();
    switch (sourceType) {
      case 'canvas': return '当前画布';
      case 'multi-page': {
        if (selectedPageIds.length === 0) return '请选择文档';
        if (selectedPageIds.length === 1) {
          const page = pages.find((p) => p.id === selectedPageIds[0]);
          return page?.title || '已选文档';
        }
        return `已选 ${selectedPageIds.length} 份文档`;
      }
      case 'page': {
        const page = pages.find((p) => p.id === singlePageId);
        return page?.title || '未命名页面';
      }
      case 'upload': return uploadedFileName || '导入文档';
      default: return '未命名文档';
    }
  }, [documentName, sourceType, pages, selectedPageIds, singlePageId, uploadedFileName]);

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleAnalyze = async () => {
    const content = getDocumentContent();
    if (!content.trim()) return;
    if (selectedRoles.length === 0) return;
    setSavedAnalysisId(null);
    await execute({
      documentName: getDocumentName(),
      documentContent: content.slice(0, 8000),
      workflow: selectedRoles,
      sourceType,
      pageId: sourceType === 'page' ? singlePageId : undefined,
    });
  };

  const handleImportFromProject = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow-source`);
      if (!res.ok) throw new Error('Failed to import');
      const json = await res.json();
      if (json.inferredRoles?.length > 0) {
        setSelectedRoles(json.inferredRoles);
      }
      const contentParts: string[] = [];
      if (json.milestones?.length) {
        contentParts.push('里程碑：\n' + json.milestones.map((m: { name: string; description: string | null }) => `- ${m.name}${m.description ? ': ' + m.description : ''}`).join('\n'));
      }
      if (json.tasks?.length) {
        contentParts.push('现有任务：\n' + json.tasks.map((t: { title: string; description: string | null; status: string }) => `- [${t.status}] ${t.title}${t.description ? ': ' + t.description : ''}`).join('\n'));
      }
      if (contentParts.length) {
        setUploadedContent(contentParts.join('\n\n'));
        setUploadedFileName(`项目导入: ${projects.find((p) => p.id === projectId)?.name || projectId}`);
      }
      setShowProjectImportDropdown(false);
    } catch {
      // ignore
    }
  }, [projects]);

  const handleSaveAnalysis = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const id = await saveAnalysis({
        documentName: getDocumentName(),
        documentSummary: data.documentSummary,
        workflowRoles: selectedRoles,
        roleFlow: data.roleFlow,
        taskSchedule: data.taskSchedule,
      });
      setSavedAnalysisId(id);
    } catch {
      // error handled by store
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!data || !selectedProjectId) return;
    const analysisId = savedAnalysisId;
    if (!analysisId) {
      setSaving(true);
      try {
        const id = await saveAnalysis({
          projectId: selectedProjectId,
          documentName: getDocumentName(),
          documentSummary: data.documentSummary,
          workflowRoles: selectedRoles,
          roleFlow: data.roleFlow,
          taskSchedule: data.taskSchedule,
        });
        setSavedAnalysisId(id);
        setGeneratingTasks(true);
        await createTasksFromAnalysis(id, selectedProjectId);
      } catch {
        // error handled by store
      } finally {
        setSaving(false);
        setGeneratingTasks(false);
      }
      return;
    }
    setGeneratingTasks(true);
    try {
      await createTasksFromAnalysis(analysisId, selectedProjectId);
    } catch {
      // error handled by store
    } finally {
      setGeneratingTasks(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setUploadedContent(text);
      setUploadedFileName(file.name);
      if (!documentName) setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsText(file);
  }, [documentName]);

  const filteredPages = pages.filter((p) => p.title.toLowerCase().includes(pageSearch.toLowerCase()));
  const selectedPages = pages.filter(p => selectedPageIds.includes(p.id));

  const canvasPreview = getCanvasContent().slice(0, 200);
  const singlePage = pages.find((p) => p.id === singlePageId);
  const singlePagePreview = singlePageId ? getPageContent(singlePageId).slice(0, 200) : '';
  const multiPagePreview = getMultiPageContent().slice(0, 200);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">工作流分析</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* 文档来源选择 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">文档来源</label>
              <div className="relative">
                <button
                  onClick={() => { setShowProjectImportDropdown(!showProjectImportDropdown); if (projects.length === 0) { const teamId = useCollaborationStore.getState().currentTeamId; if (teamId) fetchProjects(teamId); } }}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                >
                  从项目导入
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showProjectImportDropdown && (
                  <div className="absolute right-0 z-10 w-48 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {projects.length === 0 && (
                      <div className="p-3 text-xs text-gray-400 text-center">暂无项目</div>
                    )}
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => { setImportedProjectId(project.id); handleImportFromProject(project.id); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-zinc-300"
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              {([
                { key: 'multi-page' as const, label: '多文档分析', icon: FolderOpen },
                { key: 'page' as const, label: '单页分析', icon: FileText },
                { key: 'canvas' as const, label: '当前画布', icon: Layout },
                { key: 'upload' as const, label: '导入文档', icon: Upload },
              ]).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSourceType(item.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                    sourceType === item.key
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 多文档选择 */}
          {sourceType === 'multi-page' && (
            <div className="space-y-2">
              <div className="relative">
                <button
                  onClick={() => setShowMultiPageDropdown(!showMultiPageDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100"
                >
                  <span className={selectedPages.length ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedPages.length > 0 ? `已选择 ${selectedPages.length} 份文档` : '选择要分析的文档'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showMultiPageDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-zinc-700/50 rounded-md">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={pageSearch}
                          onChange={(e) => setPageSearch(e.target.value)}
                          placeholder="搜索文档..."
                          className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
                          autoFocus
                        />
                      </div>
                    </div>
                    {filteredPages.length === 0 && (
                      <div className="p-3 text-sm text-gray-400 text-center">无匹配文档</div>
                    )}
                    {filteredPages.map((page) => {
                      const isSelected = selectedPageIds.includes(page.id);
                      return (
                        <button
                          key={page.id}
                          onClick={() => togglePageSelection(page.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{page.icon || '📄'}</span>
                            <span>{page.title || '无标题'}</span>
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedPages.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 mb-2">已选文档：</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPages.map(page => (
                      <span key={page.id} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                        <span>{page.icon}</span>
                        <span>{page.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePageSelection(page.id); }}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                    共 {selectedPages.length} 份文档，{getMultiPageContent().length} 字符
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                💡 建议选择多份文档一起分析，系统会综合各文档内容进行分工
              </p>
            </div>
          )}

          {/* 来源具体内容 */}
          {sourceType === 'canvas' && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
              <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">当前画布内容预览</div>
              <p className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-3">{canvasPreview || '（画布为空）'}</p>
              <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{blocks.length} 个区块</div>
            </div>
          )}

          {sourceType === 'page' && (
            <div className="relative">
              <button
                onClick={() => setShowPageDropdown(!showPageDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100"
              >
                <span className={singlePageId ? '' : 'text-gray-400'}>{singlePage?.title || '选择页面'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showPageDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-zinc-700/50 rounded-md">
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        placeholder="搜索页面..."
                        className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  {filteredPages.length === 0 && (
                    <div className="p-3 text-sm text-gray-400 text-center">无匹配页面</div>
                  )}
                  {filteredPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => { setSinglePageId(page.id); setShowPageDropdown(false); setPageSearch(''); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${
                        singlePageId === page.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-zinc-300'
                      }`}
                    >
                      {page.title || '无标题'}
                    </button>
                  ))}
                </div>
              )}
              {singlePageId && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">页面内容预览</div>
                  <p className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-3">{singlePagePreview || '（页面为空）'}</p>
                </div>
              )}
            </div>
          )}

          {sourceType === 'upload' && (
            <div className="space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-zinc-400">点击或拖拽上传 .txt / .md 文件</span>
                <span className="text-xs text-gray-400">{uploadedFileName || '未选择文件'}</span>
              </div>
              <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
              {uploadedContent && (
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">文件内容预览</div>
                  <p className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-3">{uploadedContent.slice(0, 200)}</p>
                  <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{uploadedContent.length} 字符</div>
                </div>
              )}
            </div>
          )}

          {/* 文档名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">分析名称</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={getDocumentName()}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* 角色选择器 */}
          <RoleSelector selectedRoles={selectedRoles} onChange={setSelectedRoles} />

          {/* 分析按钮 */}
          <button
            onClick={handleAnalyze}
            disabled={loading || selectedRoles.length === 0 || !getDocumentContent().trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loading ? '分析中...' : '开始分析'}
          </button>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* 分析结果 */}
          {data && (
            <div className="space-y-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
              {/* 操作栏 */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAnalysis}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savedAnalysisId ? '已保存' : saving ? '保存中...' : '保存分析'}
                </button>
                <div className="relative flex-1">
                  <button
                    onClick={async () => {
                      let teamId = useCollaborationStore.getState().currentTeamId;
                      if (!teamId) {
                        await fetchTeams();
                        const currentTeams = useCollaborationStore.getState().teams;
                        if (currentTeams.length > 0) {
                          teamId = currentTeams[0].id;
                          setCurrentTeam(teamId);
                        }
                      }
                      if (teamId) {
                        await fetchProjects(teamId);
                      }
                      setShowProjectDropdown(!showProjectDropdown);
                    }}
                    disabled={generatingTasks}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {generatingTasks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
                    {generatingTasks ? '生成中...' : '生成项目任务'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  {showProjectDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {projects.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400 text-center">
                          暂无项目<br/>
                          <span className="text-xs">请先在协作模块创建项目</span>
                        </div>
                      ) : (
                        projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => { setSelectedProjectId(project.id); setShowProjectDropdown(false); handleGenerateTasks(); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-zinc-300"
                          >
                            {project.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">文档摘要</h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300">{data.documentSummary}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> 岗位流转</h3>
                <div className="space-y-2">
                  {data.roleFlow.stages.map((stage, i) => (
                    <div key={i} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg">
                      <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{stage.role}</span>
                      <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">{stage.stageGoal}</p>
                      {stage.watchPoints.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{stage.watchPoints.map((wp, j) => <span key={j} className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">{wp}</span>)}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 任务安排</h3>
                <div className="space-y-1">
                  {data.taskSchedule.map((task) => (
                    <div key={task.step} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded">
                      <span className="text-xs font-mono text-gray-500 w-6">{task.step}</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded">{task.owner}</span>
                      <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1">{task.goal}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
