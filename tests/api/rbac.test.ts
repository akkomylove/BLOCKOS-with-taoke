import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { createSignedSessionToken, verifySignedSessionToken } from '@/lib/auth-utils';
import { POST as createTask } from '@/app/api/tasks/route';
import { PATCH as updateTask, DELETE as deleteTask } from '@/app/api/tasks/[id]/route';
import { POST as restoreTask } from '@/app/api/tasks/[id]/restore/route';
import { POST as addProjectMember } from '@/app/api/projects/[id]/members/route';
import * as authUtils from '@/lib/auth-utils';
import { getDb, run } from '@/lib/db';
import { nanoid } from 'nanoid';

describe('RBAC and Session Security API', () => {
  const ownerId = 'user-owner-' + nanoid(6);
  const memberId = 'user-member-' + nanoid(6);
  const viewerId = 'user-viewer-' + nanoid(6);
  const teamId = 'team-' + nanoid(6);
  const projectId = 'proj-' + nanoid(6);

  beforeEach(async () => {
    await getDb();
    const now = Date.now();

    // 预置用户
    for (const uid of [ownerId, memberId, viewerId]) {
      run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid,
        `${uid}@test.com`,
        uid,
        'test',
        uid,
        now,
      ]);
    }

    // 预置团队与成员
    run('INSERT OR IGNORE INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      teamId,
      'Test Team',
      ownerId,
      now,
      now,
    ]);
    for (const uid of [ownerId, memberId, viewerId]) {
      run('INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [
        nanoid(),
        teamId,
        uid,
        'member',
        now,
      ]);
    }

    // 预置项目与项目成员权限 (owner, member, viewer)
    run('INSERT OR IGNORE INTO projects (id, team_id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
      projectId,
      teamId,
      'RBAC Test Project',
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
    run('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [
      nanoid(),
      projectId,
      viewerId,
      'viewer',
      now,
    ]);
  });

  describe('Session Token HMAC Signing & Tampering Detection', () => {
    it('should generate valid signed token and verify successfully', () => {
      const token = createSignedSessionToken('admin-user');
      const verified = verifySignedSessionToken(token);
      expect(verified).toBe('admin-user');
    });

    it('should reject tampered token where userId is modified', () => {
      const token = createSignedSessionToken('normal-user');
      const tampered = token.replace('normal-user', 'admin-user');
      const verified = verifySignedSessionToken(tampered);
      expect(verified).toBeNull();
    });

    it('should reject expired token', () => {
      // 传入负数的 TTL 使其立即过期
      const expiredToken = createSignedSessionToken('user-1', -1000);
      const verified = verifySignedSessionToken(expiredToken);
      expect(verified).toBeNull();
    });
  });

  describe('Project RBAC Permissions Enforcement', () => {
    it('should prevent viewer from creating tasks', async () => {
      vi.spyOn(authUtils, 'getUserId').mockResolvedValue(viewerId);

      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: 'Viewer Attempt Task',
        }),
      });

      const res = await createTask(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Read-only members cannot create tasks');
    });

    it('should allow member to create task', async () => {
      vi.spyOn(authUtils, 'getUserId').mockResolvedValue(memberId);

      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: 'Member Valid Task',
        }),
      });

      const res = await createTask(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    it('should prevent viewer from updating or deleting tasks', async () => {
      const taskId = nanoid();
      run(
        'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [taskId, projectId, 'Existing Task', 'todo', 'medium', Date.now(), Date.now()]
      );

      vi.spyOn(authUtils, 'getUserId').mockResolvedValue(viewerId);

      // Attempt PATCH
      const patchReq = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Tampered Title' }),
      });
      const patchRes = await updateTask(patchReq, { params: Promise.resolve({ id: taskId }) });
      expect(patchRes.status).toBe(403);
      const patchData = await patchRes.json();
      expect(patchData.error).toContain('Read-only members cannot modify tasks');

      // Attempt DELETE
      const delReq = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`, { method: 'DELETE' });
      const delRes = await deleteTask(delReq, { params: Promise.resolve({ id: taskId }) });
      expect(delRes.status).toBe(403);
    });

    it('should prevent regular member from adding new project members or promoting roles', async () => {
      const newUserId = 'new-user-' + nanoid(6);
      run('INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        newUserId,
        `${newUserId}@test.com`,
        newUserId,
        'test',
        newUserId,
        Date.now(),
      ]);
      run('INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [
        nanoid(),
        teamId,
        newUserId,
        'member',
        Date.now(),
      ]);

      // Regular member attempts to invite new project member
      vi.spyOn(authUtils, 'getUserId').mockResolvedValue(memberId);
      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: newUserId, role: 'admin' }),
      });

      const res = await addProjectMember(req, { params: Promise.resolve({ id: projectId }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Only project owner or admin can add members');
    });

    it('should allow owner to delete task with soft deletion and restore it', async () => {
      const taskId = nanoid();
      run(
        'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [taskId, projectId, 'To Soft Delete', 'todo', 'medium', Date.now(), Date.now()]
      );

      vi.spyOn(authUtils, 'getUserId').mockResolvedValue(ownerId);

      // Soft delete
      const delReq = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`, { method: 'DELETE' });
      const delRes = await deleteTask(delReq, { params: Promise.resolve({ id: taskId }) });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.softDeleted).toBe(true);

      // Restore task
      const restoreReq = new NextRequest(`http://localhost:3000/api/tasks/${taskId}/restore`, { method: 'POST' });
      const restoreRes = await restoreTask(restoreReq, { params: Promise.resolve({ id: taskId }) });
      expect(restoreRes.status).toBe(200);
      const restoreData = await restoreRes.json();
      expect(restoreData.restored).toBe(true);
    });
  });
});
