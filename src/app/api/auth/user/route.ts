import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-utils';
import { getAccountUser } from '@/lib/account';

export async function GET() {
  const id = await getAuthUserId();
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getAccountUser(id);
  return user ? NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ error: 'User not found' }, { status: 404 });
}
