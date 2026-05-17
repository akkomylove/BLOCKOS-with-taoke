import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth-utils';

export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}

