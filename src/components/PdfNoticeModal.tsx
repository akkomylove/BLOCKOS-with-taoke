'use client';

import { useState, useEffect } from 'react';
import { X, FileText, AlertTriangle, ExternalLink } from 'lucide-react';

interface PdfNoticeModalProps {
  onClose: () => void;
}

export default function PdfNoticeModal({ onClose }: PdfNoticeModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('blockos-pdf-notice-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('blockos-pdf-notice-dismissed', 'true');
    setIsVisible(false);
    onClose();
  };

  const handleOpenPdf = () => {
    window.open('/FDoc-赛道四-曹琅+杜诺琦+伍菲琪_说明文档(1).pdf', '_blank');
  };

  const handleDismissAndOpenPdf = () => {
    localStorage.setItem('blockos-pdf-notice-dismissed', 'true');
    setIsVisible(false);
    onClose();
    window.open('/FDoc-赛道四-曹琅+杜诺琦+伍菲琪_说明文档(1).pdf', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">重要说明</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              我们团队在截止前十分钟进行提交确定，但是可能由于视频内存太大了所以导致最终版本没有提交成功，视频和文档和当前的 demo 演示有微小偏差，请以当前说明文档和 demo 为主。
            </p>
          </div>

          <button
            onClick={handleDismissAndOpenPdf}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            查看说明文档 (PDF)
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClose}
            className="w-full text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
