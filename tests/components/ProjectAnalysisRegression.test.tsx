import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIAnalysisPreview } from '@/components/collaboration/AIAnalysisPreview';
import { normalizeProjectAnalysis } from '@/lib/project-analysis';
import type { AIAnalysisResult } from '@/types/collaboration';

describe('malformed AI plan analysis cannot crash the application', () => {
  it('normalizes nulls, non-array lists and object-valued fields at the render boundary', () => {
    const malformed = { tasks: [null, { title: { bad: true } }, { title: 'Valid task', description: { bad: true }, priority: 'unknown', subtasks: [null, { title: { bad: true } }] }], review: { strengths: 'wrong', riskPoints: [{ detail: 'object' }] }, workflow: [{ phase: 'Phase', tasks: [{ task: 'object' }], assigneeFunction: {} }] };
    render(<AIAnalysisPreview analysis={malformed as unknown as AIAnalysisResult} onConfirm={vi.fn()} onCancel={vi.fn()} loading={false} />);
    expect(screen.getByText('Valid task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认导入到看板' })).toBeEnabled();
  });
  it('makes an invalid empty analysis non-importable instead of rendering a broken preview', () => {
    const normalized = normalizeProjectAnalysis({ tasks: {}, workflow: 'wrong', review: null });
    render(<AIAnalysisPreview analysis={normalized} onConfirm={vi.fn()} onCancel={vi.fn()} loading={false} />);
    expect(screen.getByRole('button', { name: '确认导入到看板' })).toBeDisabled();
  });
});
