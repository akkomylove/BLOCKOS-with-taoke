/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useCallback } from 'react';
import { ImageIcon, Video, Music, Link2, Upload, Edit3, ExternalLink, Sparkles, Loader2 } from 'lucide-react';

interface MediaBlockProps {
  content: string;
  caption?: string;
  onChange: (content: string, caption?: string) => void;
  readOnly?: boolean;
}

function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'unknown' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('bilibili.com')) return 'video';
  return 'unknown';
}

function getMediaLabel(type: 'image' | 'video' | 'audio' | 'unknown') {
  switch (type) {
    case 'image': return { label: '图片', icon: ImageIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'video': return { label: '视频', icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    case 'audio': return { label: '音频', icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    default: return { label: '链接', icon: Link2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  }
}

export default function MediaBlock({ content, caption, onChange, readOnly }: MediaBlockProps) {
  const [isEditing, setIsEditing] = useState(!content);
  const [url, setUrl] = useState(content);
  const [isHovering, setIsHovering] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaType = detectMediaType(content);
  const mediaInfo = getMediaLabel(mediaType);

  const handleAnalyzeImage = useCallback(async () => {
    if (mediaType !== 'image' || !content) return;
    setAnalyzing(true);
    setAnalysisResult('');
    try {
      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: content, prompt: '请详细描述这张图片的内容' }),
      });
      if (!res.ok) throw new Error('Failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
      setAnalysisResult(accumulated.trim() || '分析完成');
    } catch {
      setAnalysisResult('图片分析失败');
    } finally {
      setAnalyzing(false);
    }
  }, [mediaType, content]);

  const handleUrlSubmit = () => {
    if (url.trim()) {
      onChange(url.trim());
      setIsEditing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onChange(result);
        setIsEditing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderMedia = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div className="relative overflow-hidden rounded-xl border border-gray-300/40 dark:border-zinc-700/40 bg-gray-50/30 dark:bg-zinc-950/30">
            <img
              src={content}
              alt={caption || '媒体'}
              className="w-full max-h-96 object-contain"
              onError={() => onChange('')}
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3 transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${mediaInfo.bg} ${mediaInfo.color} border ${mediaInfo.border}`}>
                  <mediaInfo.icon className="w-3 h-3 inline mr-1" />
                  {mediaInfo.label}
                </span>
                {!readOnly && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 bg-white/80 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-gray-700 dark:text-zinc-300" />
                    </button>
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={analyzing}
                      className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                      title="AI 分析图片"
                    >
                      {analyzing ? <Loader2 className="w-3 h-3 text-purple-500 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="relative rounded-xl overflow-hidden border border-gray-300/40 dark:border-zinc-700/40 bg-gray-50/30 dark:bg-zinc-950/30">
            <video
              src={content}
              controls
              className="w-full max-h-96 rounded-xl"
              onError={() => onChange('')}
            />
            {!readOnly && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                style={{ opacity: isHovering ? 1 : 0 }}
              >
                <Edit3 className="w-3 h-3 text-gray-700 dark:text-zinc-300" />
              </button>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className={`rounded-xl border ${mediaInfo.border} ${mediaInfo.bg} p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${mediaInfo.bg} border ${mediaInfo.border} flex items-center justify-center`}>
                <Music className={`w-5 h-5 ${mediaInfo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-zinc-200 font-medium truncate">{caption || '音频文件'}</p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate">{content.length > 50 ? content.substring(0, 50) + '...' : content}</p>
              </div>
              {!readOnly && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                </button>
              )}
            </div>
            <audio src={content} controls className="w-full h-8" onError={() => onChange('')} />
          </div>
        );
      default:
        return (
          <div className={`rounded-xl border ${mediaInfo.border} ${mediaInfo.bg} p-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${mediaInfo.bg} border ${mediaInfo.border} flex items-center justify-center`}>
                <Link2 className={`w-5 h-5 ${mediaInfo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 hover:underline truncate block transition-colors"
                >
                  {content}
                </a>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">外部链接</p>
              </div>
              <a href={content} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-500" />
              </a>
            </div>
          </div>
        );
    }
  };

  if (isEditing || !content) {
    return (
      <div className="w-full rounded-xl border-2 border-dashed border-gray-300/60 dark:border-zinc-700/60 hover:border-blue-500/30 bg-gray-50/30 dark:bg-zinc-900/30 transition-all duration-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-zinc-500">图片</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-zinc-500">视频</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-zinc-500">音频</span>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="粘贴图片/视频/音频链接..."
              className="flex-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              添加
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 rounded-xl transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              上传本地文件
            </button>
            <span className="text-[10px] text-gray-400 dark:text-zinc-600">或拖放文件到此处</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      {renderMedia()}
      {caption !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={caption}
              onChange={(e) => onChange(content, e.target.value)}
              placeholder="添加描述..."
              className="w-full bg-transparent text-center text-xs text-gray-500 dark:text-zinc-500 outline-none placeholder-gray-400 dark:placeholder-zinc-600"
              readOnly={readOnly}
            />
          </div>
        </div>
      )}
      {analysisResult && (
        <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-xs text-purple-300 leading-relaxed">{analysisResult}</p>
        </div>
      )}
    </div>
  );
}