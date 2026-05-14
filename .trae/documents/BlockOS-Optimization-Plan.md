# BlockOS 优化计划：向 Notion 级文档工具演进

## 一、当前状态分析

### 1.1 已实现的特性
- 5 种 Block 类型：text、todo、list、code、table
- 拖拽排序（@dnd-kit）
- 多选（Shift/Cmd+Click）
- `/` 命令菜单创建 Block
- AI 动作菜单（Sparkles 按钮）
- Cmd+K 命令面板
- 双向链接
- Agent 规则引擎（todo 完成自动触发）
- 暗色主题 UI
- localStorage 持久化

### 1.2 已修复的关键问题
- Hydration 不匹配（skipHydration + dynamic ssr:false）
- Agent 无限循环（processedChangesRef 去重）
- Next.js 升级至 15.5.18 + React 19

### 1.3 用户明确的问题
1. **Block 添加体验差** — 只能底部添加，无法在任意位置插入
2. **单页面，无文档管理** — 只有一个页面，无法创建多个文档
3. **操作无法回溯** — 无 Undo/Redo
4. **内容类型单一** — 只有 5 种基础类型
5. **操作逻辑混乱** — 很多交互不自然

### 1.4 探索发现的问题（未在用户列表中）
1. **无页面/文档概念** — 所有 Block 在一个扁平数组里，没有文档层级
2. **无嵌套/缩进** — Block 之间只有顺序关系，没有父子层级
3. **TextBlock 的 contentEditable 光标问题** — 每次 setState 后光标会跳到最后
4. **ListBlock 渲染与编辑分离** — 渲染时解析 content，但编辑时是纯文本，体验割裂
5. **TableBlock 数据不可读** — 内容存 JSON，导出时无法直接阅读
6. **无搜索功能** — 无法搜索 Block 内容
7. **无导出功能** — 无法导出为 Markdown/HTML
8. **AI 功能未配置 API Key** — 已预留接口但无法调用
9. **CommandMenu 只在 `/` 触发时工作** — 空行输入 `/` 的检测逻辑脆弱
10. **无 Block 转换** — 无法将 text 转为 todo，或 todo 转为 list
11. **无删除确认** — Backspace 删除直接消失，无提示
12. **无空 Block 自动清理** — 空 Block 会一直存在

---

## 二、目标定义

### 2.1 核心目标
将 BlockOS 从"单页面 Block 编辑器"升级为"多文档知识管理系统"，核心体验对标 Notion 的 70%。

### 2.2 成功标准
- [ ] 可以创建/管理多个文档（页面）
- [ ] 可以在任意位置添加/插入 Block
- [ ] 支持 Undo/Redo（完整版，含内容编辑）
- [ ] 新增 4 种 Block 类型（图片、引用块、折叠块、分割线）
- [ ] 支持 Block 嵌套/缩进（Tab/Shift+Tab + 拖拽嵌套）
- [ ] Block 类型可转换（text ↔ todo ↔ list）
- [ ] 空 Block 自动清理
- [ ] 搜索功能
- [ ] 导出为 Markdown
- [ ] 使用教程（Onboarding + 帮助页面）
- [ ] 后端 API + SQLite + OAuth 认证
- [ ] 腾讯云部署配置

---

## 三、详细实施方案

### Phase 1: 页面/文档管理（左侧侧边栏）

**目标**：引入 Page 概念，左侧显示所有页面列表

**数据模型变更**（`src/types/block.ts`）：
```typescript
export interface Page {
  id: string;
  title: string;
  icon?: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}
```

**Store 变更**（`src/store/blockStore.ts`）：
- 将 `blocks: Block[]` 改为 `pages: Page[]`
- 添加 `currentPageId: string`
- 添加 `addPage`、`deletePage`、`updatePageTitle`、`setCurrentPage` 方法
- 保留 `blocks` 作为当前页面的 blocks（getter）
- 所有 Block 操作自动作用于当前页面

**新增组件**：
- `src/components/Sidebar.tsx` — 左侧侧边栏
  - 页面列表（可折叠分组）
  - 新建页面按钮
  - 页面右键菜单（重命名、删除、复制）
  - 当前页面高亮
  - 拖拽排序页面

**修改组件**：
- `src/components/BlockOSApp.tsx` — 添加 Sidebar 布局
- `src/components/Toolbar.tsx` — 添加当前页面标题编辑

---

### Phase 2: 完整 Undo/Redo

**目标**：记录所有状态变更，支持无限级撤销/重做

**实现方案**：
- 在 store 中维护 `history: Block[][]` 和 `historyIndex: number`
- 每次 `addBlock`、`updateBlock`、`deleteBlock`、`moveBlock` 时保存快照
- `updateBlock` 使用防抖（300ms）避免每个字符都保存快照
- 提供 `undo()`、`redo()`、`canUndo`、`canRedo`

**快捷键**：
- Cmd/Ctrl + Z = Undo
- Cmd/Ctrl + Shift + Z = Redo
- Cmd/Ctrl + Y = Redo（备选）

**UI**：
- Toolbar 添加 Undo/Redo 按钮（禁用状态根据 canUndo/canRedo）

---

### Phase 3: Block 添加体验优化

**目标**：Notion 级的流畅添加体验

**3.1 空 Block 提示**
- 每个 Block 下方显示 "点击添加内容，或输入 '/' 查看命令"
- 点击空白区域在点击位置插入新 Block

**3.2 行末添加按钮**
- 每个 Block 右侧悬停显示 "+" 按钮
- 点击在当前 Block 下方插入新 Block

**3.3 快捷命令增强**
- `/` 触发 CommandMenu（已存在，优化检测逻辑）
- 支持更多快捷输入：
  - `# ` → 标题 1
  - `## ` → 标题 2
  - `- ` → 列表
  - `[] ` → 待办
  - ```` ` → 代码块
  - `> ` → 引用块
  - `---` → 分割线
  - `||` → 表格

**3.4 Block 转换**
- 选中文本 Block 内容以 `- ` 开头 → 自动转为 list
- 选中文本 Block 内容以 `[] ` 开头 → 自动转为 todo
- 提供转换菜单（右键或 `/convert`）

---

### Phase 4: 新增 Block 类型

**4.1 图片 Block（`image`）**
- 支持 URL 输入和本地上传（FileReader）
- 显示图片 + 可选 caption
- 支持拖拽调整大小

**4.2 引用块 Block（`quote`）**
- 左侧蓝色竖线装饰
- 斜体/灰色文字
- 支持嵌套

**4.3 折叠块 Block（`toggle`）**
- 可展开/折叠的子内容
- 展开后内部可包含多个 Block
- 需要支持嵌套 Block 渲染

**4.4 分割线 Block（`divider`）**
- 水平线
- 不可编辑，仅显示
- 点击选中可删除

---

### Phase 5: Block 嵌套/缩进

**目标**：支持 Block 的父子层级关系

**数据模型**：
- `Block.parentId` 已存在，当前始终为 null
- 启用 parentId，支持嵌套

**交互**：
- Tab：当前 Block 变为前一个 Block 的子块
- Shift+Tab：当前 Block 提升一级
- 拖拽：拖到一个 Block 上时变成其子块

**渲染**：
- 子 Block 缩进显示（左侧 padding 增加）
- Toggle Block 的子内容可折叠

**限制**：
- 最大嵌套深度 3 层
- Table、Divider 不可作为子块

---

### Phase 6: 搜索与导出

**6.1 搜索功能**
- Cmd/Ctrl + F 打开搜索面板
- 搜索所有页面的 Block 内容
- 结果高亮，点击跳转

**6.2 导出 Markdown**
- 将当前页面导出为 .md 文件
- 各 Block 类型映射：
  - text → 文本
  - todo → `- [ ]` / `- [x]`
  - list → `- ` / `1. `
  - code → ````
  - table → Markdown 表格
  - quote → `>`
  - divider → `---`
  - toggle → 标题 + 子内容

---

### Phase 7: 使用教程（Onboarding + 帮助页面）

**目标**：降低新用户学习成本，确保易用性

**7.1 首次启动引导（Onboarding Tour）**
- 新用户首次打开时自动触发
- 高亮各个功能区域，分步骤引导：
  - Step 1: "这是你的文档工作区，点击这里创建新页面"
  - Step 2: "输入 '/' 快速添加不同类型的内容块"
  - Step 3: "拖拽块可以重新排序"
  - Step 4: "选中多个块可以进行批量操作"
  - Step 5: "按 Cmd+K 打开命令面板，用自然语言操控文档"
- 提供 "跳过" 和 "不再显示" 选项
- 进度指示器（Step 1/5）

**7.2 独立帮助页面**
- 侧边栏或顶部添加 "?" 帮助按钮
- 点击打开模态框/抽屉，包含：
  - **快速入门**：图文教程，5 分钟上手
  - **快捷键大全**：所有键盘快捷键列表
  - **Block 类型指南**：每种 Block 的用法和快捷输入
  - **AI 功能说明**：如何调用 AI 辅助（预留，API 配置后生效）
  - **常见问题**：FAQ

**7.3 快捷键提示面板**
- 按 `?` 键（非输入框焦点时）打开快捷键速查面板
- 半透明浮层，不影响当前操作
- 分类显示：编辑、导航、AI、通用

**7.4 空状态引导**
- 新建空页面时显示引导提示：
  - "点击此处开始输入，或按 '/' 查看命令"
  - 显示几个常用 Block 类型的快捷图标

---

### Phase 8: 后端 API + SQLite + OAuth 认证

**目标**：将数据从 localStorage 迁移到服务端，支持多设备同步

**8.1 数据库设计（SQLite）**

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  provider TEXT NOT NULL, -- 'github' | 'google'
  provider_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 页面表
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '无标题',
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Block 表
CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  parent_id TEXT REFERENCES blocks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**8.2 API 路由设计**

```
/api/auth/*          NextAuth.js 路由
/api/pages           GET(列表) POST(创建)
/api/pages/[id]      GET(详情) PATCH(更新) DELETE(删除)
/api/pages/[id]/blocks  GET(列表) POST(批量更新)
/api/blocks/[id]     PATCH(更新) DELETE(删除)
/api/search          GET(全文搜索)
/api/export/[id]     GET(导出 Markdown)
```

**8.3 认证方案（NextAuth.js v5）**
- OAuth 提供商：GitHub、Google
- JWT 策略（无 session 数据库）
- 登录成功后自动创建/关联用户
- 未登录用户重定向到登录页

**8.4 数据同步策略**
- 前端保留 Zustand store 作为本地状态
- 关键操作（增删改）实时同步到后端
- 页面加载时从后端拉取数据
- 网络断开时降级为 localStorage 缓存（离线模式）

**8.5 新增/修改文件**

| 文件 | 说明 |
|------|------|
| `src/lib/db.ts` | SQLite 数据库连接（better-sqlite3） |
| `src/lib/auth.ts` | NextAuth.js 配置 |
| `src/app/api/auth/[...nextauth]/route.ts` | 认证路由 |
| `src/app/api/pages/route.ts` | 页面 CRUD API |
| `src/app/api/pages/[id]/route.ts` | 单个页面 API |
| `src/app/api/pages/[id]/blocks/route.ts` | Block 批量 API |
| `src/app/api/blocks/[id]/route.ts` | 单个 Block API |
| `src/app/api/search/route.ts` | 搜索 API |
| `src/app/api/export/[id]/route.ts` | 导出 API |
| `src/app/login/page.tsx` | 登录页面 |
| `src/middleware.ts` | 路由保护（未登录重定向） |
| `src/hooks/useSync.ts` | 数据同步 Hook |

---

### Phase 9: 腾讯云部署配置

**目标**：提供完整的腾讯云服务器部署方案

**9.1 服务器环境**
- 操作系统：Ubuntu 22.04 LTS
- Node.js：v20 LTS
- PM2：进程管理
- Nginx：反向代理 + HTTPS
- SQLite：已内置，无需额外安装

**9.2 部署文件**

| 文件 | 说明 |
|------|------|
| `deploy/Dockerfile` | Docker 构建文件 |
| `deploy/docker-compose.yml` | Docker Compose 配置 |
| `deploy/nginx.conf` | Nginx 配置模板 |
| `deploy/pm2.config.js` | PM2 进程配置 |
| `deploy/setup.sh` | 一键部署脚本 |
| `deploy/README.md` | 部署文档 |

**9.3 部署步骤**

```bash
# 1. 购买腾讯云服务器（建议 2核4G）
# 2. 配置安全组：开放 22(SSH), 80(HTTP), 443(HTTPS)
# 3. 域名解析到服务器 IP
# 4. 登录服务器执行：

curl -fsSL https://raw.githubusercontent.com/your-repo/blockOS/main/deploy/setup.sh | bash

# 脚本自动完成：
# - 安装 Node.js 20
# - 安装 PM2
# - 安装 Nginx
# - 配置 SSL（Let's Encrypt）
# - 克隆代码并构建
# - 启动服务
```

**9.4 环境变量配置**

```bash
# .env.production
DATABASE_URL="file:./data/blockos.db"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-random-secret"
GITHUB_CLIENT_ID="your-github-app-id"
GITHUB_CLIENT_SECRET="your-github-app-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="your-openai-key"
```

**9.5 CI/CD 配置**
- GitHub Actions 工作流：
  - 推送到 main 分支自动构建
  - SSH 部署到腾讯云服务器
  - PM2 平滑重启

---

## 四、文件变更清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `src/types/page.ts` | Page 类型定义 |
| `src/components/Sidebar.tsx` | 左侧侧边栏 |
| `src/components/blocks/ImageBlock.tsx` | 图片 Block |
| `src/components/blocks/QuoteBlock.tsx` | 引用块 Block |
| `src/components/blocks/ToggleBlock.tsx` | 折叠块 Block |
| `src/components/blocks/DividerBlock.tsx` | 分割线 Block |
| `src/components/SearchPanel.tsx` | 搜索面板 |
| `src/components/OnboardingTour.tsx` | 首次引导组件 |
| `src/components/HelpPanel.tsx` | 帮助面板 |
| `src/components/ShortcutPanel.tsx` | 快捷键提示面板 |
| `src/hooks/useHistory.ts` | Undo/Redo Hook |
| `src/hooks/useSync.ts` | 数据同步 Hook |
| `src/lib/db.ts` | SQLite 数据库连接 |
| `src/lib/auth.ts` | NextAuth.js 配置 |
| `src/app/login/page.tsx` | 登录页面 |
| `src/app/api/auth/[...nextauth]/route.ts` | 认证路由 |
| `src/app/api/pages/route.ts` | 页面 CRUD API |
| `src/app/api/pages/[id]/route.ts` | 单个页面 API |
| `src/app/api/pages/[id]/blocks/route.ts` | Block 批量 API |
| `src/app/api/blocks/[id]/route.ts` | 单个 Block API |
| `src/app/api/search/route.ts` | 搜索 API |
| `src/app/api/export/[id]/route.ts` | 导出 API |
| `src/middleware.ts` | 路由保护 |
| `deploy/Dockerfile` | Docker 构建 |
| `deploy/docker-compose.yml` | Docker Compose |
| `deploy/nginx.conf` | Nginx 配置 |
| `deploy/pm2.config.js` | PM2 配置 |
| `deploy/setup.sh` | 一键部署脚本 |
| `deploy/README.md` | 部署文档 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `src/types/block.ts` | 添加新 Block 类型 |
| `src/store/blockStore.ts` | 添加 Page 管理、Undo/Redo、历史快照、后端同步 |
| `src/components/BlockOSApp.tsx` | 添加 Sidebar、Onboarding、Help 布局 |
| `src/components/BlockEditor.tsx` | 空 Block 提示、行末添加按钮、嵌套渲染 |
| `src/components/Toolbar.tsx` | 添加 Undo/Redo、页面标题、帮助按钮 |
| `src/components/SortableBlock.tsx` | 嵌套缩进显示 |
| `src/components/BlockRenderer.tsx` | 添加新 Block 类型渲染 |
| `src/components/TextBlock.tsx` | 光标修复、快捷转换 |
| `src/components/CommandMenu.tsx` | 更多命令 |
| `src/components/CommandPalette.tsx` | 搜索集成 |
| `package.json` | 添加 better-sqlite3、next-auth 等依赖 |

---

## 五、技术决策

### 5.1 页面存储
- **第一阶段（开发期）**：localStorage，快速迭代
- **第二阶段（后端完成后）**：SQLite + API，数据持久化到服务端
- **迁移策略**：后端上线后，自动将 localStorage 数据导入到用户账号

### 5.2 Undo/Redo 实现
- 使用 Immer 的 `produce` 生成不可变快照
- 历史栈最大 50 步
- `updateBlock` 使用 300ms 防抖合并连续输入

### 5.3 嵌套渲染
- 使用递归渲染：Block 渲染时检查是否有 children
- children 用额外的 SortableContext（嵌套 DnD）
- 或简化：只支持 Toggle 块内部嵌套，其他 Block 不支持

### 5.4 图片存储
- **第一阶段**：FileReader 转 base64 存入 content
- **第二阶段**：上传到腾讯云 COS，存 URL

### 5.5 数据库选择
- SQLite：零配置、单文件、足够支撑到 10 万用户
- 未来如需扩展可迁移到 PostgreSQL

### 5.6 认证方案
- NextAuth.js v5（Auth.js）：官方推荐，支持 OAuth 2.0
- JWT 策略：无状态，适合 SQLite 场景

---

## 六、实施顺序建议

考虑到开发效率和用户体验，建议按以下顺序实施：

| 阶段 | 内容 | 优先级 | 预计时间 |
|------|------|--------|---------|
| 1 | 页面管理 + Sidebar | P0 | 2 天 |
| 2 | Undo/Redo | P0 | 1 天 |
| 3 | Block 添加体验优化 | P0 | 1 天 |
| 4 | 新增 Block 类型 | P1 | 1 天 |
| 5 | 使用教程（Onboarding + Help） | P1 | 1 天 |
| 6 | 搜索 + 导出 | P1 | 1 天 |
| 7 | Block 嵌套/缩进 | P2 | 2 天 |
| 8 | 后端 API + SQLite + OAuth | P1 | 3 天 |
| 9 | 腾讯云部署配置 | P1 | 1 天 |

**总计：约 13 天**

---

## 七、验证步骤

1. 创建多个页面，切换页面，确认 Block 独立
2. 添加各种 Block 类型，确认渲染正确
3. 拖拽排序，确认顺序正确
4. Tab/Shift+Tab 缩进，确认嵌套关系
5. 输入文本，Undo/Redo 确认恢复
6. 搜索内容，确认结果正确
7. 导出 Markdown，确认格式正确
8. 勾选 Todo，确认 Agent 触发
9. 新用户首次打开，确认 Onboarding 引导正常
10. 点击帮助按钮，确认帮助面板内容完整
11. GitHub OAuth 登录，确认账号创建成功
12. 创建页面后刷新，确认数据从服务端恢复
13. 部署到腾讯云，确认公网可访问
