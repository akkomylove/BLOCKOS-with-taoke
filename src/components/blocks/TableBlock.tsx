'use client';

import { useState } from 'react';
import { Plus, Trash2, Settings, X, Check } from 'lucide-react';
import type { TableData, TableColumn } from '@/types/block';

interface TableBlockProps {
  data: TableData;
  onChange: (data: TableData) => void;
  readOnly?: boolean;
}

const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '下拉',
  checkbox: '复选',
  link: '链接',
};

export default function TableBlock({ data, onChange, readOnly }: TableBlockProps) {
  const [showTypeEditor, setShowTypeEditor] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [tempOptions, setTempOptions] = useState('');

  const columns = data.columns || [];
  const rows = data.rows || [];
  const columnTypes: TableColumn[] = data.columnTypes || columns.map((c) => ({ name: c, type: 'text' as const }));

  const addColumn = () => {
    const newCol = `列 ${columns.length + 1}`;
    onChange({
      columns: [...columns, newCol],
      columnTypes: [...columnTypes, { name: newCol, type: 'text' }],
      rows: rows.map((row) => [...row, '']),
    });
  };

  const addRow = () => {
    onChange({
      ...data,
      rows: [...rows, Array(columns.length).fill('')],
    });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, i) =>
      i === rowIndex ? row.map((cell, j) => (j === colIndex ? value : cell)) : row
    );
    onChange({ ...data, rows: newRows });
  };

  const toggleCheckbox = (rowIndex: number, colIndex: number) => {
    const current = rows[rowIndex]?.[colIndex] || '';
    updateCell(rowIndex, colIndex, current === 'true' ? '' : 'true');
  };

  const removeRow = (index: number) => {
    onChange({ ...data, rows: rows.filter((_, i) => i !== index) });
  };

  const removeColumn = (index: number) => {
    onChange({
      columns: columns.filter((_, i) => i !== index),
      columnTypes: columnTypes.filter((_, i) => i !== index),
      rows: rows.map((row) => row.filter((_, i) => i !== index)),
    });
  };

  const updateColumnType = (index: number, type: TableColumn['type']) => {
    const newTypes: TableColumn[] = [...columnTypes];
    newTypes[index] = { ...newTypes[index], type, options: type === 'select' ? newTypes[index]?.options : undefined };
    onChange({ ...data, columnTypes: newTypes });
  };

  const saveOptions = (index: number) => {
    const newTypes = [...columnTypes];
    newTypes[index] = { ...newTypes[index], options: tempOptions.split(',').map((s) => s.trim()).filter(Boolean) };
    onChange({ ...data, columnTypes: newTypes });
    setEditingColIndex(null);
    setTempOptions('');
  };

  const renderCellInput = (rowIndex: number, colIndex: number, value: string) => {
    const colType = columnTypes[colIndex]?.type || 'text';

    switch (colType) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-transparent text-center text-sm text-zinc-200 outline-none"
            readOnly={readOnly}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-transparent text-center text-sm text-zinc-200 outline-none"
            readOnly={readOnly}
          />
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={() => toggleCheckbox(rowIndex, colIndex)}
            className="w-4 h-4 accent-blue-500"
            disabled={readOnly}
          />
        );
      case 'select':
        const options = columnTypes[colIndex]?.options || [];
        return (
          <select
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 text-center text-sm text-gray-800 dark:text-zinc-200 outline-none rounded border border-gray-200 dark:border-zinc-700"
            disabled={readOnly}
          >
            <option value="">--</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'link':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            placeholder="https://"
            className="w-full bg-transparent text-center text-sm text-blue-400 outline-none placeholder-zinc-600"
            readOnly={readOnly}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-transparent text-center text-sm text-zinc-200 outline-none"
            readOnly={readOnly}
          />
        );
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTypeEditor(!showTypeEditor)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
          >
            <Settings className="w-3 h-3" />
            列类型
          </button>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={addColumn}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              列
            </button>
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              行
            </button>
          </div>
        )}
      </div>

      {showTypeEditor && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400">列类型设置</span>
            <button onClick={() => setShowTypeEditor(false)} className="text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-zinc-300 w-20 truncate">{col}</span>
                <select
                  value={columnTypes[i]?.type || 'text'}
                  onChange={(e) => updateColumnType(i, e.target.value as TableColumn['type'])}
                  className="text-xs bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded px-2 py-1 outline-none border border-gray-200 dark:border-zinc-700"
                >
                  {Object.entries(COLUMN_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {columnTypes[i]?.type === 'select' && (
                  <>
                    {editingColIndex === i ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempOptions}
                          onChange={(e) => setTempOptions(e.target.value)}
                          placeholder="选项1,选项2,选项3"
                          className="text-xs bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded px-2 py-1 outline-none w-32 border border-gray-200 dark:border-zinc-700"
                        />
                        <button onClick={() => saveOptions(i)} className="text-emerald-500 dark:text-emerald-400">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingColIndex(i);
                          setTempOptions((columnTypes[i]?.options || []).join(','));
                        }}
                        className="text-[10px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 underline"
                      >
                        编辑选项
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="border border-gray-300 dark:border-zinc-700 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100/50 dark:bg-zinc-900/50 min-w-[80px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{col}</span>
                    {!readOnly && columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(i)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-200 dark:border-zinc-800 px-2 py-1">
                    {renderCellInput(rowIndex, colIndex, cell)}
                  </td>
                ))}
                {!readOnly && (
                  <td className="w-8">
                    <button
                      onClick={() => removeRow(rowIndex)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-4 text-gray-400 dark:text-zinc-600 text-xs">
          点击 + 行 添加数据
        </div>
      )}
    </div>
  );
}
