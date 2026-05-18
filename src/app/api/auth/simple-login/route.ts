import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { DEMO_USERS } from '@/lib/demo-users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email } = body;

    const demoUser = DEMO_USERS.find(u => u.id === userId);
    const finalName = demoUser?.name || name || 'Demo User';
    const finalEmail = demoUser?.email || email || 'demo@blockos.dev';
    const finalId = demoUser?.id || userId || nanoid();

    const response = NextResponse.json({
      success: true,
      user: {
        id: finalId,
        name: finalName,
        email: finalEmail,
        role: demoUser?.role || 'employee',
      },
    });

    response.cookies.set({
      name: 'demo-session',
      value: finalId,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Simple login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}