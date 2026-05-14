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
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded bg-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-mono tracking-wider">BlockOS</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-600 text-xs font-mono">loading</span>
          </div>
        </div>
      </div>
    );
  }

  return <BlockOSApp />;
}
