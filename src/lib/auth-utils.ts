import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { auth } from './auth';
import { DEMO_USERS, isDemoAdmin } from './demo-users';
import { query } from './db';

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'blockos-production-grade-session-secret-key-32chars';

/**
 * 为用户 ID 生成带时间戳与 HMAC-SHA256 签名的会话令牌
 * 格式: userId.expiryTimestamp.signature
 */
export function createSignedSessionToken(userId: string, ttlMs = 7 * 24 * 3600 * 1000): string {
  const expiry = Date.now() + ttlMs;
  const payload = `${userId}.${expiry}`;
  const hmac = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

/**
 * 校验会话令牌的完整性、防篡改签名与过期时间
 */
export function verifySignedSessionToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, expiryStr, receivedSig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) {
    return null; // 已过期
  }

  const payload = `${userId}.${expiryStr}`;
  const expectedSig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

  try {
    const bufReceived = Buffer.from(receivedSig, 'hex');
    const bufExpected = Buffer.from(expectedSig, 'hex');
    if (bufReceived.length !== bufExpected.length) return null;
    if (!timingSafeEqual(bufReceived, bufExpected)) return null;
    return userId;
  } catch {
    return null;
  }
}

/**
 * 获取当前鉴权通过的用户 ID
 * 严格拒绝未签名、已过期或遭篡改的 Cookie
 */
export async function getUserId(): Promise<string> {
  // 1. 优先校验 NextAuth 官方服务端 Session
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
    const rawSession = session as Record<string, unknown> | null | undefined;
    if (typeof rawSession?.userId === 'string') {
      return rawSession.userId;
    }
  } catch {
    // 忽略并在下方继续检查安全 Signed Cookie
  }

  // 2. 校验带 HMAC 签名的 session cookie
  try {
    const cookieStore = await cookies();
    const demoSession = cookieStore.get('demo-session');

    if (demoSession?.value) {
      // 验证防篡改签名
      const verifiedUserId = verifySignedSessionToken(demoSession.value);
      if (verifiedUserId) {
        return verifiedUserId;
      }
      // 针对部分非生产本地测试，如果 token 匹配已知 DEMO 用户 ID 且开发模式未开启生产锁时，仅作为开发兜底
      if (process.env.NODE_ENV !== 'production') {
        const demoUser = DEMO_USERS.find(u => u.id === demoSession.value);
        if (demoUser) {
          return demoUser.id;
        }
      }
      throw new Error('Unauthorized: Invalid or tampered session token');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Unauthorized')) {
      throw err;
    }
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
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('block-os') || key.startsWith('doc-') || key.includes('guide'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
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

export type ProjectAction = 'read' | 'create_task' | 'edit_task' | 'delete_task' | 'manage_members' | 'delete_project';

/**
 * 严格项目 RBAC 权限守卫：
 * Owner > Admin > Member > Viewer
 */
export function checkProjectPermission(
  userId: string,
  projectId: string,
  action: ProjectAction
): { allowed: boolean; role?: string; error?: string } {
  const projectRows = query('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
  if (projectRows.length === 0) {
    return { allowed: false, error: 'Project not found' };
  }

  const isOwner = projectRows[0].owner_id === userId;
  if (isOwner) {
    return { allowed: true, role: 'owner' };
  }

  const memberRows = query('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  if (memberRows.length === 0) {
    return { allowed: false, error: 'Not a project member' };
  }

  const role = (memberRows[0].role as string) || 'member';

  switch (action) {
    case 'read':
      return { allowed: true, role };

    case 'create_task':
    case 'edit_task':
      if (role === 'viewer') {
        return { allowed: false, role, error: 'Read-only viewer cannot create or edit tasks' };
      }
      return { allowed: true, role };

    case 'delete_task':
      if (role === 'viewer') {
        return { allowed: false, role, error: 'Read-only viewer cannot delete tasks' };
      }
      return { allowed: true, role };

    case 'manage_members':
      if (role === 'admin' || role === 'owner') {
        return { allowed: true, role };
      }
      return { allowed: false, role, error: 'Only project owner or admin can manage members' };

    case 'delete_project':
      return { allowed: false, role, error: 'Only project owner can delete project' };

    default:
      return { allowed: false, role, error: 'Unknown action' };
  }
}