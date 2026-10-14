'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Link2, 
  CheckSquare, 
  FileText, 
  Code2, 
  X, 
  Check, 
  Unlink, 
  Network,
  Table,
  Image as ImageIcon,
  PenTool,
  Sigma
} from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { BlockType } from '@/types/block';

export interface MindmapNode {
  id: string;
  text: string;
  children: MindmapNode[];
  collapsed?: boolean;
  linkedBlockId?: string;
}

interface MindmapBlockProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  blockId?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultMindmap(): MindmapNode {
  return {
    id: generateId(),
    text: '核心架构规划',
    children: [
      { id: generateId(), text: '产品需求与 PRD', children: [] },
      { id: generateId(), text: '系统架构设计', children: [] },
      { id: generateId(), text: '测试与发布保障', children: [] },
    ],
  };
}

function parseMindmap(content: string): MindmapNode {
  if (!content) return createDefaultMindmap();
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.text) {
      return parsed;
    }
    return createDefaultMindmap();
  } catch {
    return createDefaultMindmap();
  }
}

interface PositionedNode {
  id: string;
  node: MindmapNode;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  linkedBlockId?: string;
}

interface ConnectionLine {
  id: string;
  x1: number;
  y1: number;
  cx1: number;
  cx2: number;
  x2: number;
  y2: number;
}

const NODE_HEIGHT = 38;
const VERTICAL_GAP = 20;
const HORIZONTAL_GAP = 64;

export default function MindmapBlock({ content, onChange, readOnly, blockId }: MindmapBlockProps) {
  const [root, setRoot] = useState<MindmapNode>(() => parseMindmap(content));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkPopover, setLinkPopover] = useState<{ nodeId: string; rect: DOMRect } | null>(null);

  const blocks = useBlockStore((state) => state.blocks);
  const setSelection = useBlockStore((state) => state.setSelection);
  const addBlock = useBlockStore((state) => state.addBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const createLink = useBlockStore((state) => state.createLink);

  const updateNode = useCallback(
    (node: MindmapNode, id: string, updater: (n: MindmapNode) => MindmapNode): MindmapNode => {
      if (node.id === id) return updater({ ...node });
      return { ...node, children: node.children.map((c) => updateNode(c, id, updater)) };
    },
    []
  );

  const lastEmittedRef = useRef<string>(content);

  useEffect(() => {
    if (content !== lastEmittedRef.current) {
      lastEmittedRef.current = content;
      setRoot(parseMindmap(content));
    }
  }, [content]);

  const commitRoot = useCallback(
    (newRoot: MindmapNode) => {
      setRoot(newRoot);
      const json = JSON.stringify(newRoot);
      lastEmittedRef.current = json;
      onChange(json);
    },
    [onChange]
  );

  const addChild = useCallback(
    (parentId: string) => {
      const newRoot = updateNode(root, parentId, (n) => ({
        ...n,
        collapsed: false,
        children: [...(n.children || []), { id: generateId(), text: '新分支节点', children: [] }],
      }));
      commitRoot(newRoot);
    },
    [root, updateNode, commitRoot]
  );

  const addRootBranch = useCallback(() => {
    const newRoot: MindmapNode = {
      ...root,
      children: [...(root.children || []), { id: generateId(), text: '新主分支', children: [] }],
    };
    commitRoot(newRoot);
  }, [root, commitRoot]);

  const removeNode = useCallback(
    (id: string) => {
      const removeFrom = (node: MindmapNode): MindmapNode | null => {
        if (node.id === id) return null;
        return { ...node, children: (node.children || []).map(removeFrom).filter(Boolean) as MindmapNode[] };
      };
      const newRoot = removeFrom(root);
      if (newRoot) {
        commitRoot(newRoot);
      }
    },
    [root, commitRoot]
  );

  const toggleCollapse = useCallback(
    (id: string) => {
      const newRoot = updateNode(root, id, (n) => ({ ...n, collapsed: !n.collapsed }));
      commitRoot(newRoot);
    },
    [root, updateNode, commitRoot]
  );

  const startEdit = useCallback(
    (node: MindmapNode) => {
      if (readOnly) return;
      setEditingId(node.id);
      setEditText(node.text);
    },
    [readOnly]
  );

  const saveEdit = useCallback(
    (id: string) => {
      const newRoot = updateNode(root, id, (n) => ({ ...n, text: editText.trim() || n.text }));
      commitRoot(newRoot);
      setEditingId(null);
    },
    [root, editText, updateNode, commitRoot]
  );

  const handleLinkBlock = useCallback(
    (nodeId: string, targetBlockId: string) => {
      const newRoot = updateNode(root, nodeId, (n) => ({ ...n, linkedBlockId: targetBlockId }));
      commitRoot(newRoot);
      if (blockId && targetBlockId) {
        createLink(blockId, targetBlockId);
      }
      setLinkPopover(null);
    },
    [root, blockId, createLink, updateNode, commitRoot]
  );

  const handleUnlinkBlock = useCallback(
    (nodeId: string) => {
      let targetNode: MindmapNode | null = null;
      const search = (n: MindmapNode) => {
        if (n.id === nodeId) targetNode = n;
        n.children?.forEach(search);
      };
      search(root);

      if (targetNode && (targetNode as MindmapNode).linkedBlockId && blockId) {
        const currentBlock = blocks.find((b) => b.id === blockId);
        if (currentBlock && currentBlock.meta.links) {
          updateBlock(blockId, {
            meta: {
              ...currentBlock.meta,
              links: currentBlock.meta.links.filter((l) => l !== (targetNode as MindmapNode).linkedBlockId),
            },
          });
        }
      }

      const newRoot = updateNode(root, nodeId, (n) => {
        const copy = { ...n };
        delete copy.linkedBlockId;
        return copy;
      });
      commitRoot(newRoot);
      setLinkPopover(null);
    },
    [root, blockId, blocks, updateBlock, updateNode, commitRoot]
  );

  const handleCreateAndLinkBlock = useCallback(
    (node: MindmapNode, type: BlockType) => {
      const parentBlock = blockId ? blocks.find((b) => b.id === blockId) : null;
      const newX = (parentBlock?.x || 100) + (parentBlock?.width || 560) + 40;
      const newY = parentBlock?.y || 100;

      const newBlockId = addBlock(type, undefined, { x: newX, y: newY });
      const titleText = `${node.text}`;

      if (type === 'todo') {
        updateBlock(newBlockId, {
          title: titleText,
          content: `【任务执行】${node.text}\n- [ ] 方案梳理与核心实现\n- [ ] 质量验证与验收`,
          meta: { checked: false, tags: ['导图关联任务'] },
        });
      } else if (type === 'text') {
        updateBlock(newBlockId, {
          title: titleText,
          content: `### 📝 ${node.text}\n\n此处由思维导图分支「${node.text}」自动实例化生成。请在此补充详细落地文档与规范说明。`,
          meta: { tags: ['导图关联文档'] },
        });
      } else if (type === 'code') {
        updateBlock(newBlockId, {
          title: `${titleText} 代码实现`,
          content: `// 🚀 模块实现：${node.text}\nexport function execute() {\n  console.log("执行模块逻辑: ${node.text}");\n  return true;\n}`,
          meta: { language: 'typescript', tags: ['导图代码模块'] },
        });
      }

      if (blockId) {
        createLink(blockId, newBlockId);
      }

      const newRoot = updateNode(root, node.id, (n) => ({ ...n, linkedBlockId: newBlockId }));
      commitRoot(newRoot);

      setSelection([newBlockId]);
      window.dispatchEvent(
        new CustomEvent('blockos-scroll-to-block', {
          detail: { blockId: newBlockId },
        })
      );

      setLinkPopover(null);
    },
    [root, blockId, blocks, addBlock, updateBlock, createLink, updateNode, commitRoot, setSelection]
  );

  const jumpToLinkedBlock = useCallback((e: React.MouseEvent, targetBlockId: string) => {
    e.stopPropagation();
    setSelection([targetBlockId]);
    window.dispatchEvent(
      new CustomEvent('blockos-scroll-to-block', {
        detail: { blockId: targetBlockId },
      })
    );
  }, [setSelection]);

  // 严密健壮的树状递归高度与位置排布算法 (Reingold-Tilford Subtree Engine)
  const layout = useMemo(() => {
    const getNodeHeight = (node: MindmapNode): number => {
      if (node.collapsed || !node.children || node.children.length === 0) {
        return NODE_HEIGHT + VERTICAL_GAP;
      }
      return node.children.reduce((acc, c) => acc + getNodeHeight(c), 0);
    };

    const positionedNodes: PositionedNode[] = [];
    const connectionLines: ConnectionLine[] = [];

    const totalHeight = getNodeHeight(root);
    let maxX = 0;

    const computeNodeWidth = (node: MindmapNode, depth: number): number => {
      const textLen = (node.text || '新节点').length;
      const baseW = Math.max(90, Math.min(180, textLen * 13 + 32));
      const hasLink = Boolean(node.linkedBlockId);
      return depth === 0 ? Math.max(baseW, 110) : hasLink ? baseW + 54 : baseW;
    };

    const traverse = (
      node: MindmapNode,
      depth: number,
      x: number,
      startY: number,
      parentLayout?: PositionedNode
    ) => {
      const nodeW = computeNodeWidth(node, depth);
      const subtreeH = getNodeHeight(node);
      const nodeY = startY + subtreeH / 2;

      const currentLayout: PositionedNode = {
        id: node.id,
        node,
        text: node.text,
        x,
        y: nodeY,
        width: nodeW,
        height: NODE_HEIGHT,
        depth,
        linkedBlockId: node.linkedBlockId,
      };

      positionedNodes.push(currentLayout);
      maxX = Math.max(maxX, x + nodeW);

      if (parentLayout) {
        const startX = parentLayout.x + parentLayout.width;
        const startY = parentLayout.y;
        const endX = currentLayout.x;
        const endY = currentLayout.y;
        const midX = (startX + endX) / 2;

        connectionLines.push({
          id: `${parentLayout.id}-${currentLayout.id}`,
          x1: startX,
          y1: startY,
          cx1: midX,
          cx2: midX,
          x2: endX,
          y2: endY,
        });
      }

      if (!node.collapsed && node.children && node.children.length > 0) {
        let currentChildY = startY;
        const nextX = x + nodeW + HORIZONTAL_GAP;

        node.children.forEach((child) => {
          const childH = getNodeHeight(child);
          traverse(child, depth + 1, nextX, currentChildY, currentLayout);
          currentChildY += childH;
        });
      }
    };

    traverse(root, 0, 36, 16);

    const svgWidth = Math.max(maxX + 60, 480);
    const svgHeight = Math.max(totalHeight + 36, 240);

    return {
      nodes: positionedNodes,
      lines: connectionLines,
      width: svgWidth,
      height: svgHeight,
    };
  }, [root]);

  const totalNodeCount = useMemo(() => {
    let count = 0;
    const countNodes = (n: MindmapNode) => {
      count++;
      n.children?.forEach(countNodes);
    };
    countNodes(root);
    return count;
  }, [root]);

  const candidateBlocks = useMemo(() => {
    return blocks.filter((b) => b.id !== blockId);
  }, [blocks, blockId]);

  const selectedNode = useMemo<MindmapNode | null>(() => {
    if (!selectedNodeId) return null;
    let found: MindmapNode | null = null;
    const search = (n: MindmapNode) => {
      if (n.id === selectedNodeId) found = n;
      n.children?.forEach(search);
    };
    search(root);
    return found;
  }, [root, selectedNodeId]);

  return (
    <div className="w-full flex flex-col select-none group/mindmap">
      {/* 顶部极简信息与操作指示条 */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800 text-[11px] text-gray-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
            <Network className="w-3.5 h-3.5" />
            架构思维导图
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono text-[10px]">
            {totalNodeCount} 节点
          </span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 hidden sm:inline">
            双击编辑文字，单击选中展开操作
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedNode && (
              <div className="flex items-center gap-1 mr-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-zinc-800 border border-blue-200 dark:border-zinc-700 text-[10px]">
                <span className="text-gray-400 dark:text-zinc-500">已选:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400 max-w-[80px] truncate">{selectedNode.text}</span>
                <button
                  onClick={() => addChild(selectedNode.id)}
                  className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 font-medium"
                  title="为此节点添加子分支"
                >
                  + 子项
                </button>
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setLinkPopover({ nodeId: selectedNode.id, rect });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 hover:bg-purple-200"
                  title="关联或生成画布 Block"
                >
                  🔗 关联
                </button>
                <button
                  onClick={() => startEdit(selectedNode)}
                  className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-300"
                  title="重命名该节点"
                >
                  重命名
                </button>
                {selectedNode.id !== root.id && (
                  <button
                    onClick={() => {
                      removeNode(selectedNode.id);
                      setSelectedNodeId(null);
                    }}
                    className="px-1.5 py-0.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 font-bold"
                    title="删除选中的节点"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            <button
              onClick={addRootBranch}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              title="添加一级主分支"
            >
              <Plus className="w-3 h-3" />
              <span>添加分支</span>
            </button>
          </div>
        )}
      </div>

      {/* SVG 导图渲染画卷 */}
      <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 pb-2">
        <svg
          width={layout.width}
          height={layout.height}
          className="min-w-full transition-all duration-200"
          style={{ minHeight: `${layout.height}px` }}
          onClick={() => setSelectedNodeId(null)}
        >
          {/* 曲线连线层 */}
          <g className="connections">
            {layout.lines.map((line) => (
              <path
                key={line.id}
                d={`M ${line.x1} ${line.y1} C ${line.cx1} ${line.y1}, ${line.cx2} ${line.y2}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke="currentColor"
                className="text-blue-300/80 dark:text-blue-700/60 transition-all duration-200 hover:text-blue-500"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* 节点渲染层 */}
          <g className="nodes">
            {layout.nodes.map((pos) => {
              const isRoot = pos.depth === 0;
              const isEditing = editingId === pos.id;
              const isHovered = hoveredNodeId === pos.id;
              const isSelected = selectedNodeId === pos.id;
              const isToolbarVisible = !readOnly && !isEditing && (isHovered || isSelected);
              const linkedBlock = pos.linkedBlockId ? blocks.find((b) => b.id === pos.linkedBlockId) : null;
              const hasChildren = pos.node.children && pos.node.children.length > 0;

              return (
                <g
                  key={pos.id}
                  transform={`translate(${pos.x}, ${pos.y - pos.height / 2})`}
                  onMouseEnter={() => setHoveredNodeId(pos.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(pos.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!readOnly) startEdit(pos.node);
                  }}
                  className="cursor-pointer"
                >
                  {/* 透明防断连扩展感应区：连接节点底板与悬停工具栏，防止鼠标横移滑入间隙触发 onMouseLeave */}
                  <rect
                    x={-6}
                    y={-6}
                    width={pos.width + (isToolbarVisible ? 86 : 12)}
                    height={pos.height + 12}
                    fill="transparent"
                    pointerEvents="all"
                  />

                  {/* 节点背景底板 */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx={8}
                    className={`transition-all duration-150 ${
                      isRoot
                        ? 'fill-blue-600 stroke-blue-500 shadow-lg'
                        : linkedBlock
                          ? 'fill-white dark:fill-zinc-800 stroke-blue-400 dark:stroke-blue-500'
                          : 'fill-white dark:fill-zinc-800 stroke-gray-200 dark:stroke-zinc-700 hover:stroke-blue-400 dark:hover:stroke-blue-500'
                    } ${isSelected ? 'stroke-blue-500 dark:stroke-blue-400' : ''}`}
                    strokeWidth={isRoot ? (isSelected ? 2.5 : 2) : isSelected ? 2 : linkedBlock ? 1.8 : 1.2}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                  />

                  {/* 节点文字 / 输入编辑框 */}
                  {isEditing ? (
                    <foreignObject x={6} y={4} width={pos.width - 12} height={pos.height - 8}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => saveEdit(pos.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(pos.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 text-xs text-center outline-none border border-blue-500 rounded px-1 shadow-inner"
                      />
                    </foreignObject>
                  ) : (
                    <g>
                      <text
                        x={pos.width / 2 - (linkedBlock ? 14 : 0)}
                        y={pos.height / 2 + 4}
                        textAnchor="middle"
                        fill={isRoot ? '#ffffff' : 'currentColor'}
                        fontSize={isRoot ? 13 : 12}
                        fontWeight={isRoot ? 600 : 500}
                        className={isRoot ? 'fill-white' : 'fill-gray-800 dark:fill-zinc-200'}
                      >
                        {pos.text}
                      </text>
                    </g>
                  )}

                  {/* 关联 Block 快速跳转药丸 */}
                  {linkedBlock && !isEditing && (
                    <g
                      transform={`translate(${pos.width - 24}, ${pos.height / 2 - 8})`}
                      onClick={(e) => jumpToLinkedBlock(e, linkedBlock.id)}
                      className="cursor-pointer group/pill"
                    >
                      <title>{`关联至 Block: ${linkedBlock.title || linkedBlock.type}，点击画布定位`}</title>
                      <rect
                        width={18}
                        height={16}
                        rx={4}
                        className="fill-blue-500/15 stroke-blue-400 group-hover/pill:fill-blue-500 group-hover/pill:stroke-blue-500 transition-colors"
                        strokeWidth={1}
                      />
                      <text
                        x={9}
                        y={12}
                        textAnchor="middle"
                        fontSize={10}
                        className="fill-blue-500 group-hover/pill:fill-white font-mono font-bold"
                      >
                        ↗
                      </text>
                    </g>
                  )}

                  {/* 悬停/选中微型交互工具栏 */}
                  {isToolbarVisible && (
                    <g transform={`translate(${pos.width + 6}, ${pos.height / 2 - 10})`}>
                      {/* 添加子节点按钮 */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          addChild(pos.id);
                        }}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        <title>添加子节点</title>
                        <circle cx={10} cy={10} r={9} className="fill-blue-500 stroke-white dark:stroke-zinc-900" strokeWidth={1.5} />
                        <text x={10} y={13.5} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">+</text>
                      </g>

                      {/* 关联 Block 按钮 */}
                      <g
                        transform="translate(24, 0)"
                        onClick={(e) => {
                          e.stopPropagation();
                          const target = e.currentTarget as SVGGraphicsElement;
                          const rect = target.getBoundingClientRect();
                          setLinkPopover({ nodeId: pos.id, rect });
                        }}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        <title>关联或生成画布 Block</title>
                        <circle
                          cx={10}
                          cy={10}
                          r={9}
                          className={linkedBlock ? 'fill-emerald-500' : 'fill-purple-500'}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text x={10} y={13} textAnchor="middle" fill="#ffffff" fontSize={9}>🔗</text>
                      </g>

                      {/* 删除节点按钮（根节点不可删） */}
                      {!isRoot && (
                        <g
                          transform="translate(48, 0)"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNode(pos.id);
                            if (selectedNodeId === pos.id) setSelectedNodeId(null);
                          }}
                          className="cursor-pointer hover:scale-110 transition-transform"
                        >
                          <title>删除该节点及子分支</title>
                          <circle cx={10} cy={10} r={9} className="fill-red-500 stroke-white dark:stroke-zinc-900" strokeWidth={1.5} />
                          <text x={10} y={13.5} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold">×</text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* 折叠/展开小徽章（有子节点时呈现） */}
                  {hasChildren && (
                    <g
                      transform={`translate(${pos.width - 6}, ${pos.height / 2})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(pos.id);
                      }}
                      className="cursor-pointer hover:scale-125 transition-transform"
                    >
                      <title>{pos.node.collapsed ? '展开分支' : '折叠分支'}</title>
                      <circle
                        r={6}
                        className="fill-gray-300 dark:fill-zinc-600 stroke-white dark:stroke-zinc-900"
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize={9}
                        className="fill-gray-700 dark:fill-zinc-200 font-bold"
                      >
                        {pos.node.collapsed ? '+' : '−'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 节点关联 Block 弹窗 (React Portal 脱离 SVG 限制) */}
      {linkPopover && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setLinkPopover(null)} />
          <div
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 text-xs animate-scale-in"
            style={{
              top: Math.min(Math.max(linkPopover.rect.bottom + 10, 80), window.innerHeight - 380),
              left: Math.min(Math.max(linkPopover.rect.left - 160, 20), window.innerWidth - 440),
              position: 'fixed',
            }}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-zinc-200">
                <Link2 className="w-4 h-4 text-blue-500" />
                <span>关联画布 Block 到导图分支</span>
              </div>
              <button
                onClick={() => setLinkPopover(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 当前关联状态 */}
            {(() => {
              const activeNode = (() => {
                let found: MindmapNode | null = null;
                const search = (n: MindmapNode) => {
                  if (n.id === linkPopover.nodeId) found = n;
                  n.children?.forEach(search);
                };
                search(root);
                return found as MindmapNode | null;
              })();

              const linked = activeNode?.linkedBlockId
                ? blocks.find((b) => b.id === activeNode.linkedBlockId)
                : null;

              return (
                <div className="py-2.5">
                  {linked ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-3">
                      <div className="flex items-center gap-2 truncate">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-medium text-blue-700 dark:text-blue-300 truncate">
                          已关联: {linked.title || linked.type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnlinkBlock(linkPopover.nodeId)}
                        className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Unlink className="w-3 h-3" />
                        解除关联
                      </button>
                    </div>
                  ) : null}

                  {/* 快捷新建并关联 Block */}
                  <div className="mb-3">
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 mb-1.5 block">
                      ⚡ 基于此分支在画布直接生成落地 Block：
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => activeNode && handleCreateAndLinkBlock(activeNode, 'todo')}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all text-gray-700 dark:text-zinc-300"
                      >
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                        <span className="text-[11px]">新建待办</span>
                      </button>
                      <button
                        onClick={() => activeNode && handleCreateAndLinkBlock(activeNode, 'text')}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all text-gray-700 dark:text-zinc-300"
                      >
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-[11px]">新建文档</span>
                      </button>
                      <button
                        onClick={() => activeNode && handleCreateAndLinkBlock(activeNode, 'code')}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-gray-700 dark:text-zinc-300"
                      >
                        <Code2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px]">新建代码</span>
                      </button>
                    </div>
                  </div>

                  {/* 选择画布已有 Block */}
                  <div>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 mb-1.5 block">
                      🔗 或选择画布现有 Block 建立链接：
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {candidateBlocks.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 dark:text-zinc-500 text-xs">
                          画布暂无其他可关联的 Block
                        </div>
                      ) : (
                        candidateBlocks.map((b) => {
                          const isCurrentLinked = activeNode?.linkedBlockId === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => handleLinkBlock(linkPopover.nodeId, b.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                                isCurrentLinked
                                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                                  : 'border-transparent hover:border-gray-200 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {b.type === 'todo' && <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                {b.type === 'code' && <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                {b.type === 'table' && <Table className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                {b.type === 'text' && <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                {b.type === 'media' && <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                                {b.type === 'whiteboard' && <PenTool className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                                {b.type === 'math' && <Sigma className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                                <span className="truncate">{b.title || `${b.type.toUpperCase()} 块`}</span>
                              </div>
                              {isCurrentLinked && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
