import { randomBytes, createHash } from 'crypto';
import { getDb, query, run, saveDb } from './db';
import type { AccountMode, AccountUser } from '@/types/account';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const ACCOUNT_COOKIE = 'blockos-session';
const SESSION_DURATION = 7 * 24 * 3600 * 1000;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const isAccountMode = (value: unknown): value is AccountMode => value === 'personal' || value === 'enterprise';
export function passwordError(value: unknown): string | null {
  return typeof value !== 'string' || value.length < 10 || Buffer.byteLength(value) > 72
    ? '密码至少 10 个字符，且不超过 72 字节' : null;
}

export async function getAccountMode(userId: string): Promise<AccountMode> {
  await getDb();
  const row = query('SELECT account_mode FROM users WHERE id = ?', [userId])[0];
  if (row && !row.account_mode) {
    const legacy = query(`SELECT user_id FROM team_members WHERE user_id = ?
      UNION SELECT user_id FROM project_members WHERE user_id = ?
      UNION SELECT owner_id FROM teams WHERE owner_id = ? UNION SELECT owner_id FROM projects WHERE owner_id = ?`, [userId, userId, userId, userId]);
    const mode = legacy.length ? 'enterprise' : 'personal';
    run('UPDATE users SET account_mode = ? WHERE id = ? AND account_mode IS NULL', [mode, userId]);
    saveDb();
    return mode;
  }
  return row?.account_mode === 'enterprise' ? 'enterprise' : 'personal';
}

export async function getAccountUser(userId: string): Promise<AccountUser | null> {
  await getDb();
  const row = query(`SELECT u.*, c.user_id AS credential_id FROM users u
    LEFT JOIN account_credentials c ON c.user_id = u.id WHERE u.id = ?`, [userId])[0];
  if (!row) return null;
  const admins = query(`SELECT user_id FROM team_members WHERE user_id = ? AND role IN ('admin','owner')
    UNION SELECT user_id FROM project_members WHERE user_id = ? AND role IN ('admin','owner')
    UNION SELECT owner_id FROM teams WHERE owner_id = ? UNION SELECT owner_id FROM projects WHERE owner_id = ?`, [userId, userId, userId, userId]);
  const isAdmin = admins.length > 0;
  return {
    id: userId, name: String(row.name || '用户'), email: String(row.email), avatar: String(row.avatar || ''),
    provider: String(row.provider), mode: await getAccountMode(userId),
    hasPassword: !!row.credential_id, isAdmin, role: isAdmin ? 'admin' : 'member',
  };
}

export function createAccountSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  run('DELETE FROM account_sessions WHERE expires_at <= ?', [now]);
  run('INSERT INTO account_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', [digest(token), userId, now + SESSION_DURATION, now]);
  return token;
}

export async function verifyAccountSession(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  await getDb();
  const row = query('SELECT user_id FROM account_sessions WHERE token_hash = ? AND expires_at > ?', [digest(token), Date.now()])[0];
  return row ? String(row.user_id) : null;
}

export async function clearLoginCookies(response: NextResponse) {
  const names = new Set([ACCOUNT_COOKIE, 'demo-session', 'authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token']);
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (/^(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?$/.test(cookie.name)) names.add(cookie.name);
  }
  for (const name of names) response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, secure: name.startsWith('__Secure-') || process.env.NODE_ENV === 'production', sameSite: 'lax' });
}

export async function setAccountCookie(response: NextResponse, token: string) {
  await clearLoginCookies(response);
  response.cookies.set(ACCOUNT_COOKIE, token, { path: '/', maxAge: SESSION_DURATION / 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
}

export function loginBlocked(email: string): boolean {
  const row = query('SELECT attempts, started_at FROM account_login_attempts WHERE email_hash = ?', [digest(email)])[0];
  return !!row && Number(row.attempts) >= 10 && Date.now() - Number(row.started_at) < 15 * 60 * 1000;
}

export function recordLoginFailure(email: string) {
  const now = Date.now();
  run('DELETE FROM account_login_attempts WHERE started_at <= ?', [now - 15 * 60 * 1000]);
  run(`INSERT INTO account_login_attempts (email_hash, attempts, started_at) VALUES (?, 1, ?)
    ON CONFLICT(email_hash) DO UPDATE SET attempts = attempts + 1`, [digest(email), now]);
  saveDb();
}
