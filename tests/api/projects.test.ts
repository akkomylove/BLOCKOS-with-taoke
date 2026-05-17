import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/projects/route';

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

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return projects for authenticated user', async () => {
    const mockUserId = 'user-123';
    const mockProjects = [
      { id: 'proj-1', name: 'Project Alpha', team_id: 'team-1' },
      { id: 'proj-2', name: 'Project Beta', team_id: 'team-1' },
    ];

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ total: 2 }])
      .mockReturnValueOnce(mockProjects);

    const response = await GET(createMockRequest('http://localhost/api/projects'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toEqual(mockProjects);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project', teamId: 'team-1' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when teamId is missing', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid teamId is required');
  });

  it('should return 400 when teamId is empty string', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', teamId: '' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid teamId is required');
  });

  it('should return 400 when teamId is not a string', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', teamId: 123 }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid teamId is required');
  });

  it('should return 403 when user is not a team member', async () => {
    const mockUserId = 'user-123';
    const mockTeamId = 'team-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([]);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', teamId: mockTeamId }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a team member');
  });

  it('should create project with valid teamId', async () => {
    const mockUserId = 'user-123';
    const mockTeamId = 'team-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ team_id: mockTeamId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', teamId: mockTeamId }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    expect(transaction).toHaveBeenCalled();
    expect(saveDb).toHaveBeenCalled();
  });

  it('should create project with default name when name is not provided', async () => {
    const mockUserId = 'user-123';
    const mockTeamId = 'team-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ team_id: mockTeamId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: mockTeamId }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(transaction).toHaveBeenCalled();
  });

  it('should add creator as project member with owner role', async () => {
    const mockUserId = 'user-123';
    const mockTeamId = 'team-1';

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query).mockReturnValue([{ team_id: mockTeamId, user_id: mockUserId }]);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Project', teamId: mockTeamId }),
    }) as any;

    await POST(req);

    expect(transaction).toHaveBeenCalled();
    expect(saveDb).toHaveBeenCalled();
  });

  it('should return 500 on database error', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockRejectedValue(new Error('DB Error'));

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', teamId: 'team-1' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
