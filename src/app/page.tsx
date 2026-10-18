'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const BlockOSApp = dynamic(() => import('@/components/BlockOSApp'), { ssr: false });

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f8fa] dark:bg-[#141517] text-[#1f2329] dark:text-[#f2f3f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] dark:bg-blue-500/15 border border-[#dee0e3] dark:border-blue-500/30 flex items-center justify-center shadow-sm">
            <div className="w-5 h-5 rounded-md bg-[#3370ff] animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#1f2329] dark:text-[#f2f3f5] text-sm font-medium tracking-tight">BlockOS</span>
            <span className="text-[#8f959e] text-xs">·</span>
            <span className="text-[#646a73] dark:text-[#9ca3af] text-xs">正在连接知识工作区</span>
          </div>
        </div>
      </div>
    );
  }

  return <BlockOSApp />;
}
