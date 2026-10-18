import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { createAccountSession, getAccountUser, isAccountMode, passwordError, setAccountCookie } from '@/lib/account';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请输入有效的注册信息' }, { status: 400 });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mode = body.mode ?? 'personal';
  const error = passwordError(body.password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 60 || !isAccountMode(mode) || error) {
    return NextResponse.json({ error: error || '请填写有效邮箱、1–60 字的昵称和使用模式' }, { status: 400 });
  }
  await getDb();
  const passwordHash = await hash(body.password, 12);
  // Check after hashing so concurrent registration cannot bypass the duplicate check.
  if (query('SELECT id FROM users WHERE lower(email) = ?', [email]).length) {
    return NextResponse.json({ error: '邮箱已被使用，请登录或使用原有登录方式' }, { status: 409 });
  }
  const id = nanoid();
  let token = '';
  transaction(() => {
    run('INSERT INTO users (id, email, name, provider, provider_id, created_at, account_mode) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, email, name, 'credentials', id, Date.now(), mode]);
    run('INSERT INTO account_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)', [id, passwordHash, Date.now()]);
    token = createAccountSession(id);
  });
  saveDb();
  const res = NextResponse.json({ user: await getAccountUser(id) }, { status: 201 });
  setAccountCookie(res, token);
  return res;
}
