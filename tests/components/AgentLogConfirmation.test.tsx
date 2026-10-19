import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AgentLogPanel from '@/components/AgentLogPanel';
import { useBlockStore } from '@/store/blockStore';

const logs = [{ id: 'log-1', timestamp: 1, result: '已创建测试卡片', ruleId: 'CanvasAgent', blockId: 'block-1' }];
beforeEach(() => {
  useBlockStore.setState({ currentUserId: null, agentLogs: logs, activityStatus: 'saved' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true })));
});
afterEach(() => vi.unstubAllGlobals());
const openConfirmation = () => {
  fireEvent.click(screen.getByRole('button', { name: '清空日志', exact: true }));
  return screen.getByRole('alertdialog', { name: '确认清空日志？' });
};

describe('D-33 clearing account logs requires explicit confirmation', () => {
  it('explains the irreversible account-wide effect, defaults to cancel, and cancels without a request', () => {
    render(<AgentLogPanel isOpen onClose={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: '清空日志', exact: true });
    trigger.focus();
    const dialog = openConfirmation();
    expect(dialog).toHaveAccessibleDescription(/当前账号.*1 条.*其他设备.*无法撤销.*历史版本会保留/);
    expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
    expect(useBlockStore.getState().agentLogs).toEqual(logs);
  });

  it('Escape cancels and keeps the panel and logs', () => {
    const close = vi.fn();
    render(<AgentLogPanel isOpen onClose={close} />);
    openConfirmation();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText('已创建测试卡片')).toBeInTheDocument();
  });

  it('keeps keyboard focus inside the confirmation', () => {
    render(<AgentLogPanel isOpen onClose={vi.fn()} />);
    const dialog = openConfirmation();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(within(dialog).getByRole('button', { name: '确认清空' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus();
  });

  it('sends one DELETE only after confirmation, prevents repeated submission, and reports success after completion', async () => {
    let complete!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    render(<AgentLogPanel isOpen onClose={vi.fn()} />);
    const dialog = openConfirmation();
    const confirm = within(dialog).getByRole('button', { name: '确认清空' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith('/api/workspace/activity', expect.objectContaining({ method: 'DELETE' }));
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '正在清空…' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog).toBeInTheDocument();
    expect(useBlockStore.getState().agentLogs).toEqual(logs);
    await act(async () => { complete(Response.json({ success: true })); });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(useBlockStore.getState().agentLogs).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('已清空日志');
    expect(screen.getByRole('button', { name: '清空日志', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: '关闭执行日志' })).toHaveFocus();
  });

  it('keeps records and the confirmation on server failure and allows retry', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: '保存服务不可用' }, { status: 503 }));
    render(<AgentLogPanel isOpen onClose={vi.fn()} />);
    const dialog = openConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: '确认清空' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('保存服务不可用'));
    expect(useBlockStore.getState().agentLogs).toEqual(logs);
    expect(screen.queryByText('已清空日志')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '确认清空' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(useBlockStore.getState().agentLogs).toEqual([]);
  });

  it('closing the panel dismisses an unconfirmed action', () => {
    const { rerender } = render(<AgentLogPanel isOpen onClose={vi.fn()} />);
    openConfirmation();
    rerender(<AgentLogPanel isOpen={false} onClose={vi.fn()} />);
    rerender(<AgentLogPanel isOpen onClose={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
