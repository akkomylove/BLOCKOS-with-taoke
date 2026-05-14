# 右键菜单 + AI弹窗 修复计划

## 问题诊断

### 问题1：右键添加Block功能失效

**根因**：`contextMenu` div 渲染在 `canvasRef` 内部，而 `canvasRef` 有 `overflow: hidden`。虽然 `position: fixed` 理论上应脱离 overflow 限制，但在嵌套渲染重构后，`canvasRef` 内部结构变化可能导致事件传播或渲染异常。

**修复**：将右键菜单通过 `ReactDOM.createPortal` 渲染到 `document.body`，彻底脱离画布DOM层级。同时确保 `handleContextMenu` 逻辑不变。

### 问题2：AI弹窗被Block遮挡

**根因**：`AIActionMenu` 组件渲染在 [SortableBlock.tsx](file:///c:/Users/86135/Desktop/blockOS/src/components/SortableBlock.tsx#L100-L106) 内部。SortableBlock 使用了 `@dnd-kit/sortable`，其 `style.transform` 会创建新的层叠上下文（stacking context）。因此 AIActionMenu 的 `z-50` 只在 SortableBlock 的层叠上下文内生效，被其他 Block 覆盖。

**修复**：将 `AIActionMenu` 的渲染移到 `BlockEditor` 顶层，通过状态提升管理当前激活的AI菜单（blockId + 位置），统一用一个 `fixed z-[100]` 的 Portal 渲染到 `document.body`。

### 问题3：非文本Block的AI弹窗无法弹出

**根因**：同问题2——层叠上下文导致菜单被遮挡。非文本Block（Todo、List、Code等）在DOM树中位置更深，遮挡更明显。文本Block恰好位于较浅层级所以偶尔可见。

**修复**：与问题2相同——Portal方案一揽子解决所有Block类型的AI弹窗问题。

---

## 修复方案

### 修改文件：`src/components/BlockEditor.tsx`

#### 1. 右键菜单用 Portal 渲染

```typescript
import { createPortal } from 'react-dom';

// 在 return 中，将 contextMenu 的渲染改为：
{contextMenu && createPortal(
  <div className="fixed z-[100] ...">...</div>,
  document.body
)}
```

#### 2. AI菜单状态提升

```typescript
// 新增状态
const [aiMenu, setAiMenu] = useState<{
  blockId: string;
  blockType: BlockType;
  position: { top: number; left: number };
} | null>(null);
```

```typescript
// 在 BlockEditor return 末尾添加 Portal 渲染
{aiMenu && createPortal(
  <AIActionMenu
    isOpen={true}
    onClose={() => setAiMenu(null)}
    onSelect={(action) => {
      handleAIAction(aiMenu.blockId, action);
      setAiMenu(null);
    }}
    blockType={aiMenu.blockType}
    position={aiMenu.position}
  />,
  document.body
)}
```

#### 3. SortableBlock 接收 onOpenAIMenu 回调

SortableBlock 不再内部渲染 AIActionMenu，改为通过 props 回调通知父组件：

```typescript
// SortableBlock 新增 prop
onOpenAIMenu?: (blockId: string, blockType: BlockType, position: { top: number; left: number }) => void;
```

`handleAIButtonClick` 改为调用 `onOpenAIMenu(block.id, block.type, { top: rect.bottom + 4, left: ... })`

#### 4. renderBlockTree 传递 onOpenAIMenu

在 `renderBlockTree` 中的 `<SortableBlock>` 添加 `onOpenAIMenu={...}` prop。

---

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/BlockEditor.tsx` | 1. 引入 createPortal 2. 添加 aiMenu 状态 3. 右键菜单改用 Portal 4. AIActionMenu 用 Portal 渲染 5. renderBlockTree 传递 onOpenAIMenu |
| `src/components/SortableBlock.tsx` | 1. 新增 onOpenAIMenu prop 2. 移除内部 AIActionMenu 渲染 3. handleAIButtonClick 改为调用回调 |

## 验证步骤

1. `npm run build` 无错误
2. 在画布空白处右键 → 菜单正常弹出 → 点击添加Block成功
3. 在Block上右键 → 菜单正常弹出 → 「设为子Block」可用
4. 任意Block点击Sparkles → AI菜单在最高层弹出 → 不被其他Block遮挡
5. 文本、待办、列表、代码、表格Block的AI菜单均正常弹出