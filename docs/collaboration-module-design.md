# BlockOS 协作模块设计方案

## 1. 背景与目标

BlockOS 是一个 AI 原生的知识操作系统，当前版本已具备单用户文档编辑能力。本方案旨在扩展为支持多人协作的团队工作平台，保留 BlockOS 的核心体验（Block 编辑、AI 融合），同时增加团队协作能力。

### 目标用户
- 小型团队（1-10人）
- 需要高效管理项目和任务的团队
- 期望 AI 辅助协作的知识工作者

### 核心价值
- 将 BlockOS 的 Block 原子化理念延伸到团队协作
- 通过 AI 提升任务拆解、风险识别等协作效率
- 保持与现有 BlockOS 体验的一致性

## 2. 现状分析

### 2.1 已有能力
- ✅ NextAuth 用户认证（GitHub/Google）
- ✅ sql.js SQLite 数据库
- ✅ 用户数据模型（users 表）
- ✅ 页面和 Block 数据模型（pages、blocks 表）
- ✅ 完整的 Block 编辑器组件
- ✅ Zustand 状态管理

### 2.2 技术栈
- **框架**：Next.js 14+ (App Router)
- **数据库**：sql.js (SQLite in browser/Node)
- **认证**：NextAuth v5
- **状态**：Zustand
- **UI**：Tailwind CSS + lucide-react
- **类型**：TypeScript

## 3. 功能模块设计

### 3.1 团队管理（Teams）

#### 功能点
- 创建团队
- 邀请成员（通过邮箱或链接）
- 管理成员角色（owner、admin、member）
- 退出/删除团队

#### 数据模型
```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}
```

### 3.2 项目管理（Projects）

#### 功能点
- 在团队内创建项目
- 设置项目描述、图标、颜色
- 将 BlockOS 页面关联到项目
- 项目成员权限控制
- 项目里程碑设置

#### 数据模型
```typescript
interface Project {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
}

interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate?: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
}
```

### 3.3 任务管理（Tasks）

#### 功能点
- 创建任务（支持嵌套：任务 → 子任务 → 行动项）
- 设置 DOD（Definition of Done）
- 任务分配给团队成员
- 任务状态流转（todo → in_progress → done）
- 优先级设置（low、medium、high、urgent）
- 截止日期
- 任务评论与 @提及
- 任务关联 BlockOS 页面

#### 数据模型
```typescript
interface Task {
  id: string;
  projectId: string;
  parentId?: string; // 支持嵌套
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  dueDate?: number;
  dod?: string; // Definition of Done
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  mentions: string[]; // @提及的用户ID
  createdAt: number;
  updatedAt: number;
}
```

### 3.4 协作视图

#### 功能点
- 团队空间概览
- 项目看板（任务状态视图）
- 任务列表视图
- 里程碑时间轴
- 成员工作负载视图

### 3.5 通知系统

#### 功能点
- 任务分配通知
- 任务评论 @通知
- 截止日期提醒
- 项目更新通知

## 4. 数据模型设计

### 4.1 扩展数据库 Schema

在 `src/lib/db.ts` 中新增以下表：

```sql
-- 团队表
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_id TEXT REFERENCES users(id),
  due_date INTEGER,
  dod TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 任务评论表
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  mentions TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
```

## 5. API 设计

### 5.1 团队 API
```
POST   /api/teams                 - 创建团队
GET    /api/teams                 - 获取我的团队列表
GET    /api/teams/:id              - 获取团队详情
PATCH  /api/teams/:id              - 更新团队
DELETE /api/teams/:id              - 删除团队
POST   /api/teams/:id/members      - 添加成员
DELETE /api/teams/:id/members/:uid - 移除成员
PATCH  /api/teams/:id/members/:uid - 更新成员角色
```

### 5.2 项目 API
```
POST   /api/projects              - 创建项目
GET    /api/projects              - 获取我的项目列表
GET    /api/projects/:id          - 获取项目详情
PATCH  /api/projects/:id          - 更新项目
DELETE /api/projects/:id          - 删除项目
GET    /api/projects/:id/members  - 获取项目成员
POST   /api/projects/:id/members  - 添加项目成员
```

### 5.3 任务 API
```
POST   /api/tasks                 - 创建任务
GET    /api/tasks                 - 获取任务列表（支持过滤）
GET    /api/tasks/:id              - 获取任务详情
PATCH  /api/tasks/:id              - 更新任务
DELETE /api/tasks/:id              - 删除任务
POST   /api/tasks/:id/comments     - 添加评论
GET    /api/tasks/:id/comments     - 获取评论列表
```

### 5.4 里程碑 API
```
POST   /api/milestones            - 创建里程碑
GET    /api/milestones            - 获取里程碑列表
PATCH  /api/milestones/:id        - 更新里程碑
DELETE /api/milestones/:id        - 删除里程碑
```

## 6. 组件设计

### 6.1 新增组件
```
src/components/collaboration/
├── TeamSpace.tsx           - 团队空间主组件
├── TeamList.tsx           - 团队列表
├── TeamCard.tsx           - 团队卡片
├── CreateTeamModal.tsx    - 创建团队弹窗
├── TeamSettings.tsx       - 团队设置

├── ProjectList.tsx        - 项目列表
├── ProjectCard.tsx        - 项目卡片
├── CreateProjectModal.tsx - 创建项目弹窗
├── ProjectBoard.tsx        - 项目看板
├── ProjectHeader.tsx      - 项目头部

├── TaskList.tsx           - 任务列表
├── TaskCard.tsx           - 任务卡片
├── TaskDetail.tsx         - 任务详情面板
├── CreateTaskModal.tsx    - 创建任务弹窗
├── TaskComment.tsx        - 任务评论
├── TaskAssignee.tsx       - 任务分配

├── MilestoneTimeline.tsx  - 里程碑时间轴
├── MilestoneCard.tsx      - 里程碑卡片

├── MemberAvatar.tsx       - 成员头像组件
├── MemberList.tsx         - 成员列表
├── InviteMember.tsx       - 邀请成员

└── index.ts               - 导出所有组件
```

### 6.2 组件设计原则
- 遵循现有 BlockOS 设计风格（深色主题）
- 使用 Tailwind CSS 工具类
- 使用 lucide-react 图标
- 支持国际化文本
- 响应式布局（桌面优先）

## 7. 状态管理

### 7.1 Zustand Store 设计

```typescript
// src/store/collaborationStore.ts
interface CollaborationState {
  // 团队状态
  teams: Team[];
  currentTeam: Team | null;
  
  // 项目状态
  projects: Project[];
  currentProject: Project | null;
  
  // 任务状态
  tasks: Task[];
  currentTask: Task | null;
  
  // UI 状态
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTeams: () => Promise<void>;
  createTeam: (data: CreateTeamInput) => Promise<void>;
  // ... 更多 actions
}
```

## 8. 路由设计

```
/app
├── (auth)/
│   └── login/
│       └── page.tsx
│
├── (workspace)/
│   ├── layout.tsx           - 工作空间布局
│   ├── teams/
│   │   ├── page.tsx         - 团队列表页
│   │   └── [teamId]/
│   │       ├── page.tsx     - 团队详情页
│   │       ├── projects/
│   │       │   ├── page.tsx - 项目列表页
│   │       │   └── [projectId]/
│   │       │       ├── page.tsx       - 项目看板页
│   │       │       └── tasks/
│   │       │           └── page.tsx   - 任务列表页
│   │       └── members/
│   │           └── page.tsx  - 成员管理页
│   │
│   └── my/
│       └── tasks/
│           └── page.tsx      - 我的任务页
│
└── (main)/
    ├── page.tsx             - 首页/仪表盘
    └── [pageId]/
        └── page.tsx          - BlockOS 编辑器
```

## 9. 权限控制

### 9.1 角色层级
```
团队级别:
- owner: 团队所有者，拥有所有权限
- admin: 管理员，可以管理成员和项目
- member: 普通成员，可以参与项目和任务

项目级别:
- owner: 项目所有者
- admin: 项目管理员
- member: 项目成员
- viewer: 只读访问
```

### 9.2 权限矩阵
| 操作 | Owner | Admin | Member | Viewer |
|-----|-------|-------|--------|--------|
| 管理团队设置 | ✅ | ❌ | ❌ | ❌ |
| 管理团队成员 | ✅ | ✅ | ❌ | ❌ |
| 创建项目 | ✅ | ✅ | ✅ | ❌ |
| 管理项目 | ✅ | ✅ | ❌ | ❌ |
| 创建任务 | ✅ | ✅ | ✅ | ❌ |
| 分配任务 | ✅ | ✅ | ✅ | ❌ |
| 评论任务 | ✅ | ✅ | ✅ | ✅ |
| 查看项目 | ✅ | ✅ | ✅ | ✅ |

## 10. 实现优先级

### Phase 1: 基础协作（MVP）
1. 数据库 schema 扩展
2. 团队 CRUD API
3. 项目 CRUD API
4. 基础 UI 组件
5. 团队空间页面

### Phase 2: 任务管理
1. 任务 CRUD API
2. 任务嵌套结构
3. 任务看板视图
4. 任务详情面板
5. 任务评论功能

### Phase 3: 高级功能
1. 里程碑管理
2. 权限细化控制
3. 通知系统
4. 搜索与筛选
5. 数据导出

## 11. 风险与应对

### 风险 1: 数据一致性
- **描述**: 多用户同时编辑可能导致数据冲突
- **应对**: 
  - 使用乐观锁机制
  - 实现冲突检测与提示
  - 记录操作日志

### 风险 2: 性能瓶颈
- **描述**: SQLite 在高并发下性能有限
- **应对**:
  - 合理使用索引
  - 分页加载数据
  - 考虑后续迁移到 PostgreSQL

### 风险 3: 用户体验碎片化
- **描述**: 新增协作功能可能破坏 BlockOS 原有体验
- **应对**:
  - 保持与现有 UI 风格一致
  - 协作功能作为可选扩展
  - 保持 BlockOS 核心体验不变

## 12. 测试策略

### 12.1 单元测试
- API 路由测试
- 数据模型验证
- 工具函数测试

### 12.2 集成测试
- 用户认证流程
- CRUD 操作流程
- 权限控制验证

### 12.3 E2E 测试
- 完整的协作流程
- 多用户交互场景
- 边界情况处理
