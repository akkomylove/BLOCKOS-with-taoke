import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { DEMO_USERS } from '@/lib/demo-users';
import { createSignedSessionToken } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email } = body;

    // 生产环境下禁止使用未在预置白名单内的未经验证用户 ID 进行快捷登录
    const isProduction = process.env.NODE_ENV === 'production';
    const demoUser = DEMO_USERS.find((u) => u.id === userId);

    if (isProduction && !demoUser && !process.env.ALLOW_INSECURE_DEMO_LOGIN) {
      return NextResponse.json(
        { error: '生产环境已禁用未授权用户快捷登录，请使用 OAuth 正式登录' },
        { status: 403 }
      );
    }

    const finalName = demoUser?.name || name || 'Demo User';
    const finalEmail = demoUser?.email || email || 'demo@blockos.dev';
    const finalId = demoUser?.id || userId || nanoid();

    // 确保用户已在数据库存在
    await getDb();
    const existing = query('SELECT id FROM users WHERE id = ?', [finalId]);
    if (existing.length === 0) {
      run(
        'INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [finalId, finalEmail, finalName, null, 'demo', finalId, Date.now()]
      );
      saveDb();
    }

    // 签发服务端带 HMAC-SHA256 签名的安全令牌
    const signedToken = createSignedSessionToken(finalId);

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
      value: signedToken,
      httpOnly: true, // 防 XSS 窃取
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天有效期
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Simple login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}