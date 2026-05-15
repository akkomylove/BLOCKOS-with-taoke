# BlockOS 后续优化改善计划

> **目标**: 在现有功能基础上提升代码质量、用户体验和可维护性

---

## 一、代码质量与工程化（高优先级）

### 1.1 清理未使用的导入和变量
- **文件**: `AgentLogPanel.tsx`, `WhiteboardBlock.tsx`, `CommandPalette.tsx`, `OnboardingTour.tsx`, `SearchPanel.tsx`, `Sidebar.tsx`
- 当前有 8 个 ESLint 未使用变量警告
- 逐文件清理 `@typescript-eslint/no-unused-vars`

### 1.2 Tailwind 配置标准化
- **文件**: `tailwind.config.ts`
- 扩展 `zinc` 色阶定义 `850`，避免再次出现非法颜色
- 或将所有 `zinc-850` 统一为 `zinc-900`（已完成）

### 1.3 全局 CSS 变量规范化
- **文件**: `src/app/globals.css`
- 当前硬编码颜色值（如 `#a1a1aa`），应改为引用 Tailwind 的 CSS 变量
- 示例: `color: hsl(var(--muted-foreground))`

### 1.4 类型安全增强
- `updateBlock` 的 `updates` 参数类型改为精确的 `Partial<Block>` 而非 `Partial<Omit<Block, 'id' | 'createdAt'>>`
- 为所有 API 响应添加类型定义

---

## 二、用户体验优化（高优先级）

### 2.1 AI 自动补全体验增强
- **文件**: `TextBlock.tsx`
- 当前 `data-ghost` + `::after` 伪元素方案对 contentEditable 不稳定
- 建议改为在 contentEditable 内部插入 `<span class="ghost-suggestion">` 真实 DOM 节点
- 添加"按 ESC 取消"提示

### 2.2 标签圆盘交互动画
- **文件**: `TagWheelPicker.tsx`
- 添加扇形 hover 放大效果
- 选中时添加短暂弹跳动画反馈
- 自定义标签输入增加颜色预览

### 2.3 工具栏状态指示
- **文件**: `Toolbar.tsx`
- Agent 开启/关闭状态增加脉冲动画
- 多选时显示"已选 N 个 Block"文字提示

### 2.4 版本历史差异化对比
- **文件**: `HistoryPanel.tsx`
- 当前只能恢复到某个版本，缺少"前后对比"视图
- 增加 diff 高亮显示变更内容

---

## 三、性能优化（中优先级）

### 3.1 减少不必要的 saveHistory 调用
- **文件**: `blockStore.ts`
- 当前每次 `updateBlock` 都调用 `saveHistory()`，频繁编辑时产生大量历史记录
- 增加防抖：相同 Block 的连续编辑合并为一条历史记录

### 3.2 Canvas 虚拟化渲染
- **文件**: `BlockEditor.tsx`
- 大量 Block 时 `renderBlockTree` 全量渲染导致卡顿
- 引入 `react-window` 或手动实现视口裁剪

### 3.3 AI API 请求缓存
- 相同 prompt 在短时间内（如 30 秒）不重复请求
- 增加请求队列防止并发过多

---

## 四、可访问性（中优先级）

### 4.1 键盘导航完善
- Block 之间用 ↑↓ 方向键切换焦点
- Enter 进入编辑模式，Esc 退出
- 工具栏按钮支持 Tab 导航

### 4.2 ARIA 标签
- 所有图标按钮添加 `aria-label`
- 可拖拽元素添加 `aria-grabbed` 状态

---

## 五、错误处理（中优先级）

### 5.1 Error Boundary
- **新建**: `src/components/ErrorBoundary.tsx`
- 包裹 BlockEditor 和各个 Block 组件
- 崩溃时显示"组件加载失败，点击重试"

### 5.2 API 错误统一处理
- AI API 调用失败时显示 toast 提示而非 `alert()`
- 增加重试按钮

---

## 六、数据持久化增强（低优先级）

### 6.1 IndexedDB 存储
- 当前仅用 Zustand + localStorage
- 大数据量时 localStorage 有 5MB 限制
- 迁移到 IndexedDB（使用 `idb` 库）

### 6.2 自动备份
- 每 5 分钟自动导出 JSON 到本地文件
- 异常崩溃时从备份恢复

---

## 七、测试覆盖（低优先级）

### 7.1 单元测试
- `blockStore` 的核心操作（addBlock, updateBlock, deleteBlock, undo, redo）
- 使用 Vitest + @testing-library/react

### 7.2 E2E 测试
- 创建 Block → 编辑 → 切换主题 → 添加标签 的完整流程
- 使用 Playwright

---

## 执行顺序建议

1. **第一阶段**（1-2 天）: 1.1 + 1.2 + 1.3 + 5.1 + 5.2
2. **第二阶段**（2-3 天）: 2.1 + 2.2 + 2.4
3. **第三阶段**（3-5 天）: 3.1 + 3.2 + 4.1
4. **第四阶段**（5-7 天）: 6.1 + 6.2 + 7.1