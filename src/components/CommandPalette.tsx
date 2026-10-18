'use client';

import ChatPanel from './ChatPanel';
import { useBlockStore } from '@/store/blockStore';
import { useAccountStore } from '@/store/accountStore';

// Preserve existing imports while both entry points share one assistant.
export { unescapeJsonString, extractStreamingDisplay, isBlockOSSelfIntroQuery, deriveTopicTitle, getLocalBlockOSCapabilityIntro } from '@/lib/canvas-assistant';

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const account = useAccountStore(state => state.user);
  const pageId = useBlockStore(state => state.currentPageId);
  return <ChatPanel key={`${account?.id}:${account?.mode}:${pageId}`} isOpen={isOpen} onClose={onClose} />;
}
