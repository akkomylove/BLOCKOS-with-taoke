import { getUserId } from '@/lib/auth-utils';
import { getAccountUser } from '@/lib/account';
import { getDb, query, run, saveDb, transaction } from '@/lib/db';
import { DEMO_USERS } from '@/lib/demo-users';
import { NextResponse } from 'next/server';

async function profile(id: string) {
  const user = await getAccountUser(id);
  const row = query('SELECT * FROM user_profiles WHERE user_id = ?', [id])[0];
  const demo = DEMO_USERS.find(item => item.id === id);
  let functions: string[] = [];
  try { functions = row ? JSON.parse(String(row.functions || '[]')) : demo?.functions || []; } catch {}
  return { userId: id, displayName: String(row?.display_name ?? user?.name ?? ''), title: String(row?.title ?? demo?.title ?? ''),
    functions, bio: String(row?.bio ?? ''), role: user?.role, isAdmin: user?.isAdmin, updatedAt: Number(row?.updated_at || 0) };
}
export async function GET() {
  let id: string;
  try { id = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  await getDb();
  return NextResponse.json(await profile(id));
}
export async function PATCH(req: Request) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用账号登录会话修改个人资料' }, { status: 403 });
  let id: string;
  try { id = await getUserId(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '资料格式不正确' }, { status: 400 });
  for (const [field, max] of [['displayName', 60], ['title', 80], ['bio', 1000]] as const) {
    if (field in body && (typeof body[field] !== 'string' || body[field].length > max || (field === 'displayName' && !body[field].trim()))) return NextResponse.json({ error: `${field} 格式不正确或过长` }, { status: 400 });
  }
  if ('functions' in body && (!Array.isArray(body.functions) || body.functions.length > 20 || body.functions.some((item: unknown) => typeof item !== 'string' || item.length > 40))) return NextResponse.json({ error: '职能最多 20 项，每项不超过 40 字' }, { status: 400 });
  await getDb();
  if (!await getAccountUser(id)) return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  const current = await profile(id);
  const next = { ...current, ...Object.fromEntries(['displayName', 'title', 'bio', 'functions'].filter(field => field in body).map(field => [field, body[field]])) };
  transaction(() => {
    run(`INSERT INTO user_profiles (user_id, display_name, title, functions, bio, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, title=excluded.title, functions=excluded.functions, bio=excluded.bio, updated_at=excluded.updated_at`,
    [id, next.displayName.trim(), next.title, JSON.stringify(next.functions), next.bio, Date.now()]);
    run('UPDATE users SET name = ? WHERE id = ?', [next.displayName.trim(), id]);
  });
  saveDb();
  return NextResponse.json({ success: true, profile: await profile(id) });
}
