import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { POST as runAiImpact } from '@/app/api/projects/[id]/ai-impact/route';
import { POST as runAiAnalyze } from '@/app/api/projects/[id]/ai-analyze/route';
import { POST as runAiImport } from '@/app/api/projects/[id]/ai-import/route';
import { POST as createInvite, GET as getInvites } from '@/app/api/projects/[id]/invites/route';
import { GET as getInviteByCode, POST as acceptInvite } from '@/app/api/invites/[code]/route';
import { POST as createComment, GET as getComments, DELETE as deleteComment } from '@/app/api/projects/[id]/comments/route';
import { PATCH as updateTask } from '@/app/api/tasks/[id]/route';
import * as authUtils from '@/lib/auth-utils';
import { getDb, query, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('AI Impact, Smart Task Import, Invites, and Comments API', () => {
  const ownerId = 'user-owner-' + nanoid(6);
  const memberId = 'user-member-' + nanoid(6);
  const outsiderId = 'user-outsider-' + nanoid(6);
  const teamId = 'team-' + nanoid(6);
  const projectId = 'proj-' + nanoid(6);

  beforeEach(async () => {
    await getDb();
    const now = Date.now();

    for (const uid of [ownerId, memberId, outsiderId]) {
      run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid,
        `${uid}@test.com`,
        `Name-${uid}`,
        'test',
        uid,
        now,
      ]);
    }

    // 设置 member 岗位职能
    run('INSERT OR REPLACE INTO user_profiles (user_id, title, functions, updated_at) VALUES (?, ?, ?, ?)', [
      memberId,
      '前端工程师',
      JSON.stringify(['前端开发', 'React', 'UI']),
      now,
    ]);

    run('INSERT OR IGNORE INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      teamId,
      'Test Team',
      ownerId,
      now,
      now,
    ]);

    run('INSERT OR IGNORE INTO projects (id, team_id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
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
    run('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [
      nanoid(),
      projectId,
      memberId,
      'member',
      now,
    ]);
  });

  it('should analyze requirement change impact along relations and infer potential risks', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);
    const now = Date.now();

    const reqId = 'req-' + nanoid(6);
    run(
      'INSERT INTO requirements (id, project_id, code, title, status, priority, version, dod, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reqId, projectId, 'REQ-010', '支付结算与对账引擎', 'in_dev', 'P0', 1, '[]', now, now]
    );

    const taskId = 'task-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, requirement_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, projectId, '对接微信支付退款接口', 'in_progress', 'high', 0, reqId, now, now]
    );

    const otherTaskId = 'task-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, description, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [otherTaskId, projectId, '财务对账单导出', '涉及每日支付结算流水合并导出', 'todo', 'medium', 1, now, now]
    );

    const impactReq = new NextRequest('http://localhost/api/projects/' + projectId + '/ai-impact', {
      method: 'POST',
      body: JSON.stringify({
        requirementId: reqId,
        changeSummary: '修改支付结算对账频率为实时分账',
      }),
    });
    const impactRes = await runAiImpact(impactReq, { params: Promise.resolve({ id: projectId }) });
    const data = await impactRes.json();

    expect(impactRes.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.impact.directImpacts.length).toBe(1);
    expect(data.impact.directImpacts[0].id).toBe(taskId);
    expect(data.impact.inferredImpacts.length).toBeGreaterThan(0);
    expect(data.impact.inferredImpacts[0].id).toBe(otherTaskId);
  });

  it('should break down tasks with source snippet, DoD, duplicate check, and project member scoping', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    // 先插入一个已有任务，测试查重
    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['task-ext-' + nanoid(6), projectId, '用户中心与鉴权架构', 'done', 'high', 0, Date.now(), Date.now()]
    );

    const docContent = `# 用户中心与鉴权架构
- 完成统一鉴权网关
- 补充前端界面登录注册组件`;

    const analyzeReq = new NextRequest('http://localhost/api/projects/' + projectId + '/ai-analyze', {
      method: 'POST',
      body: JSON.stringify({ content: docContent }),
    });
    const res = await runAiAnalyze(analyzeReq, { params: Promise.resolve({ id: projectId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    const tasks = data.analysis.tasks;
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].dod).toBeDefined();
    expect(tasks[0].deliverables).toBeDefined();
    expect(tasks[0].sourceSnippet).toBeDefined();
    expect(tasks[0].isEstimatePendingConfirmation).toBe(true);

    // 验证查重检测到了任务 '用户中心与鉴权架构'
    const dupTask = tasks.find((t: any) => t.isDuplicate);
    expect(dupTask).toBeDefined();
    expect(dupTask.duplicateWarning).toContain('建议核实合并');

    // 验证负责人建议限定在项目成员 (memberId 拥有前端工程师职位)
    const frontendTask = tasks.find((t: any) => t.suggestedAssigneeFunction === '前端开发');
    if (frontendTask) {
      expect(frontendTask.suggestedAssigneeId).toBe(memberId);
      expect(frontendTask.assigneeRecommendationReason).toContain('前端');
    }
  });

  it('should import tasks with project member verification and skipDuplicates', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['task-ext-' + nanoid(6), projectId, '已存在的同名任务', 'todo', 'medium', 0, Date.now(), Date.now()]
    );

    const importReq = new NextRequest('http://localhost/api/projects/' + projectId + '/ai-import', {
      method: 'POST',
      body: JSON.stringify({
        tasks: [
          {
            title: '已存在的同名任务',
            description: '这是重复任务',
            deliverables: ['交付物'],
            dod: ['标准'],
            suggestedAssigneeId: memberId,
          },
          {
            title: '全新导入任务B',
            description: '这是新任务',
            deliverables: ['代码'],
            dod: ['测试通过'],
            suggestedAssigneeId: outsiderId, // outsiderId 不是当前项目成员！
          },
        ],
        skipDuplicates: true,
      }),
    });
    const res = await runAiImport(importReq, { params: Promise.resolve({ id: projectId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skippedCount).toBe(1);
    expect(data.importedCount).toBe(1);

    // 检查项目外人员 outsiderId 是否被拦截为 null
    const inserted = query("SELECT assignee_id FROM tasks WHERE project_id = ? AND title = '全新导入任务B'", [projectId]);
    expect(inserted.length).toBe(1);
    expect(inserted[0].assignee_id).toBeNull();
  });

  it('keeps multiple plan batches and replays a duplicate receipt without creating duplicate tasks or milestones', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);
    const batch = nanoid();
    const send = (requestId: string, title: string) => runAiImport(new NextRequest('http://localhost/import', { method: 'POST', body: JSON.stringify({ requestId, tasks: [{ title }], workflow: [{ phase: title }] }) }), { params: Promise.resolve({ id: projectId }) });
    const [first, duplicate] = await Promise.all([send(batch, 'receipt-A'), send(batch, 'receipt-A')]);
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()).replayed).toBe(true);
    expect((await send(nanoid(), 'receipt-B')).status).toBe(200);
    expect(query("SELECT id FROM tasks WHERE project_id = ? AND title IN ('receipt-A', 'receipt-B')", [projectId])).toHaveLength(2);
    expect(query("SELECT id FROM milestones WHERE project_id = ? AND name = 'receipt-A'", [projectId])).toHaveLength(1);
    expect((await send(batch, 'different-content')).status).toBe(409);
  });

  it('rolls back the entire batch and receipt if a later task fails', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);
    const requestId = nanoid();
    const response = await runAiImport(new NextRequest('http://localhost/import', { method: 'POST', body: JSON.stringify({ requestId, tasks: [{ title: 'must-rollback' }, { title: 'bad-subtask', subtasks: [null] }] }) }), { params: Promise.resolve({ id: projectId }) });
    expect(response.status).toBe(500);
    expect(query("SELECT id FROM tasks WHERE project_id = ? AND title = 'must-rollback'", [projectId])).toHaveLength(0);
    expect(query('SELECT request_id FROM plan_imports WHERE request_id = ?', [requestId])).toHaveLength(0);
  });

  it('should support task status flow, review metadata, and audit records', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);
    const taskId = 'task-flow-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, projectId, '任务状态流转审核测试', 'todo', 'high', 0, 1, Date.now(), Date.now()]
    );

    // 1. 流转到 pending_review
    const patch1 = new NextRequest('http://localhost/api/tasks/' + taskId, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'pending_review',
        deliverables: ['PR #102', '测试报告 URL'],
      }),
    });
    const res1 = await updateTask(patch1, { params: Promise.resolve({ id: taskId }) });
    expect(res1.status).toBe(200);

    // 2. 审核通过 done，自动记录审核人
    const patch2 = new NextRequest('http://localhost/api/tasks/' + taskId, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'done',
        reviewNotes: '代码规范符合要求，核验通过',
      }),
    });
    const res2 = await updateTask(patch2, { params: Promise.resolve({ id: taskId }) });
    expect(res2.status).toBe(200);

    const taskRow = query('SELECT * FROM tasks WHERE id = ?', [taskId])[0];
    expect(taskRow.status).toBe('done');
    expect(taskRow.reviewed_by).toBe(ownerId);
    expect(taskRow.review_notes).toBe('代码规范符合要求，核验通过');
    expect(taskRow.deliverables).toContain('PR #102');
  });

  it('should generate invite codes and allow new members to join project', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    // 1. 生成邀请码
    const invitePost = new NextRequest('http://localhost/api/projects/' + projectId + '/invites', {
      method: 'POST',
      body: JSON.stringify({ role: 'member', expiresInDays: 7 }),
    });
    const res = await createInvite(invitePost, { params: Promise.resolve({ id: projectId }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    const code = data.invite.code;

    // 2. 查询邀请码信息
    const getCodeReq = new NextRequest('http://localhost/api/invites/' + code);
    const getCodeRes = await getInviteByCode(getCodeReq, { params: Promise.resolve({ code }) });
    const getCodeData = await getCodeRes.json();
    expect(getCodeData.projectName).toBe('Test Project');
    expect(getCodeData.isExpired).toBe(false);

    // 3. 项目外人员 outsiderId 接受邀请加入
    run("UPDATE users SET account_mode = 'enterprise' WHERE id = ?", [outsiderId]);
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(outsiderId);
    const acceptReq = new NextRequest('http://localhost/api/invites/' + code, { method: 'POST' });
    const acceptRes = await acceptInvite(acceptReq, { params: Promise.resolve({ code }) });
    const acceptData = await acceptRes.json();
    expect(acceptRes.status).toBe(200);
    expect(acceptData.joined).toBe(true);

    // 验证 outsiderId 已成为 project_members
    const members = query('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, outsiderId]);
    expect(members.length).toBe(1);
    expect(members[0].role).toBe('member');
  });

  it('should support object-level comments and @mentions on blocks', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(memberId);
    const pageId = 'page-' + nanoid(6);
    const blockId = 'block-' + nanoid(6);

    // 发送评论并包含 @mentions
    const postReq = new NextRequest('http://localhost/api/projects/' + projectId + '/comments', {
      method: 'POST',
      body: JSON.stringify({
        pageId,
        blockId,
        content: '请 @张三 协助核对接口定义',
      }),
    });
    const postRes = await createComment(postReq, { params: Promise.resolve({ id: projectId }) });
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.comment.mentions).toContain('张三');

    // 查询该 block 评论列表
    const getReq = new NextRequest('http://localhost/api/projects/' + projectId + '/comments?blockId=' + blockId);
    const getRes = await getComments(getReq, { params: Promise.resolve({ id: projectId }) });
    const getData = await getRes.json();
    expect(getData.comments.length).toBe(1);
    expect(getData.comments[0].id).toBe(postData.comment.id);

    // 删除评论
    const delReq = new NextRequest('http://localhost/api/projects/' + projectId + '/comments?commentId=' + postData.comment.id, {
      method: 'DELETE',
    });
    const delRes = await deleteComment(delReq, { params: Promise.resolve({ id: projectId }) });
    expect(delRes.status).toBe(200);
  });
});
