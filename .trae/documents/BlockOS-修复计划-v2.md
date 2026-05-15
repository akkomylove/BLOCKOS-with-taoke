# BlockOS 修复计划 v2

## 问题清单

1. **历史版本 UI 显示问题** — 信息看不清
2. **顶部工具栏形变** — 点击 Block 后选项卡变宽、界面变形
3. **AI 续写显示位置异常** — 内容显示在 Block 外，仅两格宽度
4. **使用指南过时** — 新增功能未覆盖
5. **标签选择无效** — 选择后无颜色/文字，导航无结果

---

## 修复步骤

### Step 1: 标签选择功能修复（高优先级）

**目标**: 点击标签按钮 → 弹出圆盘 → 选择标签 → Block 显示标签颜色+文字，左侧导航可筛选

**文件**:
- `src/components/TagWheelPicker.tsx` — 检查圆盘选择后是否正确回调 `onSelect`
- `src/components/BlockEditor.tsx` — 检查 `handleAddTag` 是否正确更新 block meta
- `src/store/blockStore.ts` — 检查标签是否持久化到 block 的 `meta.tags`
- `src/components/GroupPanel.tsx` 或标签导航组件 — 检查是否按 `meta.tags` 过滤

**验证**: 选择标签后，Block 头部应显示彩色标签 pill；左侧导航标签页应列出该标签及对应 Block 数量。

---

### Step 2: AI 续写显示修复

**目标**: 幽灵文本应紧跟光标后，inline 显示，宽度自适应

**文件**:
- `src/components/blocks/TextBlock.tsx` — 检查 ghost text 渲染方式

**方案**:
- 当前可能使用了 `absolute` + `marginLeft` 导致错位
- 改为 inline 元素（如 `<span>` 或伪元素）插入到 contentEditable 同级流中
- 或使用 `::after` 伪元素 + `content: attr(data-ghost)` 方案

**验证**: 输入文本后，AI 建议应以半透明文字紧跟在光标后，按 Tab 可接受。

---

### Step 3: 顶部工具栏形变修复

**目标**: 点击 Block 后工具栏保持固定宽度，不抖动、不膨胀

**文件**:
- `src/components/Toolbar.tsx` — 检查选中态布局

**方案**:
- 工具栏使用 `ResizeObserver` 检测溢出并折叠到"更多"菜单
- 选中 Block 后的操作区域使用固定宽度占位（`visibility: hidden` 代替条件渲染）
- 所有按钮使用统一尺寸，避免内容变化导致宽度跳动

**验证**: 快速点击不同 Block，工具栏宽度保持稳定，无肉眼可见形变。

---

### Step 4: 历史版本 UI 优化

**目标**: 信息清晰可读，当前版本突出，操作直观

**文件**:
- `src/components/HistoryPanel.tsx`

**方案**:
- 去掉细线时间轴，改用卡片式列表
- 增大字体对比度，行动作图标+颜色区分（创建/删除/编辑）
- 当前版本用蓝色边框+背景高亮
- 空状态添加图标和提示文字
- hover 显示"点击恢复"提示

**验证**: 浅色/深色主题下均清晰可读，当前版本一眼可辨。

---

### Step 5: 使用指南更新

**目标**: 覆盖所有新功能，结构清晰

**文件**:
- `src/components/HelpPanel.tsx`

**方案**:
- 新增"快捷键"标签页（Ctrl+K 搜索、Ctrl+N 新建等）
- 使用指南页改为手风琴折叠区块：
  - Block 类型（文本/待办/代码/表格/媒体/引用/折叠）
  - 核心功能（搜索、标签、版本历史、Block 关联、主题切换、AI 补全）
  - 父子关系与关联
  - 标签与导航
- AI 功能页补充"AI 自动补全"说明

**验证**: 打开帮助中心，所有功能均有对应说明，新用户可快速上手。

---

### Step 6: 构建与运行时验证

1. `npm run build` — 0 errors, 0 warnings
2. `npm run dev` — 无 Edge Runtime / module 错误
3. 手动验证所有 5 项修复
