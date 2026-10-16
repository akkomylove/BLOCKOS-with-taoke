'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

const loading = () => <div className="grid h-[100dvh] place-items-center text-sm text-zinc-500">正在打开 BlockOS…</div>;
const DesktopWorkspace = dynamic(() => import('./DesktopWorkspace'), { ssr: false, loading });
const MobileWorkspace = dynamic(() => import('./mobile/MobileWorkspace'), { ssr: false, loading });
const query = '(max-width: 767px), (max-width: 1023px) and (pointer: coarse)';
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => null;

export default function BlockOSApp() {
  const mobile = useSyncExternalStore<boolean | null>(subscribe, getSnapshot, getServerSnapshot);
  if (mobile === null) return loading();
  return mobile ? <MobileWorkspace /> : <DesktopWorkspace />;
}
