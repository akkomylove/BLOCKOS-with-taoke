import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tasks/route';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  query: vi.fn(),
  run: vi.fn(),
  saveDb: vi.fn(),
  transaction: vi.fn((fn: () => void) => fn()),
}));

import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';

function createMockRequest(url: string, method = 'GET'): Request {
  const urlObj = new URL(url);
  const mockReq = {
    method,
    nextUrl: urlObj,
    headers: new Headers(),
  } as unknown as Request;
  return mockReq;
}

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const req = createMockRequest('http://localhost/api/tasks?projectId=proj-1');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when projectId is missing', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = createMockRequest('http://localhost/api/tasks');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID required');
  });

  it('should return 403 when user is not a project member', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const req = createMockRequest(`http://localhost/api/tasks?projectId=${mockProjectId}`);

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a project member');
  });

  it('should return tasks for project member', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';
    const mockTasks = [
      { id: 'task-1', title: 'Task 1', project_id: mockProjectId },
      { id: 'task-2', title: 'Task 2', project_id: mockProjectId },
    ];

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ project_id: mockProjectId, user_id: mockUserId }])
      .mockReturnValueOnce([{ total: 2 }])
      .mockReturnValueOnce(mockTasks);

    const req = createMockRequest(`http://localhost/api/tasks?projectId=${mockProjectId}`);

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toEqual(mockTasks);
  });

  it('should return child tasks when parentId is provided', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';
    const mockParentId = 'task-1';
    const mockChildTasks = [
      { id: 'subtask-1', title: 'Subtask 1', parent_id: mockParentId },
      { id: 'subtask-2', title: 'Subtask 2', parent_id: mockParentId },
    ];

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ project_id: mockProjectId, user_id: mockUserId }])
      .mockReturnValueOnce([{ total: 2 }])
      .mockReturnValueOnce(mockChildTasks);

    const req = createMockRequest(`http://localhost/api/tasks?projectId=${mockProjectId}&parentId=${mockParentId}`);

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toEqual(mockChildTasks);
  });
});

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'proj-1', title: 'New Task' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when projectId is missing', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Task' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID and title required');
  });

  it('should return 400 when title is missing', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'proj-1' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID and title required');
  });

  it('should return 400 when title exceeds 500 characters', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const longTitle = 'a'.repeat(501);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'proj-1', title: longTitle }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title must be a non-empty string with maximum 500 characters');
  });

  it('should accept title with exactly 500 characters', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';
    const validTitle = 'a'.repeat(500);

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ project_id: mockProjectId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: validTitle }),
    }) as any;

    const response = await POST(req);

    expect(response.status).toBe(200);
  });

  it('should return 403 when user is not a project member', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: 'New Task' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a project member');
  });

  it('should return 404 when parent task is not found', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';
    const mockParentId = 'task-parent-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ project_id: mockProjectId, user_id: mockUserId }])
      .mockReturnValueOnce([]);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: 'Subtask', parentId: mockParentId }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Parent task not found');
  });

  it('should create task without parentId', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ project_id: mockProjectId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: 'New Task' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
  });

  it('should create subtask with valid parentId', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';
    const mockParentId = 'task-parent-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ project_id: mockProjectId, user_id: mockUserId }])
      .mockReturnValueOnce([{ id: mockParentId, project_id: mockProjectId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: 'Subtask', parentId: mockParentId }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining([mockParentId])
    );
  });

  it('should create task with default status and priority', async () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'proj-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ project_id: mockProjectId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: mockProjectId, title: 'Minimal Task' }),
    }) as any;

    await POST(req);

    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining(['todo', 'medium'])
    );
  });

  it('should return 500 on database error', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockRejectedValue(new Error('DB Error'));

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'proj-1', title: 'New Task' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
