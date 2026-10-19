import type { StateStorage } from 'zustand/middleware';

interface LargeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const marker = '@blockos/indexeddb/v1';
const largeValueLimit = 128 * 1024;
let database: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('blockos-workspace-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('entries'); };
    request.onerror = () => { database = null; reject(request.error); };
    request.onblocked = () => { database = null; reject(new Error('本地数据库暂时无法打开')); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = null; };
      resolve(db);
    };
  });
  return database;
}

async function databaseOperation(key: string, mode: 'read' | 'write' | 'remove', value?: string): Promise<string | null> {
  if (typeof indexedDB === 'undefined') {
    if (mode === 'write') throw new Error('浏览器不支持大容量本地存储');
    return null;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', mode === 'read' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore('entries');
    const request = mode === 'read' ? store.get(key) : mode === 'write' ? store.put(value, key) : store.delete(key);
    let result: string | null = null;
    request.onsuccess = () => { if (mode === 'read') result = typeof request.result === 'string' ? request.result : null; };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || request.error || new Error('本地缓存写入失败'));
    transaction.onerror = () => reject(transaction.error || request.error || new Error('本地缓存读写失败'));
  });
}

const largeStorage: LargeStorage = {
  getItem: key => databaseOperation(key, 'read'),
  setItem: async (key, value) => { await databaseOperation(key, 'write', value); },
  removeItem: async key => { await databaseOperation(key, 'remove'); },
};

export function createWorkspaceStorage(
  local: () => Storage,
  large: LargeStorage,
  onError: (failed: boolean) => void = () => {},
): StateStorage {
  const pending = new Map<string, { value: string | null }>();
  const writes = new Map<string, Promise<void>>();
  const largeKeys = new Set<string>();
  const failed = new Set<string>();
  const report = (key: string, error: boolean) => {
    const wasFailed = failed.size > 0;
    if (error) failed.add(key); else failed.delete(key);
    if (wasFailed !== (failed.size > 0)) onError(failed.size > 0);
  };
  const enqueue = (key: string, value: string | null, operation: () => Promise<void>) => {
    const entry = { value };
    pending.set(key, entry);
    const next = (writes.get(key) || Promise.resolve()).then(async () => {
      if (pending.get(key) !== entry) return;
      try {
        await operation();
        report(key, false);
        if (pending.get(key) === entry) pending.delete(key);
      } catch {
        report(key, true);
      }
    }).finally(() => { if (writes.get(key) === next) writes.delete(key); });
    writes.set(key, next);
    return next;
  };
  const write = async (key: string, value: string) => {
    if (value.length <= largeValueLimit) {
      let stored = false;
      try { local().setItem(key, value); stored = true; } catch {}
      if (stored) {
        if (largeKeys.has(key)) { await large.removeItem(key); largeKeys.delete(key); }
        return;
      }
    }
    await large.setItem(key, value);
    largeKeys.add(key);
    try { local().removeItem(key); local().setItem(key, marker); } catch {}
  };
  return {
    getItem: key => {
      const queued = pending.get(key);
      if (queued) return queued.value;
      try {
        const raw = local().getItem(key);
        if (raw !== null && raw !== marker) return raw;
        if (raw === marker) largeKeys.add(key);
      } catch {}
      return large.getItem(key).then(value => { if (value !== null) largeKeys.add(key); return value; }).catch(() => { report(key, true); return null; });
    },
    setItem: (key, value) => {
      if (!writes.has(key) && !largeKeys.has(key) && value.length <= largeValueLimit) {
        try {
          if (local().getItem(key) !== marker) { local().setItem(key, value); pending.delete(key); report(key, false); return; }
          largeKeys.add(key);
        } catch {}
      }
      return enqueue(key, value, () => write(key, value));
    },
    removeItem: key => enqueue(key, null, async () => {
      let removed = false;
      try { local().removeItem(key); removed = true; } catch {}
      await large.removeItem(key);
      largeKeys.delete(key);
      if (!removed) local().removeItem(key);
    }),
  };
}

const listeners = new Set<(message: string | null) => void>();
export const workspaceStorage = createWorkspaceStorage(() => localStorage, largeStorage, failed => {
  const message = failed ? '本地缓存空间不足或不可用，请保持页面打开并重试保存，或导出文档备份。' : null;
  queueMicrotask(() => { for (const listener of listeners) listener(message); });
});

export function onWorkspaceStorageError(listener: (message: string | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
