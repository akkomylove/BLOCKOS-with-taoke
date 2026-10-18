import type { AIAnalysisResult } from '@/types/collaboration';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const strings = (value: unknown): string[] => list(value).filter((item): item is string => typeof item === 'string');
const days = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 2;

export function normalizeProjectAnalysis(value: unknown): AIAnalysisResult {
  const input = record(value);
  const review = record(input.review);
  return {
    tasks: list(input.tasks).map(record).filter(task => text(task.title).trim()).slice(0, 100).map(task => ({
      ...task,
      title: text(task.title), description: text(task.description),
      priority: (['low', 'medium', 'high', 'urgent'].includes(text(task.priority)) ? task.priority : 'medium') as AIAnalysisResult['tasks'][number]['priority'],
      suggestedAssigneeFunction: text(task.suggestedAssigneeFunction), estimatedDays: days(task.estimatedDays),
      subtasks: list(task.subtasks).map(record).filter(item => text(item.title).trim()).map(item => ({ title: text(item.title), description: text(item.description) })),
      sourceSnippet: text(task.sourceSnippet), deliverables: strings(task.deliverables), dod: strings(task.dod), clarificationQuestions: strings(task.clarificationQuestions),
    })),
    review: { strengths: strings(review.strengths), weaknesses: strings(review.weaknesses), suggestions: strings(review.suggestions), riskPoints: strings(review.riskPoints) },
    workflow: list(input.workflow).map(record).filter(stage => text(stage.phase).trim()).map((stage, index) => ({
      phase: text(stage.phase), description: text(stage.description), tasks: strings(stage.tasks),
      assigneeFunction: text(stage.assigneeFunction, text(stage.assignee)),
      order: typeof stage.order === 'number' && Number.isFinite(stage.order) ? stage.order : index + 1,
      estimatedDays: days(stage.estimatedDays),
    })),
  };
}
