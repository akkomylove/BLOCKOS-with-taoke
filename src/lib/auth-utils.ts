import { cookies } from 'next/headers';
import { auth } from './auth';
import { DEMO_USERS, isDemoAdmin } from './demo-users';

export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const demoSession = cookieStore.get('demo-session');

  if (demoSession?.value) {
    const demoUser = DEMO_USERS.find(u => u.id === demoSession.value);
    if (demoUser) return demoUser.id;
    return demoSession.value;
  }

  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  if (process.env.NODE_ENV === 'development') {
    const devUserId = `dev-user-${process.pid}`;
    return devUserId;
  }

  throw new Error('Unauthorized');
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    return await getUserId();
  } catch {
    return null;
  }
}

export function logoutUser() {
  if (typeof document !== 'undefined') {
    document.cookie = 'demo-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const userId = await getUserId();
    return isDemoAdmin(userId);
  } catch {
    return false;
  }
}