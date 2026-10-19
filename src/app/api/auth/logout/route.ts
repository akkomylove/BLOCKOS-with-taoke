import { withDatabaseRequest } from '@/lib/database-request';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCOUNT_COOKIE, digest } from '@/lib/account';
import { getDb, run, saveDb } from '@/lib/db';

async function POSTDatabaseHandler() {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (token) {
    await getDb();
    run('DELETE FROM account_sessions WHERE token_hash = ?', [digest(token)]);
    saveDb();
  }
  const res = NextResponse.json({ success: true });
  const names = new Set([ACCOUNT_COOKIE, 'demo-session', 'next-auth.session-token', '__Secure-authjs.session-token', 'authjs.session-token']);
  for (const cookie of store.getAll()) {
    if (/^(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?$/.test(cookie.name)) names.add(cookie.name);
  }
  for (const name of names) res.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: name.startsWith('__Secure-') || process.env.NODE_ENV === 'production' });
  return res;
}

export const POST = withDatabaseRequest(POSTDatabaseHandler);
