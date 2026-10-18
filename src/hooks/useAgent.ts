'use client';

import { useEffect, useRef } from 'react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

export function useAgent() {
  const agentEnabled = useBlockStore((state) => state.agentEnabled);
  const agentRules = useBlockStore((state) => state.agentRules);
  const blocks = useBlockStore((state) => state.blocks);

  const prevBlocksRef = useRef<Block[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 待用户自定义规则引擎完善后再开放自动触发；当前默认静默，避免注入演示卡片
    if (!agentEnabled || !agentRules || agentRules.length === 0) {
      prevBlocksRef.current = [...blocks];
      return;
    }

    prevBlocksRef.current = [...blocks];
  }, [blocks, agentEnabled, agentRules]);
}
