'use client';

import { useBlockStore } from '@/store/blockStore';
import { X, ArrowRight, ArrowLeft, GitBranch, Layers, Box, Link2, Activity } from 'lucide-react';
import { useMemo, useState } from 'react';

interface RelationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'links' | 'hierarchy' | 'graph';

const tabs: { key: TabType; label: string; icon: typeof Link2 }[] = [
  { key: 'links', label: '链接关系', icon: Link2 },
  { key: 'hierarchy', label: '层级结构', icon: Layers },
  { key: 'graph', label: '数据概览', icon: Activity },
];

export default function RelationDrawer({ isOpen, onClose }: RelationDrawerProps) {
  const blocks = useBlockStore((state) => state.blocks);
  const setSelection = useBlockStore((state) => state.setSelection);
  const [activeTab, setActiveTab] = useState<TabType>('links');

  const links = useMemo(() => {
    return blocks.flatMap((block) => {
      if (!block.meta.links || block.meta.links.length === 0) return [];
      return block.meta.links.map((targetId) => ({
        from: block,
        to: blocks.find((b) => b.id === targetId),
      }));
    }).filter((link): link is { from: typeof blocks[0]; to: typeof blocks[0] } => !!link.to);
  }, [blocks]);

  const backLinks = useMemo(() => {
    return blocks.map((block) => {
      const referrers = blocks.filter((b) => b.meta.links?.includes(block.id));
      return { block, referrers };
    }).filter((item) => item.referrers.length > 0);
  }, [blocks]);

  const hierarchy = useMemo(() => {
    const rootBlocks = blocks.filter((b) => !b.parentId);
    const buildTree = (parentId: string | null, depth: number = 0): Array<{ block: typeof blocks[0]; depth: number }> => {
      const children = blocks.filter((b) => b.parentId === parentId);
      const result: Array<{ block: typeof blocks[0]; depth: number }> = [];
      for (const child of children) {
        result.push({ block: child, depth });
        result.push(...buildTree(child.id, depth + 1));
      }
      return result;
    };
    return rootBlocks.flatMap((root) => [{ block: root, depth: 0 }, ...buildTree(root.id, 1)]);
  }, [blocks]);

  const stats = useMemo(() => {
    const totalLinks = links.length;
    const totalBacklinks = backLinks.length;
    const orphanedBlocks = blocks.filter((b) => !b.parentId && (!b.meta.links || b.meta.links.length === 0) && !blocks.some((x) => x.meta.links?.includes(b.id))).length;
    return { totalLinks, totalBacklinks, orphanedBlocks, totalBlocks: blocks.length };
  }, [blocks, links, backLinks]);

  const handleSelectBlock = (id: string) => {
    setSelection([id]);
    onClose();
  };

  const getBlockTypeColor = (type: string) => {
    switch (type) {
      case 'text': return { bg: 'bg-zinc-700/60', text: 'text-zinc-300', dot: 'bg-zinc-400' };
      case 'todo': return { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' };
      case 'list': return { bg: 'bg-blue-500/10', text: 'text-blue-300', dot: 'bg-blue-400' };
      case 'code': return { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-400' };
      case 'table': return { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-400' };
      case 'image': return { bg: 'bg-pink-500/10', text: 'text-pink-300', dot: 'bg-pink-400' };
      default: return { bg: 'bg-zinc-700/60', text: 'text-zinc-300', dot: 'bg-zinc-400' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/50 z-40 overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-100">关系视图</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex bg-zinc-800/50 rounded-xl p-1 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'links' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{stats.totalLinks}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">正向链接</div>
              </div>
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{stats.totalBacklinks}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">反向链接</div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                正向链接
              </h4>
              {links.length === 0 ? (
                <div className="text-xs text-zinc-600 py-6 px-3 bg-zinc-800/30 rounded-xl text-center leading-relaxed">
                  暂无链接<br />选中 Block 后使用底部工具栏创建连接
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link, i) => {
                    const fromColor = getBlockTypeColor(link.from.type);
                    const toColor = getBlockTypeColor(link.to.type);
                    return (
                      <div key={i} className="bg-zinc-800/40 rounded-xl border border-zinc-800/40 overflow-hidden hover:border-blue-500/20 transition-all">
                        <div className="px-3 py-2.5 flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${fromColor.dot}`} />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${fromColor.bg} ${fromColor.text}`}>
                            {link.from.type}
                          </span>
                          <span
                            className="text-zinc-300 truncate flex-1 text-xs cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSelectBlock(link.from.id)}
                          >
                            {link.from.title || link.from.content.substring(0, 30) || '未命名 Block'}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 flex items-center justify-center bg-zinc-800/20">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500/50" />
                        </div>
                        <div className="px-3 py-2.5 flex items-center gap-2.5 border-t border-zinc-800/30">
                          <div className={`w-1.5 h-1.5 rounded-full ${toColor.dot}`} />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${toColor.bg} ${toColor.text}`}>
                            {link.to.type}
                          </span>
                          <span
                            className="text-blue-400 truncate flex-1 text-xs cursor-pointer hover:text-blue-300 transition-colors"
                            onClick={() => handleSelectBlock(link.to.id)}
                          >
                            {link.to.title || link.to.content.substring(0, 30) || '未命名 Block'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[11px] font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                反向链接
              </h4>
              {backLinks.length === 0 ? (
                <div className="text-xs text-zinc-600 py-6 px-3 bg-zinc-800/30 rounded-xl text-center">暂无反向链接</div>
              ) : (
                <div className="space-y-2">
                  {backLinks.map((item) => (
                    <div key={item.block.id} className="bg-zinc-800/40 rounded-xl border border-zinc-800/40 p-3.5 hover:border-purple-500/20 transition-all">
                      <div
                        className="text-xs text-zinc-300 mb-2.5 cursor-pointer hover:text-purple-400 transition-colors font-medium"
                        onClick={() => handleSelectBlock(item.block.id)}
                      >
                        {item.block.title || item.block.content.substring(0, 35) || '未命名 Block'}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ArrowLeft className="w-3 h-3 text-zinc-600 shrink-0" />
                        {item.referrers.map((ref) => (
                          <span
                            key={ref.id}
                            className="text-[10px] text-zinc-400 bg-zinc-700/60 px-2 py-0.5 rounded-md cursor-pointer hover:bg-zinc-600 hover:text-zinc-200 transition-colors"
                            onClick={() => handleSelectBlock(ref.id)}
                          >
                            {ref.title || ref.content.substring(0, 12) || '...'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <div className="space-y-3 pt-2">
            <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
              <div className="text-lg font-semibold text-zinc-200">{hierarchy.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">层级节点</div>
            </div>

            {hierarchy.length === 0 ? (
              <div className="text-xs text-zinc-600 py-6 px-3 bg-zinc-800/30 rounded-xl text-center leading-relaxed">
                暂无层级结构<br />使用下方按钮建立父子关系
              </div>
            ) : (
              <div className="space-y-1">
                {hierarchy.map(({ block, depth }) => {
                  const colors = getBlockTypeColor(block.type);
                  return (
                    <div
                      key={block.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-zinc-700/40 group"
                      style={{ marginLeft: `${depth * 14}px` }}
                      onClick={() => handleSelectBlock(block.id)}
                    >
                      {depth > 0 && (
                        <div className="w-3 h-3 flex items-center justify-center shrink-0">
                          <div className="w-1 h-1 rounded-full bg-zinc-600" />
                        </div>
                      )}
                      <div className={`w-6 h-6 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Box className={`w-3 h-3 ${colors.text}`} />
                      </div>
                      <span className="text-xs text-zinc-300 truncate flex-1 group-hover:text-zinc-100 transition-colors">
                        {block.title || block.content.substring(0, 25) || '未命名 Block'}
                      </span>
                      {blocks.some((b) => b.parentId === block.id) && (
                        <span className="text-[9px] text-zinc-600 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded">
                          {blocks.filter((b) => b.parentId === block.id).length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{stats.totalBlocks}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Block 总数</div>
              </div>
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{stats.totalLinks + stats.totalBacklinks}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">连接总数</div>
              </div>
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{blocks.filter((b) => b.parentId).length}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">子 Block</div>
              </div>
              <div className="bg-zinc-800/40 border border-zinc-800/40 rounded-xl px-3 py-3">
                <div className="text-lg font-semibold text-zinc-200">{stats.orphanedBlocks}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">孤立 Block</div>
              </div>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-800/40 rounded-xl p-4">
              <h4 className="text-[11px] font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                类型分布
              </h4>
              <div className="space-y-2.5">
                {Array.from(new Set(blocks.map((b) => b.type))).map((type) => {
                  const count = blocks.filter((b) => b.type === type).length;
                  const percentage = stats.totalBlocks > 0 ? (count / stats.totalBlocks) * 100 : 0;
                  const colors = getBlockTypeColor(type);
                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium w-14 text-center ${colors.bg} ${colors.text}`}>
                        {type}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors.dot}`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-800/40 rounded-xl p-4">
              <h4 className="text-[11px] font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                链接密度
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-purple-500/60 transition-all duration-500"
                    style={{ width: `${stats.totalBlocks > 0 ? Math.min(100, ((stats.totalLinks + stats.totalBacklinks) / stats.totalBlocks) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-300 font-mono font-semibold">
                  {stats.totalBlocks > 0 ? ((stats.totalLinks + stats.totalBacklinks) / stats.totalBlocks).toFixed(1) : '0.0'}x
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">每个 Block 平均拥有的连接数</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}