'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Type, AlignLeft, Wand2
} from 'lucide-react';

interface TextBlockProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

const FONT_FAMILIES = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Monaco', value: 'Monaco, monospace' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const COLORS = [
  { label: '默认', value: '' },
  { label: '白色', value: '#e4e4e7' },
  { label: '灰色', value: '#a1a1aa' },
  { label: '红色', value: '#f87171' },
  { label: '橙色', value: '#fb923c' },
  { label: '黄色', value: '#facc15' },
  { label: '绿色', value: '#4ade80' },
  { label: '蓝色', value: '#60a5fa' },
  { label: '紫色', value: '#c084fc' },
  { label: '粉色', value: '#f472b6' },
];

export default function TextBlock({
  content,
  onChange,
  readOnly,
  fontSize: initialFontSize,
  fontFamily: initialFontFamily,
  fontColor: initialFontColor,
  fontWeight: initialFontWeight,
  fontStyle: initialFontStyle,
  textDecoration: initialTextDecoration,
}: TextBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(initialFontSize || 14);
  const [fontFamily, setFontFamily] = useState(initialFontFamily || '');
  const [fontColor, setFontColor] = useState(initialFontColor || '');
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [ghostText, setGhostText] = useState('');
  const [showGhost, setShowGhost] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blockos-ai-autocomplete') !== 'false';
    }
    return true;
  });
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestTime = useRef(0);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== content) {
      ref.current.innerText = content;
    }
  }, [content]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(target)) {
        setShowFontPicker(false);
      }
      if (sizePickerRef.current && !sizePickerRef.current.contains(target)) {
        setShowSizePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompletion = useCallback(async (text: string) => {
    const now = Date.now();
    if (now - lastRequestTime.current < 3000) return;
    if (!aiEnabled) return;
    if (!text.trim() || text.trim().length < 5) return;
    lastRequestTime.current = now;

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `基于以下内容续写一句话（只返回续写的内容，不要重复原文，不要任何解释）：\n\n${text.slice(-200)}`,
          context: '',
        }),
      });
      if (!res.ok) return;
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
      const suggestion = accumulated.trim().slice(0, 60);
      if (suggestion && !text.endsWith(suggestion)) {
        setGhostText(suggestion);
        setShowGhost(true);
      }
    } catch {
      // ignore
    }
  }, [aiEnabled]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      const text = ref.current.innerText;
      onChange(text);
      setShowGhost(false);
      setGhostText('');
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        fetchCompletion(text);
      }, 1500);
    }
  }, [onChange, fetchCompletion]);

  const acceptGhost = useCallback(() => {
    if (ref.current && ghostText) {
      ref.current.innerText += ghostText;
      onChange(ref.current.innerText);
      setShowGhost(false);
      setGhostText('');
    }
  }, [ghostText, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showGhost && ghostText) {
      e.preventDefault();
      acceptGhost();
    }
  }, [showGhost, ghostText, acceptGhost]);

  const exec = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (ref.current) {
      onChange(ref.current.innerText);
    }
  };

  const insertList = (ordered: boolean) => {
    exec(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    setShowSizePicker(false);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    setShowFontPicker(false);
  };

  const handleColorChange = (color: string) => {
    setFontColor(color);
    setShowColorPicker(false);
    setCustomColor('');
  };

  const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setFontColor(value);
    }
  };

  const applyCustomColor = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
      setFontColor(customColor);
      setShowColorPicker(false);
      setCustomColor('');
    }
  };

  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily || undefined,
    color: fontColor || undefined,
    fontWeight: initialFontWeight || undefined,
    fontStyle: initialFontStyle || undefined,
    textDecoration: initialTextDecoration || undefined,
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => {
        setShowToolbar(false);
        setShowFontPicker(false);
        setShowColorPicker(false);
        setShowSizePicker(false);
      }}
    >
      {!readOnly && (
        <div
          className={`flex items-center gap-0.5 mb-1 transition-all duration-150 ${
            showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          <div className="flex items-center gap-0.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-zinc-700/50 rounded-lg p-1">
            <button
              onClick={() => exec('bold')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="粗体"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              onClick={() => exec('italic')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="斜体"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              onClick={() => exec('underline')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="下划线"
            >
              <Underline className="w-3 h-3" />
            </button>
            <button
              onClick={() => exec('strikeThrough')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="删除线"
            >
              <Strikethrough className="w-3 h-3" />
            </button>
            <div className="w-px h-3 bg-gray-300 dark:bg-zinc-600 mx-0.5" />
            <button
              onClick={() => setAiEnabled((v) => {
                const next = !v;
                localStorage.setItem('blockos-ai-autocomplete', String(next));
                return next;
              })}
              className={`p-1.5 rounded transition-colors ${
                aiEnabled
                  ? 'text-purple-500 dark:text-purple-400 hover:bg-purple-500/10 dark:hover:bg-purple-500/20'
                  : 'text-gray-400 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
              title={aiEnabled ? 'AI 补全已开启' : 'AI 补全已关闭'}
            >
              <Wand2 className="w-3 h-3" />
            </button>
            <div className="w-px h-3 bg-gray-300 dark:bg-zinc-600 mx-0.5" />
            <button
              onClick={() => insertList(false)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="无序列表"
            >
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => insertList(true)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
              title="有序列表"
            >
              <ListOrdered className="w-3 h-3" />
            </button>
            <div className="w-px h-3 bg-gray-300 dark:bg-zinc-600 mx-0.5" />
            <div className="relative" ref={sizePickerRef}>
              <button
                onClick={() => { setShowFontPicker(false); setShowColorPicker(false); setShowSizePicker(!showSizePicker); }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors flex items-center gap-0.5"
                title="字号"
              >
                <Type className="w-3 h-3" />
                <span className="text-[9px]">{fontSize}</span>
              </button>
              {showSizePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 z-20 max-h-40 overflow-y-auto">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFontSizeChange(s)}
                      className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${
                        fontSize === s ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400'
                      }`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={fontPickerRef}>
              <button
                onClick={() => { setShowSizePicker(false); setShowColorPicker(false); setShowFontPicker(!showFontPicker); }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
                title="字体"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              {showFontPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 z-20 min-w-[120px]">
                  {FONT_FAMILIES.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => handleFontFamilyChange(f.value)}
                      className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${
                        fontFamily === f.value ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400'
                      }`}
                      style={{ fontFamily: f.value || undefined }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => { setShowSizePicker(false); setShowFontPicker(false); setShowColorPicker(!showColorPicker); }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 transition-colors"
                title="颜色"
              >
                <div
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-zinc-600"
                  style={{ backgroundColor: fontColor || '#e4e4e7' }}
                />
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl p-2.5 z-20 w-52">
                  <div className="text-[10px] text-gray-400 dark:text-zinc-500 mb-2">预设颜色</div>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {COLORS.map((c) => {
                      const isSelected = fontColor === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() => handleColorChange(c.value)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${
                            isSelected
                              ? 'border-blue-500 dark:border-blue-400'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                          }`}
                          title={c.label}
                        >
                          <div
                            className="w-5 h-5 rounded-full border border-gray-200 dark:border-zinc-700"
                            style={{ backgroundColor: c.value || '#e4e4e7' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 dark:border-zinc-700 pt-2.5">
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500 mb-1.5">自定义颜色</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColor || fontColor || '#e4e4e7'}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setFontColor(e.target.value);
                        }}
                        className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customColor || fontColor || ''}
                        onChange={handleCustomColor}
                        placeholder="#000000"
                        className="flex-1 min-w-0 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-gray-700 dark:text-zinc-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
                      />
                      <button
                        onClick={applyCustomColor}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] transition-colors"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="relative">
        <div
          ref={ref}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[40px] outline-none leading-relaxed text-gray-800 dark:text-zinc-200 whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-zinc-600"
          data-placeholder="输入文本..."
          data-ghost={showGhost && ghostText ? ghostText : ''}
          style={style}
        />
        {showGhost && ghostText && (
          <div className="text-[9px] text-purple-400/70 mt-0.5 select-none pointer-events-none">
            按 Tab 接受建议
          </div>
        )}
      </div>
    </div>
  );
}