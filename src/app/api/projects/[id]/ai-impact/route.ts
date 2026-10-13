import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query } from '@/lib/db';
import { isValidNanoid } from '@/lib/validation';
import type { ChangeImpactResult, RelationType } from '@/types/collaboration';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid Project ID' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { requirementId, changeSummary } = body;

    if (!requirementId || !isValidNanoid(requirementId)) {
      return NextResponse.json({ error: 'Valid requirementId is required' }, { status: 400 });
    }

    // 1. 查询该需求基本信息
    const reqRows = query(
      'SELECT id, code, title, description FROM requirements WHERE id = ? AND project_id = ?',
      [requirementId, projectId]
    );
    if (reqRows.length === 0) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }
    const currentReq = reqRows[0];

    // 2. 查询该需求通过 requirement_id 直接关联的任务
    const directTasks = query(
      `SELECT t.id, t.title, t.status, t.assignee_id 
       FROM tasks t 
       WHERE t.requirement_id = ? AND (t.deleted_at IS NULL OR t.deleted_at = 0)`,
      [requirementId]
    );

    // 3. 查询语义关联表中的关联对象 (implements, verifies, depends_on, references)
    const relations = query(
      `SELECT * FROM semantic_relations 
       WHERE project_id = ? AND (source_id = ? OR target_id = ?)`,
      [projectId, requirementId, requirementId]
    );

    const directImpacts: ChangeImpactResult['directImpacts'] = [];
    const relatedIds = new Set<string>();

    for (const t of directTasks) {
      relatedIds.add(t.id as string);
      directImpacts.push({
        id: t.id as string,
        type: 'task',
        title: t.title as string,
        relationType: 'implements',
        assigneeId: (t.assignee_id as string) || undefined,
        actionRequired: '需求已更新，需核对该实现任务的交付物与验收标准',
      });
    }

    for (const rel of relations) {
      const isTarget = rel.target_id === requirementId;
      const otherId = isTarget ? (rel.source_id as string) : (rel.target_id as string);
      const otherType = (isTarget ? rel.source_type : rel.target_type) as 'task' | 'block';
      const relType = rel.relation_type as RelationType;

      if (!relatedIds.has(otherId)) {
        relatedIds.add(otherId);
        let title = `${otherType} (${otherId})`;
        let assigneeId: string | undefined;

        if (otherType === 'task') {
          const tRow = query('SELECT title, assignee_id FROM tasks WHERE id = ?', [otherId]);
          if (tRow.length > 0) {
            title = tRow[0].title as string;
            assigneeId = (tRow[0].assignee_id as string) || undefined;
          }
        } else if (otherType === 'block') {
          const bRow = query('SELECT title, content FROM blocks WHERE id = ?', [otherId]);
          if (bRow.length > 0) {
            title = (bRow[0].title as string) || (bRow[0].content as string)?.slice(0, 30) || '画布 Block';
          }
        }

        let actionRequired = '关联对象需协同核验';
        if (relType === 'verifies') {
          actionRequired = '验证标准或测试用例需根据新需求同步调整';
        } else if (relType === 'depends_on') {
          actionRequired = '下游依赖该需求，需评估交付排期与接口兼容性';
        } else if (relType === 'references') {
          actionRequired = '参考依据已变更，建议核对方案一致性';
        }

        directImpacts.push({
          id: otherId,
          type: otherType,
          title,
          relationType: relType,
          assigneeId,
          actionRequired,
        });
      }
    }

    // 4. 分析推测影响 (inferred impacts)
    // 启发式分析：扫描项目下其他任务中包含关键词但尚未建立显式关联的事项
    const allOtherTasks = query(
      `SELECT t.id, t.title, t.description, t.assignee_id 
       FROM tasks t 
       WHERE t.project_id = ? AND (t.deleted_at IS NULL OR t.deleted_at = 0) 
         AND t.id NOT IN (${Array.from(relatedIds).map(() => '?').join(',') || "''"})`,
      relatedIds.size > 0 ? [projectId, ...Array.from(relatedIds)] : [projectId]
    );

    const inferredImpacts: ChangeImpactResult['inferredImpacts'] = [];
    const rawTokens = (changeSummary || (currentReq.title as string))
      .toLowerCase()
      .split(/[\s,，、。！？；;：:]+/)
      .filter((k: string) => k.length >= 2);

    const summaryKeywords: string[] = [];
    for (const token of rawTokens) {
      if (token.length <= 4) {
        summaryKeywords.push(token);
      } else {
        summaryKeywords.push(token);
        for (let len = 4; len >= 2; len--) {
          for (let i = 0; i <= token.length - len; i++) {
            summaryKeywords.push(token.slice(i, i + len));
          }
        }
      }
    }
    const uniqueKeywords = Array.from(new Set(summaryKeywords));

    for (const other of allOtherTasks) {
      const text = `${other.title} ${other.description || ''}`.toLowerCase();
      const matched = uniqueKeywords.filter((k: string) => text.includes(k));
      if (matched.length > 0) {
        inferredImpacts.push({
          id: other.id as string,
          type: 'task',
          title: other.title as string,
          reason: `任务内容包含变更关键词 [${matched.slice(0, 3).join(', ')}]，可能受潜在业务规则变更影响`,
          confidence: Math.min(0.85, 0.4 + matched.length * 0.15),
          riskLevel: matched.length >= 2 ? 'high' : 'medium',
          suggestedAction: '请负责人核实该任务是否涉及新需求的修改范围',
        });
      }
    }

    const result: ChangeImpactResult = {
      requirementId,
      requirementCode: currentReq.code as string,
      changeSummary: changeSummary || '需求内容更新',
      directImpacts,
      inferredImpacts,
    };

    return NextResponse.json({
      success: true,
      impact: result,
      summary: `检测到 ${directImpacts.length} 个明确关联影响项与 ${inferredImpacts.length} 个推测潜在影响项`,
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/ai-impact error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
