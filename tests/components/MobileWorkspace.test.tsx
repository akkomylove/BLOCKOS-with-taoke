import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileWorkspace from '@/components/mobile/MobileWorkspace';
import { useBlockStore } from '@/store/blockStore';
import type { Page } from '@/types/page';
import type { Block } from '@/types/block';

const userId = 'mobile-ui-user';
let remotePages: Page[];
let remoteBlocks: Record<string, Block[]>;
let failSave: boolean;
let savedRequests: Array<{ blocks: Block[]; version: number }>;

describe('Mobile reading, light editing and quick capture', () => {
  beforeEach(() => {
    localStorage.clear();
    useBlockStore.setState({ pages: [], blocks: [], pageBlocks: {}, currentPageId: '', currentUserId: null, folders: [], groups: [] });
    remotePages = [{ id: 'doc-one', title: '退款文档', version: 7, createdAt: 1, updatedAt: 1, chapters: [{ id: 'refund', title: '退款规则', blockIds: ['text-one', 'todo-one'] }] }];
    remoteBlocks = { 'doc-one': [
      { id: 'text-one', type: 'text', title: '退款说明', content: '原始退款说明', meta: {}, parentId: null, order: 0, x: 700, y: 400, width: 550, height: 330, collapsed: false, createdAt: 1, updatedAt: 1 },
      { id: 'todo-one', type: 'todo', title: '验收', content: '核对退款结果', meta: { checked: false }, parentId: null, order: 1, x: 20, y: 30, width: 200, collapsed: false, createdAt: 2, updatedAt: 2 },
    ] };
    failSave = false; savedRequests = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string, options?: RequestInit) => {
      if (input === '/api/auth/user') return Response.json({ id: userId, name: 'Reader' });
      if (input === '/api/pages' && options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        const page = { ...body, version: 1, createdAt: 3, updatedAt: 3 };
        remotePages.push(page); remoteBlocks[page.id] = [];
        return Response.json({ id: page.id, version: 1 });
      }
      if (input === '/api/pages') return Response.json({ pages: remotePages, folders: [] });
      const id = input.split('/')[3];
      if (options?.method === 'PUT') {
        const body = JSON.parse(String(options.body));
        if (body.chapters) {
          const page = remotePages.find((item) => item.id === id)!;
          page.chapters = body.chapters;
          page.version = (page.version || 1) + 1;
          return Response.json({ success: true, version: page.version });
        }
        savedRequests.push(body);
        if (failSave) return Response.json({ error: 'Conflict' }, { status: 409 });
        remoteBlocks[id] = body.blocks;
        const page = remotePages.find((item) => item.id === id)!;
        page.version = (page.version || 1) + 1;
        return Response.json({ success: true, pageVersion: page.version });
      }
      return Response.json({ page: remotePages.find((page) => page.id === id), blocks: remoteBlocks[id] });
    }));
  });

  async function readDocument() {
    render(<MobileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /退款文档/ }));
    fireEvent.click(await screen.findByRole('button', { name: /退款规则/ }));
    expect(await screen.findByText('原始退款说明')).toBeInTheDocument();
    expect(screen.getByText('核对退款结果')).toBeInTheDocument();
  }

  async function editText() {
    await readDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /退款说明/ }));
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: '手机上更新的退款说明' } });
    fireEvent.click(screen.getByRole('button', { name: '保存', exact: true }));
  }

  it('reads multiple blocks in one chapter and updates text without moving desktop blocks', async () => {
    await editText();
    await waitFor(() => expect(screen.getByText('已保存至云端')).toBeInTheDocument());
    expect(savedRequests[0].version).toBe(7);
    expect(savedRequests[0].blocks[0]).toMatchObject({ content: '手机上更新的退款说明', x: 700, y: 400, width: 550, height: 330 });
    expect(savedRequests[0].blocks[1]).toEqual(remoteBlocks['doc-one'][1]);
    expect(screen.getByRole('button', { name: '打开章节目录' })).toBeInTheDocument();
  });

  it('keeps the editing draft and original base version on a cloud conflict', async () => {
    failSave = true;
    await editText();
    expect(await screen.findByRole('alert')).toHaveTextContent('云端文档已有更新');
    expect(screen.getByLabelText('正文')).toHaveValue('手机上更新的退款说明');
    const pending = JSON.parse(localStorage.getItem(`blockos-mobile-pending:${userId}:doc-one`)!);
    expect(pending.version).toBe(7);
    expect(pending.blocks[0].content).toBe('手机上更新的退款说明');
  });

  it('creates a cloud inbox document and stores a quick note as a real block', async () => {
    render(<MobileWorkspace />);
    await screen.findByRole('button', { name: /退款文档/ });
    fireEvent.click(screen.getByRole('button', { name: '随手记', exact: true }));
    fireEvent.change(screen.getByLabelText('随手记录内容'), { target: { value: '补充退款异常提示' } });
    fireEvent.click(screen.getByRole('button', { name: '存入收件箱' }));
    expect(await screen.findByRole('heading', { name: '收件箱', exact: true })).toBeInTheDocument();
    const inbox = remotePages.find((page) => page.kind === 'inbox')!;
    expect(inbox.title).toBe('随手记收件箱');
    expect(remoteBlocks[inbox.id][0]).toMatchObject({ type: 'text', content: '补充退款异常提示' });
    expect(localStorage.getItem(`blockos-mobile-capture:${userId}`)).toBeNull();
  });

  it('appends text to an existing chapter while preserving all original block positions', async () => {
    await readDocument();
    fireEvent.click(screen.getByRole('button', { name: '追加正文' }));
    const input = await screen.findByLabelText('正文');
    fireEvent.change(input, { target: { value: '补充退款异常说明' } });
    fireEvent.click(screen.getByRole('button', { name: '保存', exact: true }));
    await waitFor(() => expect(screen.getByRole('button', { name: '打开章节目录' })).toBeInTheDocument());
    expect(screen.getByText('补充退款异常说明')).toBeInTheDocument();
    expect(remotePages[0].chapters?.[0].blockIds).toHaveLength(3);
    expect(remoteBlocks['doc-one'][0]).toMatchObject({ x: 700, y: 400, width: 550, height: 330 });
    expect(remoteBlocks['doc-one'][2].content).toBe('补充退款异常说明');
  });
});
