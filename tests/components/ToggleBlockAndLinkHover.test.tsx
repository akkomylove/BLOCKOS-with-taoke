import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ToggleBlock from '@/components/blocks/ToggleBlock';
import { useBlockStore, createEmptyBlock } from '@/store/blockStore';

describe('ToggleBlock & Link Hover Disconnect Functionality', () => {
  it('creates empty toggle block with expanded=true and default title', () => {
    const block = createEmptyBlock('toggle');
    expect(block.type).toBe('toggle');
    expect(block.title).toBe('折叠列表');
    expect(block.meta.expanded).toBe(true);
  });

  it('renders ToggleBlock without mock placeholder text and provides editable details textarea', () => {
    const mockBlock = {
      id: 'toggle-1',
      title: '折叠标题',
      content: '测试折叠内容',
      meta: {
        expanded: true,
        details: '这是折叠内部的详细说明文档',
      },
    };

    const { container } = render(
      <ToggleBlock block={mockBlock as any} childCount={0} />
    );

    // 严禁存在纸面硬编码占位符
    expect(container.textContent).not.toContain('后续支持嵌套 Block');

    // 包含折叠标题输入框与折叠正文文本域
    const input = screen.getByPlaceholderText('折叠标题...') as HTMLInputElement;
    expect(input.value).toBe('测试折叠内容');

    const textarea = screen.getByPlaceholderText(/输入折叠内容详情/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('这是折叠内部的详细说明文档');
  });

  it('renders nested childrenSlot directly inside ToggleBlock fold when expanded', () => {
    const mockBlock = {
      id: 'toggle-2',
      title: '项目研发规划',
      content: 'Q4 任务清单',
      meta: {
        expanded: true,
      },
    };

    const childrenSlot = (
      <div data-testid="nested-child-block">
        <span>子 Block 1: 完成拓扑连线 Hover 优化</span>
      </div>
    );

    render(
      <ToggleBlock
        block={mockBlock as any}
        childrenSlot={childrenSlot}
        childCount={1}
      />
    );

    expect(screen.getByTestId('nested-child-block')).toBeDefined();
    expect(screen.getByText(/嵌套子 Block \(1\)/)).toBeDefined();
  });

  it('hides details and childrenSlot when collapsed, and displays childCount pill', () => {
    const mockBlock = {
      id: 'toggle-3',
      title: '折叠测试',
      content: '折叠标题',
      meta: {
        expanded: false,
        details: '折叠隐藏的私密内容',
      },
    };

    const childrenSlot = (
      <div data-testid="nested-child-block">
        <span>子 Block: 隐藏项</span>
      </div>
    );

    render(
      <ToggleBlock
        block={mockBlock as any}
        childrenSlot={childrenSlot}
        childCount={2}
      />
    );

    // 折叠状态下，正文与嵌套子 Block 应被收起
    expect(screen.queryByTestId('nested-child-block')).toBeNull();
    expect(screen.queryByPlaceholderText(/输入折叠内容详情/)).toBeNull();

    // 展示子项计数徽标
    expect(screen.getByText('2 个子 Block')).toBeDefined();
  });

  it('toggles expansion state when clicking the chevron button', () => {
    const updateBlockSpy = vi.fn();
    useBlockStore.setState({ updateBlock: updateBlockSpy } as any);

    const mockBlock = {
      id: 'toggle-4',
      title: '展开收起测试',
      content: '核心主旨',
      meta: {
        expanded: true,
      },
    };

    render(<ToggleBlock block={mockBlock as any} childCount={1} />);

    const toggleBtn = screen.getByTitle('点击折叠');
    fireEvent.click(toggleBtn);

    expect(updateBlockSpy).toHaveBeenCalledWith('toggle-4', {
      meta: expect.objectContaining({ expanded: false }),
    });
  });
});
