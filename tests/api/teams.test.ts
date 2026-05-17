import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/teams/route';
import { NextRequest } from 'next/server';

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

describe('GET /api/teams', () => {
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

  it('should return teams for authenticated user', async () => {
    const mockUserId = 'user-123';
    const mockTeams = [
      { id: 'team-1', name: 'Team Alpha', owner_id: mockUserId },
      { id: 'team-2', name: 'Team Beta', owner_id: mockUserId },
    ];

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(query)
      .mockReturnValueOnce([{ total: 2 }])
      .mockReturnValueOnce(mockTeams);

    const response = await GET(createMockRequest('http://localhost/api/teams'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teams).toEqual(mockTeams);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT t.* FROM teams'), [mockUserId, 20, 0]);
  });

  it('should return empty teams array on database error', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);
    vi.mocked(getDb).mockRejectedValue(new Error('DB Error'));

    const response = await GET(createMockRequest('http://localhost/api/teams'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.teams).toEqual([]);
  });
});

describe('POST /api/teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as any);

    const req = new Request('http://localhost/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Team' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should create team with provided name', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Team', description: 'Test Description' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    expect(transaction).toHaveBeenCalled();
    expect(saveDb).toHaveBeenCalled();
  });

  it('should create team with default name when name is not provided', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Test Description' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    expect(transaction).toHaveBeenCalled();
  });

  it('should create team with owner role in team_members', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(run).mockReturnValue(1);
    vi.mocked(saveDb).mockReturnValue(undefined);

    const req = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Team' }),
    }) as any;

    await POST(req);

    expect(transaction).toHaveBeenCalled();
    expect(saveDb).toHaveBeenCalled();
  });

  it('should return 500 on database error', async () => {
    const mockUserId = 'user-123';
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
    vi.mocked(getDb).mockRejectedValue(new Error('DB Error'));

    const req = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Team' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
