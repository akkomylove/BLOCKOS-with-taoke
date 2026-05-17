import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamCard } from '@/components/collaboration/TeamCard';
import type { Team } from '@/types/collaboration';

const mockFetchProjects = vi.fn().mockResolvedValue(undefined);
const mockDeleteTeam = vi.fn().mockResolvedValue(undefined);

vi.mock('@/store/collaborationStore', () => ({
  useCollaborationStore: vi.fn((selector: Function) => {
    const state = {
      fetchProjects: mockFetchProjects,
      deleteTeam: mockDeleteTeam,
    };
    return selector(state);
  }),
}));

vi.mock('lucide-react', () => ({
  Users: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="users-icon" className={className} />
  )),
  MoreVertical: vi.fn(({ className }: { className?: string }) => (
    <span data-testid="more-icon" className={className}>More</span>
  )),
  Trash2: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  )),
  Settings: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="settings-icon" className={className} />
  )),
}));

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockTeam: Team = {
  id: 'team-1',
  name: 'Test Team',
  description: 'A test team description',
  ownerId: 'user-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('TeamCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.push.mockClear();
    mockFetchProjects.mockClear();
    mockDeleteTeam.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders team information correctly', () => {
    render(<TeamCard team={mockTeam} currentTeamId={null} />);

    expect(screen.getByText('Test Team')).toBeInTheDocument();
    expect(screen.getByText('A test team description')).toBeInTheDocument();
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });

  it('displays team initial when no avatar', () => {
    render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const initial = mockTeam.name.charAt(0).toUpperCase();
    expect(screen.getByText(initial)).toBeInTheDocument();
  });

  it('displays avatar image when avatar URL is provided', () => {
    const teamWithAvatar: Team = {
      ...mockTeam,
      avatar: 'https://example.com/avatar.png',
    };

    render(<TeamCard team={teamWithAvatar} currentTeamId={null} />);

    const avatarImg = screen.getByAltText('Test Team');
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('navigates to team detail page when card is clicked', async () => {
    const user = userEvent.setup();
    render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const card = screen.getByText('Test Team').closest('div');
    if (card) {
      await user.click(card);
    }

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalledWith(mockTeam.id);
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(`/teams/${mockTeam.id}`);
    });
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { container } = render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const moreButton = container.querySelector('button');
    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('删除');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('确定要删除这个团队吗？');

    vi.spyOn(window, 'confirm').mockRestore();
  });

  it('calls deleteTeam when confirmation is accepted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const moreButton = container.querySelector('button');
    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('删除');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith(mockTeam.id);
    });

    vi.spyOn(window, 'confirm').mockRestore();
  });

  it('opens menu when more button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const moreButton = container.querySelector('button');
    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });
  });

  it('closes menu when clicking outside', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeamCard team={mockTeam} currentTeamId={null} />);

    const moreButton = container.querySelector('button');
    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.mouseDown(document);
    });

    await waitFor(() => {
      expect(screen.queryByText('设置')).not.toBeInTheDocument();
    });
  });
});
