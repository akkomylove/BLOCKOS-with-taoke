# 框选修复 + 子Block嵌套修复计划

## 问题诊断

### 问题1：框选功能失效

**根因**：`handleCanvasMouseDown` 第149行的条件判断：
```typescript
(e.target as HTMLElement) === canvasRef.current
```
画布内部有多个绝对定位的子元素（zoom控件、工具栏、提示文字、已渲染的block等）。当用户点击"看起来是空白"的区域时，实际点击可能落在了某个子元素上（如底层div、提示文字），导致 `e.target` 不等于 `canvasRef.current`，框选无法触发。

**修复**：改用判断点击是否落在block或UI控件上，若不是则触发框选。

### 问题2：子Block遮挡父Block

**根因**：子Block和父Block都在同一层级用绝对定位渲染，子Block的位置通过 `handleSetAsChild` 设为 `targetBlock.x + 24, targetBlock.y + 40`，直接叠在父Block上造成遮挡。

**修复**：子Block应渲染在父Block卡片内部，而非独立绝对定位。父Block展开时子Block在其下方依次排列，折叠时隐藏。

---

## 修复方案

### 修改文件：`src/components/BlockEditor.tsx`

#### 1. 框选修复

修改 `handleCanvasMouseDown` 的条件判断：

```typescript
// 旧：仅 canvasRef.current 本身触发框选
(e.target as HTMLElement) === canvasRef.current

// 新：点击未落在任何block上时触发框选
const isOnBlock = !!(e.target as HTMLElement).closest('[data-block-id]');
const isOnUI = !!(e.target as HTMLElement).closest('[data-ui-control]');
if (!isOnBlock && !isOnUI) {
  // 触发框选
}
```

为UI控件添加 `data-ui-control` 属性（zoom控件、工具栏、提示文字、浮动选择栏等）。

#### 2. 子Block嵌套渲染

重构block渲染逻辑，从"平铺所有block"改为"分组递归渲染"：

```typescript
// 伪代码
function renderBlock(block) {
  const children = visibleBlocks.filter(b => b.parentId === block.id);
  return (
    <div data-block-id={block.id} style={{ position: 'absolute', left: block.x, top: block.y, width: block.width }}>
      {/* 父block自身卡片 */}
      <BlockCard block={block}>
        {/* 父block内容 */}
      </BlockCard>
      
      {/* 子block渲染在父block内部下方 */}
      {!block.collapsed && children.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 4 }}>
          {children.map(child => renderBlock(child))}
        </div>
      )}
    </div>
  );
}

// 只渲染根级block
{visibleBlocks.filter(b => !b.parentId).map(renderBlock)}
```

子Block的x/y不再使用绝对坐标，而是通过父Block内部的margin/padding自然排列。

#### 3. `handleSetAsChild` 调整

移除对子Block位置的强制设置（`moveBlockTo(id, targetBlock.x + 24, targetBlock.y + 40)`），不再需要。子Block位置由父Block内部自动排列。

---

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/BlockEditor.tsx` | 1. 修复框选触发条件 2. 重构block为嵌套渲染 3. 调整handleSetAsChild 4. UI控件添加data-ui-control |

## 验证步骤

1. `npm run build` 无错误
2. 在画布空白处左键拖拽 → 框选矩形出现 → 松手后选中矩形内Block
3. 将Block A设为Block B的子Block → A渲染在B内部下方 → 不再遮挡B
4. 折叠父Block → 子Block隐藏
5. 展开父Block → 子Block重新显示
6. 框选不与block拖拽冲突