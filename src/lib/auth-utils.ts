import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

/**
 * 获取用户 ID - 支持简单登录和 NextAuth
 * @returns 用户 ID
 */
export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const demoSession = cookieStore.get('demo-session');
  
  if (demoSession?.value) {
    return demoSession.value;
  }
  
  const session = await auth();
  if (session?.userId) {
    return session.userId;
  }
  
  if (process.env.NODE_ENV === 'development') {
    const userId = 'dev-user-' + process.pid;
    await getDb();
    const existingUser = query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.length === 0) {
      run(
        'INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'dev@localhost.com', '开发用户', null, 'dev', 'dev-account', Date.now()]
      );
      saveDb();
    }
    return userId;
  }
  
  throw new Error('Unauthorized');
}

/**
 * 检查是否认证
 * @returns 已认证的用户 ID，未认证时返回 null
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    return await getUserId();
  } catch {
    return null;
  }
}

/**
 * 登出用户
 */
export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('demo-session');
}

