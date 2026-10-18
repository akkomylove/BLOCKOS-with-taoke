import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Toolbar from '@/components/Toolbar';
import AccountGate from '@/components/AccountGate';
import { useAccountStore } from '@/store/accountStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import type { AccountUser } from '@/types/account';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
const user: AccountUser = { id: 'ui-user', name: '个人用户', email: 'local@example.test', avatar: '', provider: 'credentials', mode: 'personal', role: 'member', isAdmin: false, hasPassword: true };
const props = {
  onToggleLogs: vi.fn(), showLogs: false, onToggleAIAssistant: vi.fn(), onToggleRelationDrawer: vi.fn(), onToggleHelp: vi.fn(), onToggleSearch: vi.fn(), onToggleImport: vi.fn(), onToggleExport: vi.fn(),
  onToggleGroupPanel: vi.fn(), showGroupPanel: false, onToggleHistory: vi.fn(), onOpenProfile: vi.fn(), onToggleCopilot: vi.fn(), onToggleAnalyze: vi.fn(), onToggleChat: vi.fn(), onToggleReviewEnrich: vi.fn(), onToggleFoldPlan: vi.fn(), onToggleDocRelations: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  useAccountStore.setState({ user: { ...user }, status: 'ready', error: '' });
  useCollaborationStore.setState({ teams: [], projects: [], tasks: [], userTasks: [] });
});

describe('Personal and enterprise workspace navigation', () => {
  it('keeps personal AI/editor tools and removes collaboration from both toolbar and overflow', () => {
    render(<Toolbar {...props} />);
    expect(screen.getByTitle('AI 助手')).toBeInTheDocument();
    expect(screen.getByTitle('导出')).toBeInTheDocument();
    expect(screen.queryByTitle('协作看板')).not.toBeInTheDocument();
    expect(screen.queryByTitle('工作流分析')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('更多工具与功能'));
    expect(screen.queryByText('敏捷看板')).not.toBeInTheDocument();
    expect(screen.queryByText('工作流分析')).not.toBeInTheDocument();
    expect(screen.getByText('个人工具')).toBeInTheDocument();
  });

  it('shows enterprise tools and opens the common account center', () => {
    useAccountStore.setState({ user: { ...user, mode: 'enterprise' } });
    render(<Toolbar {...props} />);
    expect(screen.getByTitle('协作看板')).toBeInTheDocument();
    expect(screen.getByTitle('工作流分析')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '企业模式' }));
    expect(props.onOpenProfile).toHaveBeenCalledOnce();
  });

  it('does not mount enterprise pages or load their data in personal mode', () => {
    const mount = vi.fn();
    function EnterprisePage() { mount(); return <div>protected team data</div>; }
    render(<AccountGate enterprise><EnterprisePage /></AccountGate>);
    expect(screen.getByText('团队协作属于企业模式')).toBeInTheDocument();
    expect(mount).not.toHaveBeenCalled();
  });

  it('switches modes only after server success and clears cached collaboration context', async () => {
    useCollaborationStore.setState({ currentTeamId: 'previous-team', currentProjectId: 'previous-project' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ user: { ...user, mode: 'enterprise' } })));
    await useAccountStore.getState().switchMode('enterprise');
    expect(useAccountStore.getState().user?.mode).toBe('enterprise');
    expect(useCollaborationStore.getState().currentTeamId).toBeNull();
    expect(useCollaborationStore.getState().currentProjectId).toBeNull();
  });

  it('preserves the current mode when switching fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'offline' }, { status: 503 })));
    await expect(useAccountStore.getState().switchMode('enterprise')).rejects.toThrow('offline');
    expect(useAccountStore.getState().user?.mode).toBe('personal');
  });
});
