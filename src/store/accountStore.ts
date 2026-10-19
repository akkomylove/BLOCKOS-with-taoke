import { create } from 'zustand';
import type { AccountMode, AccountUser } from '@/types/account';
import { useCollaborationStore } from './collaborationStore';
import { useBlockStore } from './blockStore';

let pending: Promise<void> | null = null;
function clearCollaboration() {
  useCollaborationStore.setState({ teams: [], projects: [], tasks: [], milestones: [], currentTeamId: null, currentProjectId: null, userProfile: null, userTasks: [] });
}
interface AccountState {
  user: AccountUser | null;
  status: 'idle' | 'loading' | 'ready' | 'guest' | 'error';
  error: string;
  load: (force?: boolean) => Promise<void>;
  switchMode: (mode: AccountMode) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  user: null, status: 'idle', error: '',
  load: async (force = false) => {
    if (pending) return pending;
    if (!force && ['ready', 'guest'].includes(get().status)) return;
    set({ status: 'loading', error: '' });
    pending = (async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        if (res.status === 401 || res.status === 404) { clearCollaboration(); set({ user: null, status: 'guest' }); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '无法读取账号，请重试');
        if (get().user?.id !== data.id || data.mode !== 'enterprise') clearCollaboration();
        set({ user: data, status: 'ready' });
      } catch (err) { set({ status: 'error', error: err instanceof Error ? err.message : '无法读取账号' }); }
      finally { pending = null; }
    })();
    return pending;
  },
  switchMode: async (mode) => {
    const res = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '模式切换失败');
    clearCollaboration();
    set({ user: data.user });
  },
  logout: async () => {
    useBlockStore.getState().saveHistory('编辑');
    await useBlockStore.getState().flushActivity();
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) throw new Error('退出失败，请重试');
    clearCollaboration();
    set({ user: null, status: 'guest' });
    // Keep per-account offline documents; remove only the shared browser mirror.
    localStorage.removeItem('block-os-storage');
    localStorage.removeItem('blockos-collaboration-storage');
    window.location.assign('/login');
  },
  updateName: (name) => set(state => ({ user: state.user ? { ...state.user, name } : null })),
}));
