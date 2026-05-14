'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

interface MindmapNode {
  id: string;
  text: string;
  children: MindmapNode[];
  collapsed?: boolean;
}

interface MindmapBlockProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultMindmap(): MindmapNode {
  return {
    id: generateId(),
    text: '中心主题',
    children: [
      { id: generateId(), text: '分支 1', children: [] },
      { id: generateId(), text: '分支 2', children: [] },
    ],
  };
}

function parseMindmap(content: string): MindmapNode {
  if (!content) return createDefaultMindmap();
  try {
    return JSON.parse(content);
  } catch {
    return createDefaultMindmap();
  }
}

export default function MindmapBlock({ content, onChange, readOnly }: MindmapBlockProps) {
  const [root, setRoot] = useState<MindmapNode>(() => parseMindmap(content));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const save = useCallback(
    (newRoot: MindmapNode) => {
      setRoot(newRoot);
      onChange(JSON.stringify(newRoot));
    },
    [onChange]
  );

  const updateNode = (node: MindmapNode, id: string, updater: (n: MindmapNode) => MindmapNode): MindmapNode => {
    if (node.id === id) return updater({ ...node });
    return { ...node, children: node.children.map((c) => updateNode(c, id, updater)) };
  };

  const addChild = (parentId: string) => {
    const newRoot = updateNode(root, parentId, (n) => ({
      ...n,
      collapsed: false,
      children: [...n.children, { id: generateId(), text: '新节点', children: [] }],
    }));
    save(newRoot);
  };

  const removeNode = (id: string) => {
    const removeFrom = (node: MindmapNode): MindmapNode | null => {
      if (node.id === id) return null;
      return { ...node, children: node.children.map(removeFrom).filter(Boolean) as MindmapNode[] };
    };
    const newRoot = removeFrom(root);
    if (newRoot) save(newRoot);
  };

  const toggleCollapse = (id: string) => {
    const newRoot = updateNode(root, id, (n) => ({ ...n, collapsed: !n.collapsed }));
    save(newRoot);
  };

  const startEdit = (node: MindmapNode) => {
    setEditingId(node.id);
    setEditText(node.text);
  };

  const saveEdit = (id: string) => {
    const newRoot = updateNode(root, id, (n) => ({ ...n, text: editText.trim() || n.text }));
    save(newRoot);
    setEditingId(null);
  };

  const renderTree = (node: MindmapNode, depth: number, parentX: number, parentY: number, index: number, total: number): { nodes: React.ReactNode[]; lines: React.ReactNode[]; maxX: number } => {
    const NODE_W = 120;
    const NODE_H = 36;
    const GAP_X = 160;
    const GAP_Y = 50;

    const x = depth === 0 ? 80 : parentX + GAP_X;
    const y = depth === 0 ? 160 : parentY + (index - (total - 1) / 2) * GAP_Y;

    let allNodes: React.ReactNode[] = [];
    let allLines: React.ReactNode[] = [];
    let maxX = x + NODE_W;

    const isEditing = editingId === node.id;

    allNodes.push(
      <g key={node.id} transform={`translate(${x}, ${y})`}>
        <rect
          width={NODE_W}
          height={NODE_H}
          rx={8}
          fill={depth === 0 ? '#3b82f6' : '#27272a'}
          stroke={depth === 0 ? '#60a5fa' : '#52525b'}
          strokeWidth={1.5}
          className="transition-all"
        />
        {isEditing ? (
          <foreignObject x={4} y={6} width={NODE_W - 8} height={NODE_H - 12}>
            <input
              autoFocus
              className="w-full h-full bg-transparent text-zinc-100 text-xs text-center outline-none"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => saveEdit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(node.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </foreignObject>
        ) : (
          <text
            x={NODE_W / 2}
            y={NODE_H / 2 + 4}
            textAnchor="middle"
            fill={depth === 0 ? '#ffffff' : '#d4d4d8'}
            fontSize={12}
            className="cursor-pointer"
            onClick={() => !readOnly && startEdit(node)}
          >
            {node.text}
          </text>
        )}
        {!readOnly && (
          <>
            {node.children.length > 0 && (
              <g transform={`translate(${NODE_W + 4}, ${NODE_H / 2 - 6})`} onClick={() => toggleCollapse(node.id)} className="cursor-pointer">
                <circle r={6} fill="#3f3f46" />
                <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={10}>
                  {node.collapsed ? '+' : '-'}
                </text>
              </g>
            )}
            <g transform={`translate(${NODE_W / 2 - 6}, ${NODE_H + 4})`} onClick={() => addChild(node.id)} className="cursor-pointer">
              <circle r={6} fill="#3f3f46" />
              <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={10}>+</text>
            </g>
            {depth > 0 && (
              <g transform={`translate(-10, ${NODE_H / 2})`} onClick={() => removeNode(node.id)} className="cursor-pointer">
                <circle r={6} fill="#3f3f46" />
                <text x={0} y={3} textAnchor="middle" fill="#ef4444" fontSize={10}>×</text>
              </g>
            )}
          </>
        )}
      </g>
    );

    if (!node.collapsed) {
      node.children.forEach((child, i) => {
        const childResult = renderTree(child, depth + 1, x + NODE_W, y, i, node.children.length);
        allNodes = allNodes.concat(childResult.nodes);
        allLines = allLines.concat(childResult.lines);
        maxX = Math.max(maxX, childResult.maxX);

        allLines.push(
          <path
            key={`line-${node.id}-${child.id}`}
            d={`M ${x + NODE_W} ${y + NODE_H / 2} C ${x + NODE_W + 40} ${y + NODE_H / 2}, ${childResult.nodes[0]?.props?.transform?.match(/translate\(([^,]+),\s*([^)]+)\)/)?.[1] || x + GAP_X} ${parseFloat(childResult.nodes[0]?.props?.transform?.match(/translate\(([^,]+),\s*([^)]+)\)/)?.[2] || y) + NODE_H / 2}, ${childResult.nodes[0]?.props?.transform?.match(/translate\(([^,]+),\s*([^)]+)\)/)?.[1] || x + GAP_X} ${parseFloat(childResult.nodes[0]?.props?.transform?.match(/translate\(([^,]+),\s*([^)]+)\)/)?.[2] || y) + NODE_H / 2}`}
            fill="none"
            stroke="#52525b"
            strokeWidth={1}
          />
        );
      });
    }

    return { nodes: allNodes, lines: allLines, maxX };
  };

  const { nodes, lines, maxX } = renderTree(root, 0, 0, 0, 0, 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} width={Math.max(maxX + 40, 400)} height={320} className="min-w-full">
        {lines}
        {nodes}
      </svg>
    </div>
  );
}
