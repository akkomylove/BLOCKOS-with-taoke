import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { POST as createAiPreview, GET as getAiPreviews } from '@/app/api/projects/[id]/ai-preview/route';
import { POST as manageAiPreview } from '@/app/api/projects/[id]/ai-preview/[previewId]/route';
import { POST as submitAgentJob, GET as getAgentJobs } from '@/app/api/projects/[id]/agent-jobs/route';
import { GET as getTemplates, POST as testTemplate } from '@/app/api/projects/[id]/agent-rules/templates/route';
import { GET as getAgentToggle, POST as toggleAgent } from '@/app/api/projects/[id]/agent/toggle/route';
import { POST as recordExecution, GET as getExecutions } from '@/app/api/projects/[id]/agent-executions/route';
import { POST as rollbackExecution } from '@/app/api/projects/[id]/agent-executions/[execId]/rollback/route';
import * as authUtils from '@/lib/auth-utils';
import { getDb, query, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('Batch 3: AI Modification Previews, Persistent Agent Jobs, Templates & Rollbacks', () => {
  const ownerId = 'user-owner-' + nanoid(6);
  const teamId = 'team-' + nanoid(6);
  const projectId = 'proj-' + nanoid(6);

  beforeEach(async () => {
    await getDb();
    const now = Date.now();

    run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      ownerId,
      `${ownerId}@test.com`,
      'Owner User',
      'test',
      ownerId,
      now,
    ]);

    run('INSERT OR IGNORE INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      teamId,
      'Test Team',
      ownerId,
      now,
      now,
    ]);

    run('INSERT OR IGNORE INTO projects (id, team_id, name, owner_id, agent_paused, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)', [
      projectId,
      teamId,
      'Test Project',
      ownerId,
      now,
      now,
    ]);

    run('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [
      nanoid(),
      projectId,
      ownerId,
      'owner',
      now,
    ]);
  });

  it('should create AI preview, apply it, and support one-click revert', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    // 预置一个将被 AI 更新的任务
    const existingTaskId = 'task-prev-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, description, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [existingTaskId, projectId, '原任务标题', '原任务描述', 'todo', 'medium', 0, Date.now(), Date.now()]
    );

    // 1. 生成修改预览
    const newTaskId = 'task-new-' + nanoid(6);
    const previewPost = new NextRequest('http://localhost/api/projects/' + projectId + '/ai-preview', {
      method: 'POST',
      body: JSON.stringify({
        sourceModel: 'glm-4-flash',
        promptSummary: '优化任务拆解与描述',
        changes: [
          {
            action: 'update',
            entityType: 'task',
            entityId: existingTaskId,
            after: { title: 'AI 优化后的任务标题', description: '补充更详细的交付说明' },
            reason: '描述不够详尽',
          },
          {
            action: 'create',
            entityType: 'task',
            entityId: newTaskId,
            after: { title: 'AI 建议新增的测试任务', priority: 'high' },
            reason: '缺少集成测试任务',
          },
        ],
      }),
    });
    const previewRes = await createAiPreview(previewPost, { params: Promise.resolve({ id: projectId }) });
    const previewData = await previewRes.json();
    expect(previewRes.status).toBe(200);
    expect(previewData.success).toBe(true);
    const previewId = previewData.previewId;

    // 2. 确认应用预览修改
    const applyReq = new NextRequest(`http://localhost/api/projects/${projectId}/ai-preview/${previewId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'apply' }),
    });
    const applyRes = await manageAiPreview(applyReq, { params: Promise.resolve({ id: projectId, previewId }) });
    const applyData = await applyRes.json();
    expect(applyRes.status).toBe(200);
    expect(applyData.status).toBe('accepted');

    // 验证修改已生效
    const updatedTask = query('SELECT * FROM tasks WHERE id = ?', [existingTaskId])[0];
    expect(updatedTask.title).toBe('AI 优化后的任务标题');
    const createdTask = query('SELECT * FROM tasks WHERE id = ?', [newTaskId]);
    expect(createdTask.length).toBe(1);

    // 3. 一键回滚该次 AI 批量修改
    const revertReq = new NextRequest(`http://localhost/api/projects/${projectId}/ai-preview/${previewId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'revert' }),
    });
    const revertRes = await manageAiPreview(revertReq, { params: Promise.resolve({ id: projectId, previewId }) });
    const revertData = await revertRes.json();
    expect(revertRes.status).toBe(200);
    expect(revertData.status).toBe('reverted');

    // 验证数据已完全还原
    const revertedTask = query('SELECT * FROM tasks WHERE id = ?', [existingTaskId])[0];
    expect(revertedTask.title).toBe('原任务标题');
    const deletedNewTask = query('SELECT * FROM tasks WHERE id = ?', [newTaskId]);
    expect(deletedNewTask.length).toBe(0);
  });

  it('should guarantee idempotency for persistent background agent jobs', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);
    const eventId = 'evt-' + nanoid(8);

    // 第一次提交任务
    const jobReq1 = new NextRequest('http://localhost/api/projects/' + projectId + '/agent-jobs', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        jobType: 'rule_exec',
        payload: { rule: 'todo-complete' },
      }),
    });
    const res1 = await submitAgentJob(jobReq1, { params: Promise.resolve({ id: projectId }) });
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(data1.status).toBe('completed');
    expect(data1.duplicate).toBeUndefined();

    // 第二次提交相同 eventId 的任务（模拟网络重试或重复事件广播）
    const jobReq2 = new NextRequest('http://localhost/api/projects/' + projectId + '/agent-jobs', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        jobType: 'rule_exec',
        payload: { rule: 'todo-complete' },
      }),
    });
    const res2 = await submitAgentJob(jobReq2, { params: Promise.resolve({ id: projectId }) });
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.duplicate).toBe(true);
    expect(data2.id).toBe(data1.id);

    // 确认队列中只有一条作业记录
    const listRes = await (await getAgentJobs(
      new NextRequest('http://localhost/api/projects/' + projectId + '/agent-jobs'),
      { params: Promise.resolve({ id: projectId }) }
    )).json();
    expect(listRes.jobs.filter((j: any) => j.eventId === eventId).length).toBe(1);
  });

  it('should support emergency pause kill-switch and prevent automation execution', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    // 开启一键暂停
    const pauseReq = new NextRequest('http://localhost/api/projects/' + projectId + '/agent/toggle', {
      method: 'POST',
      body: JSON.stringify({ paused: true }),
    });
    const pauseRes = await toggleAgent(pauseReq, { params: Promise.resolve({ id: projectId }) });
    const pauseData = await pauseRes.json();
    expect(pauseRes.status).toBe(200);
    expect(pauseData.agentPaused).toBe(true);

    // 尝试提交作业应被 423 拦截
    const jobReq = new NextRequest('http://localhost/api/projects/' + projectId + '/agent-jobs', {
      method: 'POST',
      body: JSON.stringify({
        eventId: 'evt-blocked-' + nanoid(6),
        jobType: 'rule_exec',
      }),
    });
    const jobRes = await submitAgentJob(jobReq, { params: Promise.resolve({ id: projectId }) });
    expect(jobRes.status).toBe(423);

    // 恢复自动化
    const resumeReq = new NextRequest('http://localhost/api/projects/' + projectId + '/agent/toggle', {
      method: 'POST',
      body: JSON.stringify({ paused: false }),
    });
    const resumeRes = await toggleAgent(resumeReq, { params: Promise.resolve({ id: projectId }) });
    expect(resumeRes.status).toBe(200);
    const resumeData = await resumeRes.json();
    expect(resumeData.agentPaused).toBe(false);
  });

  it('should provide default rule templates and support single-step dry-run simulation', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    const getRes = await getTemplates(
      new NextRequest('http://localhost/api/projects/' + projectId + '/agent-rules/templates'),
      { params: Promise.resolve({ id: projectId }) }
    );
    const data = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(data.templates.length).toBeGreaterThanOrEqual(3);

    const testReq = new NextRequest('http://localhost/api/projects/' + projectId + '/agent-rules/templates', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'rule-req-update-notify',
        mockInput: { requirementId: 'req-001', version: 2 },
      }),
    });
    const testRes = await testTemplate(testReq, { params: Promise.resolve({ id: projectId }) });
    const testData = await testRes.json();
    expect(testRes.status).toBe(200);
    expect(testData.simulation.conditionMatched).toBe(true);
    expect(testData.simulation.simulatedActions.length).toBeGreaterThan(0);
  });

  it('should record agent execution history and support one-click rollback of execution side-effects', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    const autoTaskId = 'task-auto-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [autoTaskId, projectId, 'Agent 自动生成的任务', 'todo', 'medium', 0, Date.now(), Date.now()]
    );

    // 记录执行历史
    const recordReq = new NextRequest('http://localhost/api/projects/' + projectId + '/agent-executions', {
      method: 'POST',
      body: JSON.stringify({
        ruleId: 'rule-task-pending-review',
        triggerReason: '待办勾选自动推进',
        actionsTaken: ['create_task'],
        affectedEntities: [{ type: 'task', action: 'create', id: autoTaskId }],
        durationMs: 42,
      }),
    });
    const recordRes = await recordExecution(recordReq, { params: Promise.resolve({ id: projectId }) });
    const recordData = await recordRes.json();
    expect(recordRes.status).toBe(200);
    const execId = recordData.id;

    // 检查执行记录
    const listRes = await (await getExecutions(
      new NextRequest('http://localhost/api/projects/' + projectId + '/agent-executions'),
      { params: Promise.resolve({ id: projectId }) }
    )).json();
    expect(listRes.executions.find((e: any) => e.id === execId)).toBeDefined();

    // 触发一键回滚
    const rollReq = new NextRequest(`http://localhost/api/projects/${projectId}/agent-executions/${execId}/rollback`, {
      method: 'POST',
    });
    const rollRes = await rollbackExecution(rollReq, { params: Promise.resolve({ id: projectId, execId }) });
    const rollData = await rollRes.json();
    expect(rollRes.status).toBe(200);
    expect(rollData.success).toBe(true);

    // 验证自动生成的任务被清理
    const taskAfter = query('SELECT * FROM tasks WHERE id = ?', [autoTaskId]);
    expect(taskAfter.length).toBe(0);
  });
});
