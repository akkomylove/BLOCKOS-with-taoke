import { postJsonCompletion, parseJsonContent, repairJson, safeText, safeList, safeInt, AIServiceError } from './client';
import type { VersionSummaryRequest, VersionSummaryResponse } from './types';

export async function summarizeVersion(payload: VersionSummaryRequest): Promise<VersionSummaryResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: `你是 BlockOS 版本总结助手。只输出合法 JSON。affected_roles 只能从这些岗位中选择：${JSON.stringify(payload.workflow)}。` },
    { role: 'user', content: `返回固定 JSON：version_number、change_summary、self_conclusion、decision_trace、key_changes、affected_roles。\n\n文档名称：${payload.documentName}\n版本号：V${payload.versionNumber}\n变更前：\n${payload.previousContent}\n\n变更后：\n${payload.currentContent}` },
  ], 0.1);

  try {
    const parsed = normalizeVersionPayload(parseJsonContent(rawContent), payload);
    return parsed as VersionSummaryResponse;
  } catch (error) {
    try {
      const repaired = normalizeVersionPayload(await repairJson(rawContent, payload.workflow, '{version_number, change_summary, self_conclusion, decision_trace:[...], key_changes:[...], affected_roles:[...]}'), payload);
      return repaired as VersionSummaryResponse;
    } catch (repairError) {
      throw new AIServiceError('版本总结数据无法自动修复', 'invalid_version_summary_payload', 502, { error: String(repairError) });
    }
  }
}

function normalizeVersionPayload(payload: Record<string, unknown>, request: VersionSummaryRequest): Record<string, unknown> {
  return {
    versionNumber: safeInt(payload.version_number, request.versionNumber),
    changeSummary: safeText(payload.change_summary, `V${request.versionNumber} 已记录本次文档修改。`),
    selfConclusion: safeText(payload.self_conclusion, '本次修改已更新当前文档结论。'),
    decisionTrace: safeList(payload.decision_trace, ['记录本次修改的背景和依据']),
    keyChanges: safeList(payload.key_changes, ['文档正文已发生调整']),
    affectedRoles: safeRoles(payload.affected_roles, request.workflow),
  };
}

function safeRoles(value: unknown, workflow: string[]): string[] {
  if (value === null || value === undefined) return workflow.slice(0, Math.min(2, workflow.length));
  const items = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];
  const lookup = new Map(workflow.map((r) => [r.trim().toLowerCase(), r]));
  for (const item of items) {
    const key = String(item).trim().toLowerCase();
    const matched = lookup.get(key);
    if (matched && !normalized.includes(matched)) normalized.push(matched);
  }
  return normalized.length > 0 ? normalized : workflow.slice(0, Math.min(2, workflow.length));
}
