import { withDatabaseRequest } from '@/lib/database-request';
import { NextResponse } from 'next/server';
import { compare, hashSync } from 'bcryptjs';
import { getDb, query, run, saveDb } from '@/lib/db';
import { createAccountSession, digest, getAccountUser, loginBlocked, recordLoginFailure, setAccountCookie } from '@/lib/account';

const DUMMY_HASH = hashSync('unavailable-account-password', 12);
async function POSTDatabaseHandler(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  if (!email || email.length > 254 || typeof password !== 'string' || Buffer.byteLength(password) > 72) return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
  await getDb();
  if (loginBlocked(email)) return NextResponse.json({ error: '尝试次数过多，请在 15 分钟后重试' }, { status: 429 });
  const row = query(`SELECT u.id, c.password_hash FROM users u JOIN account_credentials c ON c.user_id = u.id WHERE lower(u.email) = ?`, [email])[0];
  const valid = await compare(password, String(row?.password_hash || DUMMY_HASH));
  if (!row || !valid) {
    recordLoginFailure(email);
    return NextResponse.json({ error: '邮箱或密码不正确' }, { status: 401 });
  }
  run('DELETE FROM account_login_attempts WHERE email_hash = ?', [digest(email)]);
  const token = createAccountSession(String(row.id));
  saveDb();
  const res = NextResponse.json({ user: await getAccountUser(String(row.id)) });
  await setAccountCookie(res, token);
  return res;
}

export const POST = withDatabaseRequest(POSTDatabaseHandler);
