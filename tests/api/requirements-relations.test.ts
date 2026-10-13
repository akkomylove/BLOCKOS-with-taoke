import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { GET as getRequirements, POST as createRequirement } from '@/app/api/projects/[id]/requirements/route';
import { GET as getReqById, PUT as updateReqById, DELETE as deleteReqById } from '@/app/api/projects/[id]/requirements/[reqId]/route';
import { GET as getRelations, POST as createRelation, DELETE as deleteRelation } from '@/app/api/projects/[id]/relations/route';
import * as authUtils from '@/lib/auth-utils';
import { getDb, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('Requirements and Semantic Relations API', () => {
  const ownerId = 'user-owner-' + nanoid(6);
  const viewerId = 'user-viewer-' + nanoid(6);
  const teamId = 'team-' + nanoid(6);
  const projectId = 'proj-' + nanoid(6);

  beforeEach(async () => {
    await getDb();
    const now = Date.now();

    for (const uid of [ownerId, viewerId]) {
      run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid,
        `${uid}@test.com`,
        uid,
        'test',
        uid,
        now,
      ]);
    }

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
      viewerId,
      'viewer',
      now,
    ]);
  });

  it('should auto-increment requirement code and retrieve requirements list', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    const req1 = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements', {
      method: 'POST',
      body: JSON.stringify({
        title: '用户身份与权限体系',
        description: '支持多角色RBAC鉴权',
        priority: 'P0',
        dod: ['覆盖四级权限', '单元测试通过'],
      }),
    });
    const res1 = await createRequirement(req1, { params: Promise.resolve({ id: projectId }) });
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(data1.success).toBe(true);
    expect(data1.code).toBe('REQ-001');

    const req2 = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements', {
      method: 'POST',
      body: JSON.stringify({
        title: '云端并发冲突防护',
        priority: 'P1',
      }),
    });
    const res2 = await createRequirement(req2, { params: Promise.resolve({ id: projectId }) });
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.code).toBe('REQ-002');

    // List requirements
    const listReq = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements');
    const listRes = await getRequirements(listReq, { params: Promise.resolve({ id: projectId }) });
    const listData = await listRes.json();
    expect(listData.requirements.length).toBe(2);
    expect(listData.requirements[0].code).toBe('REQ-001');
    expect(listData.requirements[0].dod).toEqual(['覆盖四级权限', '单元测试通过']);
  });

  it('should prevent read-only viewer from creating requirements', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(viewerId);

    const req = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements', {
      method: 'POST',
      body: JSON.stringify({ title: '越权创建测试' }),
    });
    const res = await createRequirement(req, { params: Promise.resolve({ id: projectId }) });
    expect(res.status).toBe(403);
  });

  it('should support optimistic locking on requirement update', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    const createReq = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements', {
      method: 'POST',
      body: JSON.stringify({ title: '初始需求标题' }),
    });
    const createRes = await createRequirement(createReq, { params: Promise.resolve({ id: projectId }) });
    const { id: reqId } = await createRes.json();

    // 更新版本 1 -> 2
    const updateReq1 = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements/' + reqId, {
      method: 'PUT',
      body: JSON.stringify({ title: '更新标题A', version: 1 }),
    });
    const updateRes1 = await updateReqById(updateReq1, { params: Promise.resolve({ id: projectId, reqId }) });
    const updateData1 = await updateRes1.json();
    expect(updateRes1.status).toBe(200);
    expect(updateData1.version).toBe(2);

    // 冲突尝试：使用过期版本号 version: 1
    const conflictReq = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements/' + reqId, {
      method: 'PUT',
      body: JSON.stringify({ title: '过期标题B', version: 1 }),
    });
    const conflictRes = await updateReqById(conflictReq, { params: Promise.resolve({ id: projectId, reqId }) });
    expect(conflictRes.status).toBe(409);
  });

  it('should create semantic relations and cascade on requirement deletion', async () => {
    vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

    // 创建一个需求和一个任务
    const reqPost = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements', {
      method: 'POST',
      body: JSON.stringify({ title: '关联目标需求' }),
    });
    const reqRes = await createRequirement(reqPost, { params: Promise.resolve({ id: projectId }) });
    const { id: reqId } = await reqRes.json();

    const taskId = 'task-' + nanoid(6);
    run(
      'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, projectId, '执行任务A', 'todo', 'high', 0, Date.now(), Date.now()]
    );

    // 建立 semantic relation (task implements requirement)
    const relReq = new NextRequest('http://localhost/api/projects/' + projectId + '/relations', {
      method: 'POST',
      body: JSON.stringify({
        sourceId: taskId,
        sourceType: 'task',
        targetId: reqId,
        targetType: 'requirement',
        relationType: 'implements',
        description: '任务A实现该需求',
      }),
    });
    const relRes = await createRelation(relReq, { params: Promise.resolve({ id: projectId }) });
    const relData = await relRes.json();
    expect(relRes.status).toBe(200);
    expect(relData.success).toBe(true);

    // 查单个需求时能获取 linkedTasks 和 relations
    const getReq = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements/' + reqId);
    const getRes = await getReqById(getReq, { params: Promise.resolve({ id: projectId, reqId }) });
    const getData = await getRes.json();
    expect(getData.linkedTasks.length).toBe(1);
    expect(getData.linkedTasks[0].id).toBe(taskId);
    expect(getData.relations.length).toBe(1);

    // 删除需求后，自动解绑任务并清理关联关系
    const delReq = new NextRequest('http://localhost/api/projects/' + projectId + '/requirements/' + reqId, {
      method: 'DELETE',
    });
    const delRes = await deleteReqById(delReq, { params: Promise.resolve({ id: projectId, reqId }) });
    const delData = await delRes.json();
    expect(delRes.status).toBe(200);
    expect(delData.success).toBe(true);
    expect(delData.affectedTaskCount).toBe(1);

    // 确认关系表已清理
    const relationsAfter = await (await getRelations(
      new NextRequest('http://localhost/api/projects/' + projectId + '/relations'),
      { params: Promise.resolve({ id: projectId }) }
    )).json();
    expect(relationsAfter.relations.length).toBe(0);
  });
});
