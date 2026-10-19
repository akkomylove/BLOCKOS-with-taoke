import { withDatabaseRequest } from '@/lib/database-request';
import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-utils';
import { getAccountUser } from '@/lib/account';

async function GETDatabaseHandler() {
  const id = await getAuthUserId();
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getAccountUser(id);
  return user ? NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ error: 'User not found' }, { status: 404 });
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
