import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => jar.has(name) ? { name, value: jar.get(name)! } : undefined, getAll: () => [...jar].map(([name, value]) => ({ name, value })) }),
  headers: async () => new Headers(),
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }));

import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as password } from '@/app/api/account/password/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as demoLogin } from '@/app/api/auth/simple-login/route';
import { GET as getUser } from '@/app/api/auth/user/route';
import { PATCH as changeMode } from '@/app/api/account/route';
import { GET as profile, PATCH as updateProfile } from '@/app/api/user/profile/route';
import { POST as createTeam, GET as teams } from '@/app/api/teams/route';
import { POST as createProject } from '@/app/api/projects/route';
import { getDb, query, run } from '@/lib/db';
import { getAccountMode, verifyAccountSession } from '@/lib/account';
import { generateApiKey } from '@/lib/api-keys';
import { GET as getKeys, POST as postKeys, DELETE as deleteKeys } from '@/app/api/open/keys/route';

const request = (path: string, body: unknown = {}, method = 'POST', headers: Record<string, string> = {}) => new NextRequest(`http://localhost${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
const payload = () => ({ email: `probe-${nanoid()}@example.test`, name: '独立账号', password: 'secure-password-123' });
function useCookie(response: { cookies: { get(name: string): { value: string } | undefined } }) {
  const token = response.cookies.get('blockos-session')!.value;
  jar.set('blockos-session', token);
  return token;
}

describe('Account lifecycle and mode boundaries (real DB)', () => {
  beforeEach(async () => { jar.clear(); await getDb(); });

  it('registers a personal account with a hashed password and a revocable httpOnly session', async () => {
    const input = payload();
    const res = await register(request('/api/auth/register', input));
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
    const { user } = await res.json();
    expect(user).toMatchObject({ name: input.name, mode: 'personal', hasPassword: true, isAdmin: false });
    expect(JSON.stringify(user)).not.toContain('password_hash');
    const token = useCookie(res);
    expect(await verifyAccountSession(token)).toBe(user.id);
    expect(query('SELECT password_hash FROM account_credentials WHERE user_id = ?', [user.id])[0].password_hash).not.toContain(input.password);
    expect((await (await getUser()).json()).id).toBe(user.id);
    expect((await teams(request('/api/teams', {}, 'GET'))).status).toBe(403);
  });

  it.each([{ password: 'short' }, { name: '' }, { email: 'invalid' }, { mode: 'admin' }, { password: '密'.repeat(30) }])('validates registration: %j', async extra => {
    const res = await register(request('/api/auth/register', { ...payload(), ...extra }));
    expect(res.status).toBe(400);
  });

  it('normalizes email, rejects duplicates, and returns generic login failures', async () => {
    const input = payload();
    await register(request('/api/auth/register', input));
    expect((await register(request('/api/auth/register', { ...input, email: input.email.toUpperCase() }))).status).toBe(409);
    expect((await login(request('/api/auth/login', { ...input, password: 'wrong-password' }))).status).toBe(401);
    const res = await login(request('/api/auth/login', { ...input, email: `  ${input.email.toUpperCase()} ` }));
    expect(res.status).toBe(200);
    expect(await verifyAccountSession(useCookie(res))).toBe((await res.json()).user.id);
  });

  it('does not allow arbitrary user ids through the demo login endpoint', async () => {
    expect((await demoLogin(request('/api/auth/simple-login', { userId: 'forged-user' }))).status).toBe(403);
  });

  it('disables public demo login in production unless explicitly enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEMO_LOGIN', 'false');
    try {
      expect((await demoLogin(request('/api/auth/simple-login', { userId: 'demo-admin-001' }))).status).toBe(403);
    } finally { vi.unstubAllEnvs(); }
  });

  it('keeps documents, teams and projects across personal/enterprise switches', async () => {
    const res = await register(request('/api/auth/register', payload()));
    const { user } = await res.json(); useCookie(res);
    expect((await changeMode(request('/api/account', { mode: 'enterprise' }, 'PATCH'))).status).toBe(200);
    const team = await createTeam(request('/api/teams', { name: '真实团队' }));
    expect(team.status).toBe(200);
    const teamId = (await team.json()).id;
    const project = await createProject(request('/api/projects', { teamId, name: '真实项目' }));
    expect(project.status).toBe(200);
    const pageId = nanoid();
    run('INSERT INTO pages (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [pageId, user.id, '个人文档', Date.now(), Date.now()]);
    await changeMode(request('/api/account', { mode: 'personal' }, 'PATCH'));
    expect((await teams(request('/api/teams', {}, 'GET'))).status).toBe(403);
    expect(query('SELECT id FROM pages WHERE id = ?', [pageId])).toHaveLength(1);
    expect(query('SELECT id FROM projects WHERE team_id = ?', [teamId])).toHaveLength(1);
    await changeMode(request('/api/account', { mode: 'enterprise' }, 'PATCH'));
    expect((await (await teams(request('/api/teams', {}, 'GET'))).json()).teams.map((item: { id: string }) => item.id)).toContain(teamId);
  });

  it('updates profile fields partially and keeps account display names consistent', async () => {
    const res = await register(request('/api/auth/register', payload())); useCookie(res);
    await updateProfile(request('/api/user/profile', { title: '工程师', functions: ['开发'], bio: '已有简介' }, 'PATCH'));
    await updateProfile(request('/api/user/profile', { displayName: '新昵称' }, 'PATCH'));
    expect(await (await profile()).json()).toMatchObject({ displayName: '新昵称', title: '工程师', functions: ['开发'], bio: '已有简介' });
    expect((await (await getUser()).json()).name).toBe('新昵称');
    await updateProfile(request('/api/user/profile', { functions: [], title: '', bio: '' }, 'PATCH'));
    expect(await (await profile()).json()).toMatchObject({ functions: [], title: '', bio: '' });
    expect((await updateProfile(request('/api/user/profile', { functions: [3] }, 'PATCH'))).status).toBe(400);
  });

  it('changes passwords, rejects the old password and revokes other sessions', async () => {
    const input = payload();
    const first = await register(request('/api/auth/register', input));
    const oldToken = useCookie(first);
    const second = await login(request('/api/auth/login', input));
    const secondToken = second.cookies.get('blockos-session')!.value;
    const changed = await password(request('/api/account/password', { currentPassword: input.password, newPassword: 'new-secure-password-456' }));
    expect(changed.status).toBe(200);
    expect(await verifyAccountSession(oldToken)).toBeNull();
    expect(await verifyAccountSession(secondToken)).toBeNull();
    expect(await verifyAccountSession(useCookie(changed))).toBeTruthy();
    expect((await login(request('/api/auth/login', input))).status).toBe(401);
    expect((await login(request('/api/auth/login', { ...input, password: 'new-secure-password-456' }))).status).toBe(200);
    const logoutToken = jar.get('blockos-session')!;
    jar.set('authjs.session-token.0', 'chunk');
    const out = await logout();
    expect(out.cookies.get('authjs.session-token.0')?.value).toBe('');
    expect(await verifyAccountSession(logoutToken)).toBeNull();
    expect((await getUser()).status).toBe(401);
  });

  it('blocks locked login identities and expired sessions', async () => {
    const input = payload();
    const res = await register(request('/api/auth/register', input));
    const token = useCookie(res);
    run('UPDATE account_sessions SET expires_at = 1 WHERE user_id = ?', [(await res.json()).user.id]);
    expect(await verifyAccountSession(token)).toBeNull();
    expect((await getUser()).status).toBe(401);
    // Establish the lock via real failures; the expensive password hashing is bounded.
    for (let i = 0; i < 10; i++) await login(request('/api/auth/login', { email: input.email, password: 'wrong' }));
    expect((await login(request('/api/auth/login', input))).status).toBe(429);
  }, 15000);

  it('migrates legacy collaborators once without overriding a later personal preference', async () => {
    const uid = nanoid();
    run('INSERT INTO users (id,email,name,provider,provider_id,created_at) VALUES (?,?,?,?,?,?)', [uid, `${uid}@test.dev`, '旧账号', 'test', uid, Date.now()]);
    run('INSERT INTO team_members (id,team_id,user_id,role,joined_at) VALUES (?,?,?,?,?)', [nanoid(), 'demo-team-001', uid, 'member', Date.now()]);
    expect(await getAccountMode(uid)).toBe('enterprise');
    run("UPDATE users SET account_mode = 'personal' WHERE id = ?", [uid]);
    expect(await getAccountMode(uid)).toBe('personal');
  });

  it('does not let Bearer API keys change account mode', async () => {
    const res = await register(request('/api/auth/register', payload()));
    const { user } = await res.json();
    const key = await generateApiKey(user.id, 'read', ['read']);
    expect((await changeMode(request('/api/account', { mode: 'enterprise' }, 'PATCH', { Authorization: `Bearer ${key.rawKey}` }))).status).toBe(403);
  });

  it('does not let API keys issue stronger keys or modify personal profile', async () => {
    const headers = { Authorization: 'Bearer bk_live_test' };
    for (const [handler, method] of [[getKeys, 'GET'], [postKeys, 'POST'], [deleteKeys, 'DELETE']] as const) {
      expect((await handler(request('/api/open/keys', {}, method, headers))).status).toBe(403);
    }
    expect((await updateProfile(request('/api/user/profile', { displayName: 'forged' }, 'PATCH', headers))).status).toBe(403);
  });

  it('rejects personal accounts at every enterprise route and HTTP method', async () => {
    const res = await register(request('/api/auth/register', payload())); useCookie(res);
    const modules = import.meta.glob('../../src/app/api/{teams,projects,tasks,milestones,invites,workflow,user/tasks,ai/analyze}/**/route.ts');
    expect(Object.keys(modules).length).toBeGreaterThan(30);
    let checked = 0;
    for (const [path, load] of Object.entries(modules)) {
      const route = await load() as Record<string, (...args: unknown[]) => Promise<Response>>;
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (!route[method]) continue;
        const response = await route[method](request('/api/probe', {}, method), { params: Promise.resolve({ id: 'probe', code: 'probe', reqId: 'probe', execId: 'probe', previewId: 'probe' }) });
        expect(response.status, `${method} ${path}`).toBe(403);
        expect((await response.json()).code).toBe('ENTERPRISE_MODE_REQUIRED');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(60);
  });
});
