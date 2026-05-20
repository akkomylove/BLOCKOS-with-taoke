import { useState, useCallback } from 'react';
import type { AnalyzeRequest, AnalyzeResponse, CopilotRequest, CopilotResponse, CodeLabRequest, CodeLabResponse, VizAssistRequest, VizAssistResponse, VersionSummaryRequest, VersionSummaryResponse, ChatRequest, ChatResponse, ReviewEnrichRequest, ReviewEnrichResponse, FoldPlanRequest, FoldPlanResponse, DocRelationsRequest, DocRelationsResponse } from '@/lib/ai';

interface UseAIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAIAction<TReq, TRes>(endpoint: string) {
  const [state, setState] = useState<UseAIState<TRes>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (payload: TReq): Promise<TRes | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, [endpoint]);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);
  return { ...state, execute, reset };
}

export function useAnalyze() { return useAIAction<AnalyzeRequest, AnalyzeResponse>('/api/ai/analyze'); }
export function useCopilot() { return useAIAction<CopilotRequest, CopilotResponse>('/api/ai/copilot'); }
export function useCodeLab() { return useAIAction<CodeLabRequest, CodeLabResponse>('/api/ai/code-lab'); }
export function useVizAssist() { return useAIAction<VizAssistRequest, VizAssistResponse>('/api/ai/viz-assist'); }
export function useVersionSummary() { return useAIAction<VersionSummaryRequest, VersionSummaryResponse>('/api/ai/version-summary'); }
export function useChat() { return useAIAction<ChatRequest, ChatResponse>('/api/ai/chat'); }
export function useReviewEnrich() { return useAIAction<ReviewEnrichRequest, ReviewEnrichResponse>('/api/ai/review-enrich'); }
export function useFoldPlan() { return useAIAction<FoldPlanRequest, FoldPlanResponse>('/api/ai/fold-plan'); }
export function useDocRelations() { return useAIAction<DocRelationsRequest, DocRelationsResponse>('/api/ai/doc-relations'); }
