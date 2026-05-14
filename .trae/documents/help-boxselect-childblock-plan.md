# BlockOS 帮助中心 + 框选 + 子Block 优化计划

## 一、帮助中心内容全面更新

**文件**：`src/components/HelpPanel.tsx`

当前帮助中心5个tab的内容严重过时，引用已被移除的功能（快捷键、`/`命令菜单等）。需要根据当前实际功能全面重写。

### GuideContent（快速入门）
重写为白板模式的真实操作流程：
1. 创建页面 → 左侧边栏"新建页面"
2. 添加 Block → 顶部工具栏按钮或右键画布空白处
3. 自由布局 → 拖拽 Block 标题栏可移动位置，右侧边缘可调整宽度
4. 框选操作 → 左键在空白处拖拽可框选多个 Block
5. 子 Block → 拖拽 Block 到另一个 Block 上或右键菜单设为子 Block
6. 链接 Block → 选中 Block 后点击底部"创建链接"，再点击目标 Block
7. 命令面板 → 工具栏"命令"按钮

### ShortcutsContent（快捷键）
移除不存在的快捷键，只保留真实可用的：
- 画布操作：Alt+拖拽（平移）、滚轮（缩放）、右键（添加Block）
- 选择操作：Shift+点击（多选）、Ctrl+点击（多选）、Esc（取消选择）
- 框选：左键拖拽空白处

### BlocksContent（Block 类型）
更新为与当前顶部工具栏一致的描述，说明添加方式为"顶部工具栏按钮或右键菜单"而非 `/` 命令。

### AIContent（AI 功能）
保持不变，内容仍然准确。

### FAQContent（常见问题）
保持不变。

### OnboardingTour（首次引导）
**文件**：`src/components/OnboardingTour.tsx`
同步更新引导步骤，移除 `/` 相关描述，改为白板模式操作说明。

---

## 二、框选功能

**文件**：`src/components/BlockEditor.tsx`

### 实现方案
在画布上左键拖拽空白区域时，绘制一个半透明矩形选框，松手后选中矩形内所有 Block。

### 状态
```typescript
const [selectionBox, setSelectionBox] = useState<{
  startX: number; startY: number;
  currentX: number; currentY: number;
} | null>(null);
```

### 逻辑修改
- **handleCanvasMouseDown**：当点击目标是 canvasRef.current（空白处）时，记录起始坐标，进入框选模式
- **handleCanvasMouseMove**：框选模式下更新选框坐标
- **handleCanvasMouseUp**：框选模式下计算矩形覆盖的 Block 并选中
- 新增 SelectionBox 渲染：一个固定定位的蓝色半透明矩形

### 选中的 Block 计算
```typescript
// 将屏幕坐标转为画布坐标
const rect = {
  left: Math.min(startCanvasX, endCanvasX),
  right: Math.max(startCanvasX, endCanvasX),
  top: Math.min(startCanvasY, endCanvasY),
  bottom: Math.max(startCanvasY, endCanvasY),
};
// 筛选在矩形内的 Block
const ids = blocks.filter(b => 
  b.x + b.width > rect.left && b.x < rect.right &&
  b.y + 80 > rect.top && b.y < rect.bottom
).map(b => b.id);
setSelection(ids);
```

---

## 三、子Block功能修复与增强

**文件**：`src/components/BlockEditor.tsx`、`src/components/SortableBlock.tsx`

### 3.1 修复拖拽嵌套
当前 `handleCanvasMouseUp` 中的拖拽嵌套逻辑存在：`elementFromPoint` 在拖拽过程中可能因为 block 跟随鼠标而无法正确检测到目标。改为在 mouseUp 时使用拖拽结束位置的坐标检测。

### 3.2 右键菜单添加"设为子Block"
在已有的右键上下文菜单（`contextMenu`）中，当有选中的 Block 且右键点击了另一个 Block 时，显示"设为子Block"选项：
```typescript
// 右键点击在某个block上时，记录右键目标
const [contextTargetId, setContextTargetId] = useState<string | null>(null);
```

右键菜单内容变为：
```
添加 Block
  ├─ 文本
  ├─ 待办
  └─ ...
───────────── (仅当选中了block且右键点击了另一个block时显示)
Block 操作
  ├─ 设为子Block  → 将选中的block设为此block的子项
```

### 3.3 拖入目标区域
当有 Block 被拖拽时，每个可见 Block 下方显示一个"拖入此处成为子Block"的目标区域（drop zone）：
- 在 block 卡片底部增加一个 `h-6` 的 drop zone
- 只在有 block 被拖拽时显示
- hover 时高亮为绿色虚线边框
- 拖入后设置 parentId

### 3.4 父子关系视觉增强
当前父子关系标识不够清晰，增强方案：
- 子 Block 左侧添加缩进指示线（类似文件树的连接线）
- 子 Block 的标题栏颜色微调（蓝色调），与父 Block 区分
- 父 Block 标题栏始终显示子 Block 数量徽章（如 `2 个子项`）

---

## 四、文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/components/HelpPanel.tsx` | 全面重写 GuideContent、ShortcutsContent、BlocksContent |
| `src/components/OnboardingTour.tsx` | 更新引导步骤为白板模式操作 |
| `src/components/BlockEditor.tsx` | 添加框选逻辑、右键菜单增强、drop zone、父子视觉标识 |
| `src/store/blockStore.ts` | 无需修改（现有 API 已足够） |

## 五、验证步骤

1. `npm run build` 无错误
2. 打开帮助中心，检查所有5个tab内容与实际功能一致
3. 在画布空白处左键拖拽，验证框选矩形出现并正确选中 Block
4. 拖拽 Block 到另一个 Block 上，验证成为子 Block
5. 拖拽 Block 到 drop zone，验证成为子 Block
6. 右键 Block 选择"设为子Block"，验证功能正常
7. 验证父子关系的视觉标识清晰可辨