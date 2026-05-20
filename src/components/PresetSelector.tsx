'use client';

import { useState } from 'react';
import { X, FileText, Tag, Star, ChevronRight, Loader2 } from 'lucide-react';
import { PRESET_REGISTRY, type PresetDoc } from '@/lib/presets';

interface PresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: PresetDoc) => void;
}

export default function PresetSelector({ isOpen, onClose, onSelect }: PresetSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = selectedId ? PRESET_REGISTRY.find((p) => p.id === selectedId) : null;

  const handleSelect = async (preset: PresetDoc) => {
    setLoading(true);
    onSelect(preset);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">预设文档模板</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 gap-3">
            {PRESET_REGISTRY.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedId(selectedId === preset.id ? null : preset.id)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  selectedId === preset.id
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{preset.title}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded">{preset.category}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{preset.difficulty}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">{preset.description}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {preset.tags.map((tag) => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded flex items-center gap-0.5">
                          <Tag className="w-3 h-3" />{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {preset.highlights.map((h) => (
                        <span key={h} className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded flex items-center gap-0.5">
                          <Star className="w-3 h-3" />{h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedId === preset.id ? 'rotate-90' : ''}`} />
                </div>

                {selectedId === preset.id && selected && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">推荐工作流</div>
                      <div className="flex flex-wrap gap-1">
                        {selected.recommendedWorkflow.map((role) => (
                          <span key={role} className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{role}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">内容预览</div>
                      <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">{selected.preview}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{selected.charCount} 字符</span>
                      <span>{selected.sectionCount} 个章节</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelect(selected); }}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      使用此模板
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
