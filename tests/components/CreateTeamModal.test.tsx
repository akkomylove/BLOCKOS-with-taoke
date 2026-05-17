import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTeamModal } from '@/components/collaboration/CreateTeamModal';

const mockCreateTeam = vi.fn().mockResolvedValue('new-team-id');
const mockOnClose = vi.fn();

vi.mock('@/store/collaborationStore', () => ({
  useCollaborationStore: vi.fn((selector: Function) => {
    const state = {
      createTeam: mockCreateTeam,
    };
    return selector(state);
  }),
}));

vi.mock('lucide-react', () => ({
  X: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  )),
  Users: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="users-icon" className={className} />
  )),
  AlertCircle: vi.fn(({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  )),
}));

describe('CreateTeamModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTeam.mockClear();
    mockOnClose.mockClear();
  });

  it('renders modal when isOpen is true', () => {
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('创建新团队')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入团队名称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('描述一下这个团队')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(<CreateTeamModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('创建新团队')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByText('取消');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByTestId('x-icon').closest('button');
    if (closeButton) {
      await user.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates name input value when typing', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My New Team');

    expect(nameInput).toHaveValue('My New Team');
  });

  it('updates description input value when typing', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const descInput = screen.getByPlaceholderText('描述一下这个团队');
    await user.type(descInput, 'Team description text');

    expect(descInput).toHaveValue('Team description text');
  });

  it('updates avatar input value when typing', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const avatarInput = screen.getByPlaceholderText('输入图片URL');
    await user.type(avatarInput, 'https://example.com/avatar.png');

    expect(avatarInput).toHaveValue('https://example.com/avatar.png');
  });

  it('disables submit button when name is empty', () => {
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const submitButton = screen.getByText('创建团队');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is filled', () => {
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    fireEvent.change(nameInput, { target: { value: 'Test Team' } });

    const submitButton = screen.getByText('创建团队');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls createTeam with correct arguments on submit', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My Team');

    const descInput = screen.getByPlaceholderText('描述一下这个团队');
    await user.type(descInput, 'My Description');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith('My Team', 'My Description', undefined);
    });
  });

  it('calls onClose after successful submission', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My Team');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    const descInput = screen.getByPlaceholderText('描述一下这个团队');

    await user.type(nameInput, 'My Team');
    await user.type(descInput, 'My Description');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(descInput).toHaveValue('');
    });
  });

  it('displays error message when createTeam fails', async () => {
    const user = userEvent.setup();
    mockCreateTeam.mockRejectedValueOnce(new Error('创建失败'));

    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My Team');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('创建失败')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockCreateTeam.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('new-team-id'), 100)));

    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My Team');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    expect(screen.getByText('创建中...')).toBeInTheDocument();
  });

  it('disables submit button during loading', async () => {
    const user = userEvent.setup();
    mockCreateTeam.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('new-team-id'), 100)));

    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const nameInput = screen.getByPlaceholderText('输入团队名称');
    await user.type(nameInput, 'My Team');

    const submitButton = screen.getByText('创建团队');
    await user.click(submitButton);

    await waitFor(() => {
      const loadingButton = screen.getByText('创建中...');
      expect(loadingButton.closest('button')).toBeDisabled();
    });
  });

  it('calls onClose when clicking overlay', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      await user.click(overlay);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('prevents closing when clicking modal content', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const modalContent = screen.getByRole('form');
    await user.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays avatar preview with initial when no avatar URL', () => {
    render(<CreateTeamModal isOpen={true} onClose={mockOnClose} />);

    const preview = document.querySelector('.rounded-lg');
    expect(preview).toBeInTheDocument();
  });
});
