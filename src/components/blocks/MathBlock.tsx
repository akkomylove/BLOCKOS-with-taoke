'use client';

import { useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Edit3, Eye, Sigma, FunctionSquare, Integral, Grid3X3 } from 'lucide-react';

interface MathBlockProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

const TEMPLATES = [
  { label: '求和', icon: <Sigma className="w-3.5 h-3.5" />, latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' },
  { label: '积分', icon: <Integral className="w-3.5 h-3.5" />, latex: '\\int_{a}^{b} f(x) \\, dx' },
  { label: '矩阵', icon: <Grid3X3 className="w-3.5 h-3.5" />, latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: '函数', icon: <FunctionSquare className="w-3.5 h-3.5" />, latex: 'f(x) = \\frac{1}{\\sqrt{2\\pi}} e^{-\\frac{x^2}{2}}' },
];

export default function MathBlock({ content, onChange, readOnly }: MathBlockProps) {
  const [isEditing, setIsEditing] = useState(!content);
  const [latex, setLatex] = useState(content || '');
  const [error, setError] = useState('');

  const render = useCallback((src: string) => {
    if (!src.trim()) return '';
    try {
      const html = katex.renderToString(src, {
        throwOnError: true,
        displayMode: true,
      });
      setError('');
      return html;
    } catch (e: any) {
      setError(e.message || '渲染失败');
      return '';
    }
  }, []);

  const handleSave = () => {
    onChange(latex);
    setIsEditing(false);
  };

  const insertTemplate = (tpl: string) => {
    const newLatex = latex ? `${latex} \\quad ${tpl}` : tpl;
    setLatex(newLatex);
  };

  return (
    <div className="w-full space-y-2">
      {!readOnly && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              isEditing ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            {isEditing ? '预览' : '编辑'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="px-2 py-1 rounded text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            >
              保存
            </button>
          )}
        </div>
      )}

      {isEditing && !readOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => insertTemplate(t.latex)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="输入 LaTeX 公式..."
            className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono outline-none focus:border-blue-500/40 resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {(!isEditing || readOnly) && (
        <div className="w-full min-h-[60px] flex items-center justify-center bg-zinc-900/50 rounded-lg border border-zinc-800 px-4 py-3">
          {latex.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: render(latex) }} />
          ) : (
            <span className="text-xs text-zinc-600">输入 LaTeX 公式进行渲染</span>
          )}
        </div>
      )}
    </div>
  );
}
