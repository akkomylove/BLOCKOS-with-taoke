# PDF导出 + 富文本编辑 + 右键修复 计划

## 问题诊断

### 问题1：右键添加Block失效

**根因**：`handleContextMenu` 在 `canvasRef` 上绑定，但 `canvasRef` 内部有大量绝对定位的子元素（block卡片、SVG连接线等）。右键事件可能落在这些子元素上而非 `canvasRef` 本身，导致 `handleContextMenu` 未被触发。

**修复**：将 `onContextMenu` 从 `canvasRef` div 移到 `document` 级别的事件监听，在回调中判断点击位置。

### 问题2：子Block折叠后缺少展开按钮

**根因**：折叠按钮只在 `children.length > 0` 时显示，但折叠后子Block被过滤出 `visibleBlocks`，`children` 计算基于 `visibleBlocks` 而非所有blocks。折叠后子Block不在visibleBlocks中，导致 `children.length` 为0，展开按钮消失。

**修复**：`children` 计算改为基于所有blocks而非visibleBlocks。

---

## 修改一：右键修复 + 子Block展开按钮修复

### 文件：`src/components/BlockEditor.tsx`

#### 右键修复

将 `onContextMenu` 从 `canvasRef` div 移到 `useEffect` 中的 `document` 级事件监听：

```typescript
useEffect(() => {
  const handleDocContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnBlock = !!target.closest('[data-block-id]');
    const isOnUI = !!target.closest('[data-ui-control]');
    if (!isOnUI) {
      e.preventDefault();
      const blockEl = target.closest('[data-block-id]');
      setContextTargetId(blockEl?.getAttribute('data-block-id') || null);
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };
  document.addEventListener('contextmenu', handleDocContextMenu);
  return () => document.removeEventListener('contextmenu', handleDocContextMenu);
}, []);
```

移除 `canvasRef` div 上的 `onContextMenu={handleContextMenu}`。

#### 子Block展开按钮修复

在 `renderBlockTree` 中，`children` 计算改为基于 `sortedBlocks` 而非 `visibleBlocks`：

```typescript
const children = sortedBlocks.filter((b) => b.parentId === block.id);
```

这样折叠后子Block虽然不在visibleBlocks中，但children计算仍能正确返回数量，展开按钮持续显示。

---

## 修改二：PDF导出

### 文件：`src/app/api/export/pdf/route.ts`（新建）

使用 Playwright 服务端生成PDF：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(req: NextRequest) {
  const { html, title } = await req.json();
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <html>
      <head>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #333; }
          h1, h2, h3 { color: #1a1a1a; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  });
  
  await browser.close();
  
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title || 'export'}.pdf"`,
    },
  });
}
```

### 文件：`src/store/blockStore.ts`

新增 `exportToHtml` 方法，将blocks转为HTML：

```typescript
exportToHtml: () => {
  const state = get();
  const sorted = [...state.blocks].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  
  const renderBlock = (block: Block, depth: number = 0): string => {
    const children = sorted.filter((b) => b.parentId === block.id);
    let html = '';
    
    switch (block.type) {
      case 'text':
        html = `<p style="margin-left:${depth * 20}px">${block.content}</p>`;
        break;
      case 'todo':
        html = `<p style="margin-left:${depth * 20}px">☐ ${block.content}</p>`;
        break;
      case 'list':
        html = `<li style="margin-left:${depth * 20}px">${block.content}</li>`;
        break;
      case 'code':
        html = `<pre style="margin-left:${depth * 20}px"><code>${block.content}</code></pre>`;
        break;
      case 'table':
        // 解析JSON表格数据渲染HTML table
        break;
      case 'image':
        html = `<img src="${block.content}" style="max-width:100%;margin-left:${depth * 20}px" />`;
        break;
      case 'quote':
        html = `<blockquote style="margin-left:${depth * 20}px;border-left:3px solid #ccc;padding-left:12px;color:#666">${block.content}</blockquote>`;
        break;
      case 'divider':
        html = '<hr />';
        break;
    }
    
    if (children.length > 0) {
      html += `<div style="margin-left:20px">${children.map((c) => renderBlock(c, depth + 1)).join('')}</div>`;
    }
    
    return html;
  };
  
  const roots = sorted.filter((b) => !b.parentId);
  return roots.map((b) => renderBlock(b)).join('\n');
},
```

### 文件：`src/components/Toolbar.tsx`

修改 `handleExport`，添加PDF选项：

```typescript
const handleExport = async () => {
  const html = useBlockStore.getState().exportToHtml();
  const title = currentPage?.title || 'export';
  
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, title }),
  });
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

---

## 修改三：文本Block富文本编辑

### 文件：`src/types/block.ts`

Block 的 `meta` 字段已支持任意JSON，无需修改类型。

### 文件：`src/components/blocks/TextBlock.tsx`

重写为富文本编辑器，支持：

1. **工具栏**：在文本Block内容上方显示浮动格式工具栏（加粗/斜体/下划线/颜色/对齐/列表）
2. **document.execCommand**：使用浏览器原生API实现格式
3. **保存**：通过 `onInput` 将HTML内容保存到 `block.content`

```typescript
const toolbarActions = [
  { cmd: 'bold', icon: 'B', title: '加粗' },
  { cmd: 'italic', icon: 'I', title: '斜体' },
  { cmd: 'underline', icon: 'U', title: '下划线' },
  { cmd: 'strikeThrough', icon: 'S', title: '删除线' },
  { cmd: 'foreColor', icon: 'A', title: '颜色', value: '#3b82f6' },
  { cmd: 'justifyLeft', icon: '←', title: '左对齐' },
  { cmd: 'justifyCenter', icon: '↔', title: '居中' },
  { cmd: 'justifyRight', icon: '→', title: '右对齐' },
  { cmd: 'insertUnorderedList', icon: '•', title: '无序列表' },
  { cmd: 'insertOrderedList', icon: '1.', title: '有序列表' },
];

// 工具栏渲染
<div className="flex items-center gap-0.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
  {toolbarActions.map((action) => (
    <button
      key={action.cmd}
      onClick={() => document.execCommand(action.cmd, false, action.value)}
      className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded"
      title={action.title}
    >
      {action.icon}
    </button>
  ))}
</div>

// 内容区改为 contentEditable div
<div
  ref={ref}
  contentEditable
  suppressContentEditableWarning
  className="block-content outline-none text-sm text-zinc-200 leading-relaxed min-h-[1.5em]"
  dangerouslySetInnerHTML={{ __html: block.content }}
  onInput={handleInput}
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
/>
```

---

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/BlockEditor.tsx` | 1. 右键事件移到document级别 2. children计算改为sortedBlocks |
| `src/app/api/export/pdf/route.ts` | 新建：Playwright服务端PDF生成API |
| `src/store/blockStore.ts` | 新增 `exportToHtml` 方法 |
| `src/components/Toolbar.tsx` | 修改 `handleExport` 为PDF导出 |
| `src/components/blocks/TextBlock.tsx` | 重写为富文本编辑器，支持格式工具栏 |
| `package.json` | 新增 `playwright` 依赖 |

## 验证步骤

1. `npm install playwright` + `npm run build` 无错误
2. 右键空白处 → 菜单弹出 → 添加Block成功
3. 右键Block → 菜单弹出 → 「设为子Block」可用
4. 折叠有子Block的父Block → 展开按钮仍在 → 点击展开正常
5. 文本Block hover显示格式工具栏 → 加粗/斜体/下划线/颜色/对齐/列表均可用
6. 工具栏「导出」→ 下载PDF → PDF内容正确包含所有Block
7. 子Block在PDF中正确缩进显示