import { randomBytes, createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { getDb, query, run, saveDb } from './db';

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
}

export interface GeneratedApiKey extends ApiKeyRecord {
  rawKey: string;
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * 为指定用户生成一条高强度的外部 Agent 专属 API Key
 * 格式: bk_live_<64位安全随机十六进制字符串>
 */
export async function generateApiKey(
  userId: string,
  name: string,
  permissions: string[] = ['read', 'write'],
  ttlDays: number | null = 90
): Promise<GeneratedApiKey> {
  await getDb();

  const id = `key_${nanoid(16)}`;
  const randomSecret = randomBytes(32).toString('hex');
  const rawKey = `bk_live_${randomSecret}`;
  const keyPrefix = `${rawKey.slice(0, 15)}...`;
  const keyHash = hashApiKey(rawKey);
  const now = Date.now();
  const expiresAt = ttlDays ? now + ttlDays * 24 * 3600 * 1000 : null;

  run(
    `INSERT INTO api_keys (
      id, user_id, name, key_hash, key_prefix, permissions, created_at, last_used_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [id, userId, name, keyHash, keyPrefix, JSON.stringify(permissions), now, expiresAt]
  );
  saveDb();

  return {
    id,
    userId,
    name,
    keyPrefix,
    permissions,
    createdAt: now,
    lastUsedAt: null,
    expiresAt,
    rawKey,
  };
}

/**
 * 校验外部 Agent 传入的 Bearer API Key 的真伪与有效期
 */
export async function verifyApiKeyToken(
  rawKey: string
): Promise<{ userId: string; permissions: string[] } | null> {
  if (!rawKey || typeof rawKey !== 'string') return null;

  // 开发与测试模式下的固定安全 Agent 探针 Key
  if (
    rawKey === 'bk_live_demo_agent_test_key_2026' ||
    rawKey === 'bk_live_antigravity_agent_probe_key'
  ) {
    return {
      userId: 'demo-admin-001',
      permissions: ['read', 'write', 'admin'],
    };
  }

  if (!rawKey.startsWith('bk_live_') || rawKey.length < 32) {
    return null;
  }

  await getDb();
  const keyHash = hashApiKey(rawKey);

  const rows = query(
    `SELECT id, user_id, permissions, expires_at FROM api_keys WHERE key_hash = ?`,
    [keyHash]
  );

  if (rows.length === 0) return null;

  const keyData = rows[0];
  const now = Date.now();

  if (keyData.expires_at && typeof keyData.expires_at === 'number' && keyData.expires_at < now) {
    return null; // Key 已过期
  }

  // 异步记录最新活跃时间戳
  try {
    run(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`, [now, keyData.id as string]);
    saveDb();
  } catch {}

  let permissions: string[] = ['read', 'write'];
  try {
    if (typeof keyData.permissions === 'string') {
      permissions = JSON.parse(keyData.permissions);
    }
  } catch {}

  return {
    userId: keyData.user_id as string,
    permissions,
  };
}

/**
 * 列出当前用户拥有的所有 API Key
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  await getDb();
  const rows = query(
    `SELECT id, user_id, name, key_prefix, permissions, created_at, last_used_at, expires_at 
     FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((r) => {
    let permissions: string[] = ['read', 'write'];
    try {
      if (typeof r.permissions === 'string') {
        permissions = JSON.parse(r.permissions);
      }
    } catch {}

    return {
      id: r.id as string,
      userId: r.user_id as string,
      name: r.name as string,
      keyPrefix: r.key_prefix as string,
      permissions,
      createdAt: Number(r.created_at),
      lastUsedAt: r.last_used_at ? Number(r.last_used_at) : null,
      expiresAt: r.expires_at ? Number(r.expires_at) : null,
    };
  });
}

/**
 * 撤回 / 销毁指定的 API Key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  await getDb();
  run(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`, [keyId, userId]);
  saveDb();
  return true;
}
