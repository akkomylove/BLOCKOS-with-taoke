import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { getUserId } from '@/lib/auth-utils';
import { createAccountSession, passwordError, setAccountCookie } from '@/lib/account';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';

export async function POST(req: Request) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用登录会话管理账号' }, { status: 403 });
  let id: string;
  try { id = await getUserId(req); } catch { return NextResponse.json({ error: '请先登录' }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const error = passwordError(body?.newPassword);
  if (error || typeof body?.currentPassword !== 'string' || Buffer.byteLength(body.currentPassword) > 72) return NextResponse.json({ error: error || '请输入当前密码' }, { status: 400 });
  await getDb();
  const row = query('SELECT password_hash FROM account_credentials WHERE user_id = ?', [id])[0];
  if (!row) return NextResponse.json({ error: '此账号使用第三方登录，请在原登录平台管理密码' }, { status: 400 });
  if (!await compare(body.currentPassword, String(row.password_hash))) return NextResponse.json({ error: '当前密码不正确' }, { status: 400 });
  if (body.currentPassword === body.newPassword) return NextResponse.json({ error: '新密码应与当前密码不同' }, { status: 400 });
  const passwordHash = await hash(body.newPassword, 12);
  let token = '';
  transaction(() => {
    run('UPDATE account_credentials SET password_hash = ?, updated_at = ? WHERE user_id = ?', [passwordHash, Date.now(), id]);
    run('DELETE FROM account_sessions WHERE user_id = ?', [id]);
    token = createAccountSession(id);
  });
  saveDb();
  const res = NextResponse.json({ success: true });
  setAccountCookie(res, token);
  return res;
}
