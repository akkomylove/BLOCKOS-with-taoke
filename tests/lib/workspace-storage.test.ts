import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceStorage } from '@/lib/workspace-storage';

function setup({ localFails = false, databaseFails = false } = {}) {
  const localValues = new Map<string, string>();
  const databaseValues = new Map<string, string>();
  const local = {
    getItem: vi.fn((key: string) => localValues.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (localFails) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      localValues.set(key, value);
    }),
    removeItem: vi.fn((key: string) => { localValues.delete(key); }),
  } as unknown as Storage;
  const large = {
    getItem: vi.fn(async (key: string) => databaseValues.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      if (databaseFails) throw new Error('disk full');
      databaseValues.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => { databaseValues.delete(key); }),
  };
  const status = vi.fn();
  const storage = createWorkspaceStorage(() => local, large, status);
  return { storage, local, large, status, localValues, databaseValues };
}

describe('workspace storage under browser quota pressure', () => {
  it('reads legacy data and keeps small documents in the existing synchronous cache', () => {
    const { storage, localValues, large } = setup();
    localValues.set('block-os-storage', '{"state":{"history":[]}}');
    expect(storage.getItem('block-os-storage')).toBe('{"state":{"history":[]}}');
    storage.setItem('block-os-storage', 'new state');
    expect(localValues.get('block-os-storage')).toBe('new state');
    expect(large.setItem).not.toHaveBeenCalled();
  });

  it('stores full media and history beyond localStorage capacity and restores it in a new instance', async () => {
    const { storage, local, large, localValues } = setup();
    const value = JSON.stringify({ state: { pageBlocks: { doc: [{ content: 'data:image/png;base64,' + 'A'.repeat(3_000_000) }] }, history: Array.from({ length: 4 }, () => ({ content: 'A'.repeat(1_000_000) })) } });
    await storage.setItem('block-os-storage', value);
    expect(localValues.get('block-os-storage')!.length).toBeLessThan(100);
    const reopened = createWorkspaceStorage(() => local, large);
    expect(await reopened.getItem('block-os-storage')).toBe(value);
  });

  it('falls back after an actual quota exception without blocking the caller', async () => {
    const { storage, databaseValues, status } = setup({ localFails: true });
    await expect(Promise.resolve(storage.setItem('user-cache', 'edited'))).resolves.toBeUndefined();
    expect(databaseValues.get('user-cache')).toBe('edited');
    expect(await storage.getItem('user-cache')).toBe('edited');
    expect(status).not.toHaveBeenCalledWith(true);
  });

  it('does not let an older pending write overwrite a newer edit or resurrect a removed mirror', async () => {
    const { storage, local, large, databaseValues } = setup({ localFails: true });
    let finish!: () => void;
    large.setItem.mockImplementationOnce(async (key, value) => {
      await new Promise<void>(resolve => { finish = resolve; });
      databaseValues.set(key, value);
    });
    const first = storage.setItem('document', 'first');
    await Promise.resolve();
    const second = storage.setItem('document', 'second');
    expect(storage.getItem('document')).toBe('second');
    finish();
    await first;
    await second;
    expect(await createWorkspaceStorage(() => local, large).getItem('document')).toBe('second');
    const write = storage.setItem('document', 'third');
    const removal = storage.removeItem('document');
    await write;
    await removal;
    expect(await createWorkspaceStorage(() => local, large).getItem('document')).toBeNull();
  });

  it('keeps the latest edit in memory and reports failed durable storage when both stores fail', async () => {
    const { storage, large, status } = setup({ localFails: true, databaseFails: true });
    await storage.setItem('document', 'unsaved draft');
    expect(storage.getItem('document')).toBe('unsaved draft');
    expect(status).toHaveBeenLastCalledWith(true);
    large.setItem.mockResolvedValueOnce(undefined);
    await storage.setItem('document', 'retry');
    expect(status).toHaveBeenLastCalledWith(false);
  });

  it('removes the old large copy when a document becomes small again', async () => {
    const { storage, databaseValues, localValues } = setup();
    await storage.setItem('document', 'A'.repeat(200_000));
    await storage.setItem('document', 'small again');
    expect(localValues.get('document')).toBe('small again');
    expect(databaseValues.has('document')).toBe(false);
  });
});
