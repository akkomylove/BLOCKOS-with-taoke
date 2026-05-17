import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamList } from '@/components/collaboration/TeamList';
import type { Team } from '@/types/collaboration';

const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Team Alpha',
    description: 'First team description',
    ownerId: 'user-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'team-2',
    name: 'Team Beta',
    description: 'Second team description',
    ownerId: 'user-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const mockFetchTeams = vi.fn().mockResolvedValue(undefined);

vi.mock('lucide-react', () => ({
  Plus: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="plus-icon" className={className} />
  )),
  Users: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="users-icon" className={className} />
  )),
}));

const mockUseCollaborationStore = vi.fn();

vi.mock('@/store/collaborationStore', () => ({
  useCollaborationStore: (...args: unknown[]) => mockUseCollaborationStore(...args),
}));

vi.mock('@/components/collaboration/TeamCard', () => ({
  TeamCard: vi.fn(({ team }: { team: Team }) => (
    <div data-testid="team-card">{team.name}</div>
  )),
}));

vi.mock('@/components/collaboration/CreateTeamModal', () => ({
  CreateTeamModal: vi.fn(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="create-team-modal">
        <button onClick={onClose} data-testid="modal-close-btn">关闭</button>
      </div>
    );
  }),
}));

const setupStore = (overrides: Partial<{
  teams: Team[];
  currentTeamId: string | null;
  loading: boolean;
}> = {}) => {
  const state = {
    teams: [] as Team[],
    currentTeamId: null as string | null,
    loading: false,
    fetchTeams: mockFetchTeams,
    ...overrides,
  };
  mockUseCollaborationStore.mockImplementation((selector: (state: typeof state) => unknown) => selector(state));
};

describe('TeamList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCollaborationStore.mockClear();
  });

  it('renders loading state with skeleton', () => {
    setupStore({ loading: true });

    render(<TeamList />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no teams', () => {
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    expect(screen.getByText('还没有团队')).toBeInTheDocument();
    expect(screen.getByText('创建一个团队开始协作吧')).toBeInTheDocument();
  });

  it('renders create team button in empty state', async () => {
    const user = userEvent.setup();
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    const createButton = screen.getByText('创建团队');
    expect(createButton).toBeInTheDocument();

    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
    });
  });

  it('renders header with team title', () => {
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    expect(screen.getByText('团队')).toBeInTheDocument();
    expect(screen.getAllByTestId('users-icon').length).toBeGreaterThan(0);
  });

  it('renders create team button in header', () => {
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    expect(screen.getByText('新建团队')).toBeInTheDocument();
  });

  it('renders team list when teams exist', async () => {
    setupStore({ teams: mockTeams, loading: false });

    render(<TeamList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
  });

  it('opens modal when create button is clicked', async () => {
    const user = userEvent.setup();
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    const createButton = screen.getByText('新建团队');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
    });
  });

  it('calls fetchTeams on mount', () => {
    setupStore({ teams: [], loading: false });

    render(<TeamList />);

    expect(mockFetchTeams).toHaveBeenCalled();
  });
});
