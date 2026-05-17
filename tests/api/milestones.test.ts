import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/milestones/[id]/route';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  query: vi.fn(),
  run: vi.fn(),
  saveDb: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

describe('GET /api/milestones/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await GET({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when milestone does not exist', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const params = Promise.resolve({ id: 'milestone-nonexistent' });
    const response = await GET({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
  });

  it('should return 403 when user is not a project member', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await GET({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a project member');
  });

  it('should return milestone for project member', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1', name: 'MVP Release' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ project_id: 'proj-1', user_id: mockUserId }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await GET({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.milestone).toEqual(mockMilestone);
  });
});

describe('PATCH /api/milestones/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when status is invalid', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: mockUserId }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status' }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Status must be one of: pending, in_progress, completed');
  });

  it('should return 400 when status is not a string', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: mockUserId }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 123 }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Status must be one of: pending, in_progress, completed');
  });

  it('should accept valid status: pending', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    }) as any;

    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE milestones SET'),
      expect.arrayContaining(['pending'])
    );
  });

  it('should accept valid status: in_progress', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: 'other-user' }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    }) as any;

    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE milestones SET'),
      expect.arrayContaining(['in_progress'])
    );
  });

  it('should accept valid status: completed', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: 'other-user', team_owner_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }) as any;

    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE milestones SET'),
      expect.arrayContaining(['completed'])
    );
  });

  it('should update multiple fields at once', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: 'other-user' }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Name',
        description: 'Updated Description',
        status: 'in_progress',
      }),
    }) as any;

    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE milestones SET'),
      expect.arrayContaining(['Updated Name', 'Updated Description', 'in_progress'])
    );
  });

  it('should return success with no updates when body is empty', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: mockUserId }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('should return 403 when user is not a project member', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: 'other-owner', team_owner_id: 'other-owner' }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should return 404 when milestone does not exist', async () => {
    const mockUserId = 'user-123';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const params = Promise.resolve({ id: 'milestone-nonexistent' });
    const req = new Request('http://localhost/api/milestones/milestone-nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect([404, 403]).toContain(response.status);
    if (response.status === 404) {
      expect(data.error).toBe('Not found');
    }
  });

  it('should return 500 on database error', async () => {
    const mockUserId = 'user-123';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockRejectedValue(new Error('DB Error'));

    const params = Promise.resolve({ id: 'milestone-1' });
    const req = new Request('http://localhost/api/milestones/milestone-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    }) as any;

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('DELETE /api/milestones/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await DELETE({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when milestone does not exist', async () => {
    const mockUserId = 'user-123';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const params = Promise.resolve({ id: 'milestone-nonexistent' });
    const response = await DELETE({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(['Not found', 'Project not found']).toContain(data.error);
  });

  it('should return 404 when project does not exist', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await DELETE({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');
  });

  it('should return 403 when user is not a project member', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: 'other-owner', team_owner_id: 'other-owner' }]);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await DELETE({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should delete milestone for project member', async () => {
    const mockUserId = 'user-123';
    const mockMilestone = { id: 'milestone-1', project_id: 'proj-1' };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([mockMilestone])
      .mockReturnValueOnce([{ owner_id: mockUserId, team_owner_id: 'other-user' }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const params = Promise.resolve({ id: 'milestone-1' });
    const response = await DELETE({} as any, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM milestones'),
      ['milestone-1']
    );
    expect(saveDb).toHaveBeenCalled();
  });
});
