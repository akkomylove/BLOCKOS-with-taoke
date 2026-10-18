import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { getAccountUser, isAccountMode } from '@/lib/account';
import { getDb, run, saveDb } from '@/lib/db';

export async function PATCH(req: Request) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用登录会话管理账号' }, { status: 403 });
  let id: string;
  try { id = await getUserId(req); } catch { return NextResponse.json({ error: '请先登录' }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body || !isAccountMode(body.mode)) return NextResponse.json({ error: '请选择个人模式或企业模式' }, { status: 400 });
  await getDb();
  if (!await getAccountUser(id)) return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  run('UPDATE users SET account_mode = ? WHERE id = ?', [body.mode, id]);
  saveDb();
  return NextResponse.json({ user: await getAccountUser(id) });
}
