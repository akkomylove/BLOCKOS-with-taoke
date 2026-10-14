'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Settings, X, Check, FileSpreadsheet, ClipboardPaste, Upload } from 'lucide-react';
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

function parseClipboardTable(text: string, html?: string): string[][] | null {
  // 优先解析来自 Excel / WPS / Google Sheets 的 HTML Table 剪贴板
  if (html && html.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      if (trs.length > 0) {
        const grid = trs.map((tr) => {
          const cells = Array.from(tr.querySelectorAll('td, th'));
          return cells.map((c) => (c.textContent || '').trim());
        });
        if (grid.length > 0 && grid[0].length > 0) {
          return grid;
        }
      }
    } catch {
      // 容错降级至文本解析
    }
  }

  // 解析纯文本 TSV（Excel 默认剪贴板纯文本）或 CSV
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return null;
  const lines = clean.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  if (lines.length === 0) return null;

  const hasTabs = lines.some((l) => l.includes('\t'));
  const delimiter = hasTabs ? '\t' : (lines[0].includes(',') ? ',' : '\t');

  return lines.map((line) => {
    if (delimiter === ',') {
      const cells: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      cells.push(cur.trim().replace(/^"|"$/g, ''));
      return cells;
    }
    return line.split(delimiter).map((c) => c.trim());
  });
}

export default function TableBlock({ data, onChange, readOnly }: TableBlockProps) {
  const [showTypeEditor, setShowTypeEditor] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [tempOptions, setTempOptions] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const columns = data.columns || (data as unknown as { headers?: string[] }).headers || [];
  const rows = data.rows || [];
  const columnTypes: TableColumn[] = data.columnTypes || columns.map((c) => ({ name: c, type: 'text' as const }));

  // 将二维网格数据注入表格模型
  const applyGridData = useCallback((grid: string[][]) => {
    if (!grid || grid.length === 0 || grid[0].length === 0) return;

    // 当现有表格无数据或仅有空白时，将首行自动解析为列头
    const isCurrentEmpty = rows.length === 0 || (rows.length === 1 && rows[0].every((c) => !c));
    let newColumns: string[] = [];
    let newRows: string[][] = [];

    if (isCurrentEmpty) {
      newColumns = grid[0].map((h, i) => h || `列 ${i + 1}`);
      newRows = grid.slice(1);
      if (newRows.length === 0) {
        newRows = [Array(newColumns.length).fill('')];
      }
    } else {
      // 若已有结构，扩展列宽并追加行
      const maxCols = Math.max(columns.length, grid[0].length);
      newColumns = [...columns];
      while (newColumns.length < maxCols) {
        newColumns.push(`列 ${newColumns.length + 1}`);
      }
      newRows = [
        ...rows.map((r) => [...r, ...Array(maxCols - r.length).fill('')]),
        ...grid.map((r) => [...r, ...Array(maxCols - r.length).fill('')]),
      ];
    }

    // 智能推断列类型（纯数字 -> number，纯日期 -> date）
    const newTypes: TableColumn[] = newColumns.map((colName, colIdx) => {
      const sampleValues = newRows.map((r) => r[colIdx]).filter(Boolean);
      let detectedType: TableColumn['type'] = 'text';
      if (sampleValues.length > 0 && sampleValues.every((v) => !isNaN(Number(v)))) {
        detectedType = 'number';
      } else if (sampleValues.length > 0 && sampleValues.every((v) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v))) {
        detectedType = 'date';
      }
      return { name: colName, type: detectedType };
    });

    onChange({
      columns: newColumns,
      columnTypes: newTypes,
      rows: newRows,
    });

    setPasteNotice(`成功导入 Excel 表格：${newRows.length} 行 × ${newColumns.length} 列`);
    setTimeout(() => setPasteNotice(null), 3000);
  }, [columns, rows, onChange]);

  // 处理剪贴板粘贴（支持从 Excel 复制单元格后在表格任意处 Ctrl+V 粘贴）
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    // 判定是否包含表格多行数据、制表符或 HTML Table
    if ((text && (text.includes('\t') || text.includes('\n'))) || (html && html.includes('<table'))) {
      const grid = parseClipboardTable(text, html);
      if (grid && grid.length > 0 && (grid.length > 1 || grid[0].length > 1)) {
        e.preventDefault();
        applyGridData(grid);
      }
    }
  }, [readOnly, applyGridData]);

  // 从剪贴板主动读取（适配点击工具栏“粘贴 Excel”按钮）
  const handleManualPaste = useCallback(async () => {
    if (readOnly || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const grid = parseClipboardTable(text);
        if (grid && grid.length > 0) {
          applyGridData(grid);
        }
      }
    } catch {
      alert('请使用键盘快捷键 Ctrl + V 直接在表格区域粘贴 Excel 内容');
    }
  }, [readOnly, applyGridData]);

  // 拖放 .csv / .tsv 文件导入
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        if (fileContent) {
          const grid = parseClipboardTable(fileContent);
          if (grid && grid.length > 0) {
            applyGridData(grid);
          }
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  }, [readOnly, applyGridData]);

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
            className="w-full bg-transparent text-center text-xs font-normal text-gray-900 dark:text-zinc-100 outline-none"
            readOnly={readOnly}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-transparent text-center text-xs font-normal text-gray-900 dark:text-zinc-100 outline-none"
            readOnly={readOnly}
          />
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={() => toggleCheckbox(rowIndex, colIndex)}
            className="w-4 h-4 accent-blue-600 dark:accent-blue-500 cursor-pointer"
            disabled={readOnly}
          />
        );
      case 'select':
        const options = columnTypes[colIndex]?.options || [];
        return (
          <select
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 text-center text-xs font-medium text-gray-900 dark:text-zinc-100 outline-none rounded border border-gray-300 dark:border-zinc-700 py-0.5"
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
            className="w-full bg-transparent text-center text-xs text-blue-500 dark:text-blue-400 hover:underline outline-none"
            readOnly={readOnly}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
            className="w-full bg-transparent text-left text-xs font-normal text-gray-900 dark:text-zinc-100 outline-none px-1"
            readOnly={readOnly}
          />
        );
    }
  };

  return (
    <div
      className="w-full relative"
      onPaste={handlePaste}
      onDragOver={(e) => {
        if (!readOnly) {
          e.preventDefault();
          setIsDraggingFile(true);
        }
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      {/* 拖拽文件覆盖层 */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-30 bg-blue-500/10 dark:bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none animate-in fade-in">
          <FileSpreadsheet className="w-8 h-8 text-blue-500 animate-bounce" />
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">松开鼠标即可自动解析并导入 Excel / CSV 表格数据</span>
        </div>
      )}

      {/* 导入成功提示条 */}
      {pasteNotice && (
        <div className="mb-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>{pasteNotice}</span>
          </span>
          <button onClick={() => setPasteNotice(null)} className="hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowTypeEditor(!showTypeEditor)}
              className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-3 h-3" />
              列类型
            </button>
            <button
              onClick={handleManualPaste}
              className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"
              title="支持从 Excel / WPS / 网页表格直接复制后 Ctrl+V 粘贴"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>粘贴 Excel</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={addColumn}
              className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3 h-3" />
              列
            </button>
            <button
              onClick={addRow}
              className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3 h-3" />
              行
            </button>
          </div>
        </div>
      )}

      {showTypeEditor && !readOnly && (
        <div className="mb-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs">
          <div className="text-[10px] text-gray-400 dark:text-zinc-500 mb-2">配置列数据类型与选项：</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-20 truncate text-gray-600 dark:text-zinc-400">{col}</span>
                <select
                  value={columnTypes[i]?.type || 'text'}
                  onChange={(e) => updateColumnType(i, e.target.value as TableColumn['type'])}
                  className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 outline-none"
                >
                  {Object.entries(COLUMN_TYPE_LABELS).map(([t, l]) => (
                    <option key={t} value={t}>{l}</option>
                  ))}
                </select>
                {columnTypes[i]?.type === 'select' && (
                  <>
                    {editingColIndex === i ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={tempOptions}
                          onChange={(e) => setTempOptions(e.target.value)}
                          placeholder="选项用逗号分隔"
                          className="flex-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs"
                        />
                        <button onClick={() => saveOptions(i)} className="p-0.5 hover:text-green-500">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingColIndex(null)} className="p-0.5 hover:text-gray-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingColIndex(i);
                          setTempOptions((columnTypes[i]?.options || []).join(', '));
                        }}
                        className="text-[10px] text-blue-500 hover:underline"
                      >
                        {(columnTypes[i]?.options || []).length > 0 ? `${columnTypes[i].options!.length} 项` : '设置选项'}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100/90 dark:bg-zinc-800/90 border-b border-gray-200 dark:border-zinc-800">
              {columns.map((col, i) => (
                <th key={i} className="border-r last:border-r-0 border-gray-200 dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-gray-900 dark:text-zinc-100 min-w-[90px] text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{col}</span>
                    {!readOnly && columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(i)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                        title="删除列"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && <th className="w-8 border-l border-gray-200 dark:border-zinc-800 bg-gray-100/90 dark:bg-zinc-800/90" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/80">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-gray-50/90 dark:hover:bg-zinc-800/40 transition-colors">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className={`border-r last:border-r-0 border-gray-200 dark:border-zinc-800/80 px-2.5 py-1.5 ${colIndex === 0 ? 'bg-gray-50/70 dark:bg-zinc-900/40 font-medium' : ''}`}>
                    {renderCellInput(rowIndex, colIndex, cell)}
                  </td>
                ))}
                {!readOnly && (
                  <td className="w-8 text-center border-l border-gray-200 dark:border-zinc-800/80">
                    <button
                      onClick={() => removeRow(rowIndex)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-opacity"
                      title="删除行"
                    >
                      <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="mt-2 text-center py-6 px-4 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg text-gray-500 dark:text-zinc-400 text-xs flex flex-col items-center gap-1.5">
          <FileSpreadsheet className="w-6 h-6 text-emerald-500/70" />
          <p className="font-medium text-gray-700 dark:text-zinc-300">
            点击上方「+ 行」添加数据，或直接从 Excel / WPS 复制单元格后在此处 Ctrl+V 粘贴
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500">
            支持拖拽 .csv / .tsv 文件到表格直接自动解析导入
          </p>
        </div>
      )}
    </div>
  );
}
