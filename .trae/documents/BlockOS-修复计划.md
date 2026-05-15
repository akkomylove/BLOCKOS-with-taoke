# BlockOS 修复计划

> 修复标签系统失效、AI补全显示异常、工具栏抖动、帮助中心过时 四个问题。

---

## 一、问题诊断

### 问题 1：标签圆盘选择后无效果

**根因分析**：`TagWheelPicker` 使用 `absolute` 定位（`top: '100%'`），其父容器在 BlockEditor 的滚动区域内。滚动容器会裁剪溢出内容，导致圆盘实际不可见。用户点击看似"选中"了，实际上圆盘根本没渲染在可见区域，或者被遮挡。

**修复方案**：将 TagWheelPicker 改为 `fixed` 定位，使用触发按钮的 `getBoundingClientRect()` 获取屏幕坐标，渲染在 document 层级。

### 问题 2：AI 补全幽灵文本显示为两字方框

**根因分析**：当前实现用 `position: absolute` + `marginLeft: ref.current.getBoundingClientRect().width`。contenteditable 的 div 是块级元素，宽度等于容器宽度，所以 `marginLeft` 把幽灵文本推到了容器最右端，超出可见区域，只露出一点点。

**修复方案**：重新设计幽灵文本的渲染方式——改为 inline 流式布局，幽灵文本直接跟在 contenteditable 文本后面，使用半透明样式。

### 问题 3：工具栏按钮变形/消失/臃肿

**根因分析**：工具栏使用 `flex` 布局，选中 Block 时会动态插入「选中数量 + 复制 + 删除」按钮组，还有「AI 格式化」按钮条件渲染。这些动态元素导致 flex 容器重新分配空间，已有按钮被挤压变形或换行。

**修复方案**（用户选择）：折叠溢出按钮。工具栏右侧按钮超出时折叠到「更多」下拉菜单中。同时为选中操作区域预留最小宽度。

### 问题 4：帮助中心使用指南过时

**根因分析**：帮助面板创建于功能较少的早期版本，后续添加的标签系统、模板库、主题切换、AI补全、代码运行、搜索过滤、历史时间线等功能均未在指南中体现。

**修复方案**（用户选择）：全面重写使用指南，覆盖所有功能。

---

## 二、修复详情

### Fix 1：标签圆盘修复

**文件**：`src/components/TagWheelPicker.tsx`

**改动**：
1. 移除 `absolute` + `top: '100%'` 定位
2. 接收 `triggerRect: DOMRect` prop，用 `fixed` 定位到触发按钮下方
3. 确保 z-index 足够高（z-50 → z-[100]）
4. 点击圆盘外部区域关闭

**文件**：`src/components/BlockEditor.tsx`

**改动**：
1. 在点击 Tag 按钮时记录 `triggerRect`
2. 将 `triggerRect` 传给 `TagWheelPicker`
3. 使用 `useEffect` + `document.addEventListener('click', ...)` 处理圆盘外部点击关闭

### Fix 2：AI 幽灵文本修复

**文件**：`src/components/blocks/TextBlock.tsx`

**改动**：
1. 移除 `position: absolute` 的幽灵文本 span
2. 改为：在 contenteditable div 下面放一个隐藏的测量层，实时同步文本内容
3. 幽灵文本使用 `inline` 元素放在 contenteditable 文本流末尾
4. 具体实现：
   - 用一个不可见的 `<span>` 镜像 contenteditable 的文本
   - 幽灵文本 `<span>` 紧跟在镜像文本后面
   - 使用 `opacity-50` + 半透明颜色

### Fix 3：工具栏折叠溢出

**文件**：`src/components/Toolbar.tsx`

**改动**：
1. 新增 `useRef` + `useEffect` 监听容器宽度
2. 将右侧按钮分为「始终显示」和「可折叠」两组
3. 始终显示：主题切换、撤销、重做、AI助手
4. 可折叠：关系、导航、Agent、日志、搜索、导出、导入、AI格式化、历史、帮助
5. 当容器不够宽时，可折叠按钮收入「更多（···）」下拉菜单
6. 选中操作区域（数量+复制+删除）固定最小宽度 `min-w-[100px]`，避免抖动
7. `AI 格式化` 按钮在未选中 text Block 时用 `invisible` 占位而非条件渲染

### Fix 4：帮助中心全面重写

**文件**：`src/components/HelpPanel.tsx`

**改动**：
1. 重写「使用指南」Tab 为分区式详细指南
2. 新增分区：
   - **快速入门** — 创建页面、添加 Block、编辑内容
   - **Block 类型** — 11 种 Block 的类型图标网格（保留现有）
   - **标签系统** — 圆盘选择器使用说明、自定义标签、标签导航
   - **模板库** — 新建页面时选择模板
   - **主题切换** — 深色/浅色模式切换
   - **AI 功能** — 命令面板、AI补全、AI格式化、Agent操作
   - **代码运行** — JS/Python 实时代码执行
   - **搜索与过滤** — 类型过滤、标签过滤、关键词高亮
   - **导入导出** — 支持的文件格式和方式
   - **历史时间线** — 版本历史查看和恢复
   - **数据联动** — @ref 引用和依赖追踪
3. 每个分区用折叠式卡片（Accordion），默认展开前几个核心分区
4. 保留「快捷键」「AI功能」「设置」Tab 不变

---

## 三、修改文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/components/TagWheelPicker.tsx` | 重写定位 | absolute → fixed，接收 triggerRect |
| `src/components/BlockEditor.tsx` | 小改 | 传递 triggerRect 给 TagWheelPicker |
| `src/components/blocks/TextBlock.tsx` | 重写幽灵文本 | 从 absolute 改为 inline 流式布局 |
| `src/components/Toolbar.tsx` | 重构布局 | 添加折叠溢出逻辑，预留选中区域宽度 |
| `src/components/HelpPanel.tsx` | 全面重写指南 | 分区折叠卡片式详细指南 |

---

## 四、实施顺序

```
1. Fix 3: 工具栏折叠溢出（独立改动）
2. Fix 1: 标签圆盘修复（独立改动）
3. Fix 2: AI 幽灵文本（独立改动）
4. Fix 4: 帮助中心重写（独立改动）
5. 构建验证：npm run build
```

四个修复相互独立，可以任意顺序实施。

---

## 五、验收标准

- [ ] 标签圆盘：点击 Tag 图标弹出圆盘在正确位置，选择标签后 Block 标题栏立即显示标签，导航面板标签分类可见
- [ ] AI 补全：幽灵文本以半透明形式出现在文本末尾，Tab 键接受
- [ ] 工具栏：选中 Block 时按钮不抖动不变形，窄窗口下溢出按钮折叠到更多菜单
- [ ] 帮助中心：使用指南包含所有功能的详细说明，分区折叠卡片
- [ ] `npm run build` 0 errors 0 warnings