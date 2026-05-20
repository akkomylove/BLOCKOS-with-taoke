import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { VizAssistRequest, VizAssistResponse } from './types';

export async function runVizAssist(payload: VizAssistRequest): Promise<VizAssistResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: '你是 BlockOS 可视化助手。只输出合法 JSON。返回 chart_title、summary、preferred_chart_type、table_headers、table_rows、field_notes、chart_suggestions、source_note、placeholder_notice。' },
    { role: 'user', content: `Document: ${payload.documentName}\nWorkflow: ${JSON.stringify(payload.workflow)}\nCurrent Role: ${payload.currentRole}\n${payload.dataSourceContent ? `Data Content:\n${payload.dataSourceContent}` : ''}` },
  ], 0.1);

  try {
    const parsed = parseJsonContent(rawContent);
    const chartType = parsed.preferred_chart_type;
    return {
      chartTitle: safeText(parsed.chart_title, '数据图表'),
      summary: safeText(parsed.summary, '数据已分析。'),
      preferredChartType: chartType === 'table' || chartType === 'bar' || chartType === 'line' || chartType === 'pie' ? chartType : 'table',
      tableHeaders: safeList(parsed.table_headers),
      tableRows: normalizeTableRows(parsed.table_rows),
      fieldNotes: safeList(parsed.field_notes),
      chartSuggestions: safeList(parsed.chart_suggestions),
      sourceNote: safeText(parsed.source_note) || undefined,
      placeholderNotice: safeText(parsed.placeholder_notice) || undefined,
      dataStatus: payload.sourceType === 'upload' ? 'linked' : 'preset',
    };
  } catch (error) {
    throw new AIServiceError('可视化助手响应解析失败', 'viz_assist_parse_error', 502, { error: String(error) });
  }
}

function normalizeTableRows(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => row.map((cell) => String(cell).trim()).filter((cell) => cell.length > 0))
    .filter((row) => row.length > 0);
}
