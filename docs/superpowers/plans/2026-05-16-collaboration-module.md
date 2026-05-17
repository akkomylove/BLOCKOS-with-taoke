# BlockOS 协作模块实现计划

&gt; **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 BlockOS 添加团队协作功能，包括团队管理、项目管理、任务拆解与协作沟通。

**Architecture:** 在现有 BlockOS 架构基础上扩展数据库 schema、新增 API 路由、新增 UI 组件和状态管理。

**Tech Stack:** Next.js 15+、sql.js SQLite、Zustand、NextAuth、Tailwind CSS、Lucide React

---

## 文件结构映射

| 操作 | 文件路径 | 用途 |
|-----|---------|------|
| 修改 | `src/lib/db.ts` | 扩展数据库 schema |
| 新增 | `src/types/collaboration.ts` | 协作模块类型定义 |
| 新增 | `src/store/collaborationStore.ts` | 协作状态管理 |
| 新增 | `src/app/api/teams/route.ts` | 团队 API |
| 新增 | `src/app/api/teams/[teamId]/route.ts` | 单个团队 API |
| 新增 | `src/app/api/teams/[teamId]/members/route.ts` | 团队成员 API |
| 新增 | `src/app/api/projects/route.ts` | 项目 API |
| 新增 | `src/app/api/tasks/route.ts` | 任务 API |
| 新增 | `src/components/collaboration/TeamPanel.tsx` | 团队面板组件 |
| 新增 | `src/components/collaboration/ProjectPanel.tsx` | 项目面板组件 |
| 新增 | `src/components/collaboration/TaskBoard.tsx` | 任务看板组件 |
| 修改 | `src/components/Sidebar.tsx` | 侧边栏添加协作入口 |

---

## 任务分解

### Task 1: 扩展数据库 Schema

**Files:**
- Modify: `src/lib/db.ts:34-70`

- [ ] **Step 1: 扩展 db.ts 的 initSchema 函数**

修改 `initSchema` 函数，添加协作相关表：

```typescript
function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '无标题',
      icon TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      meta TEXT NOT NULL DEFAULT '{}',
      parent_id TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_pages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      dod TEXT,
      assignee_id TEXT REFERENCES users(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      due_date INTEGER,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
    CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
    CREATE INDEX IF NOT EXISTS idx_project_pages_project ON project_pages(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
  `);
}
```

- [ ] **Step 2: 验证修改后可以编译**

Run: `npm run build`
Expected: 无编译错误

- [ ] **Step 3: 提交更改**

```bash
git add src/lib/db.ts
git commit -m "feat: extend db schema for collaboration"
```

---

### Task 2: 创建协作模块类型定义

**Files:**
- Create: `src/types/collaboration.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dod?: string;
  assigneeId?: string;
  createdBy: string;
  dueDate?: number;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: number;
  createdAt: number;
}

export interface TeamWithMembers extends Team {
  members: Array&lt;{
    userId: string;
    userName?: string;
    userAvatar?: string;
    role: string;
  }&gt;;
}

export interface ProjectWithDetails extends Project {
  tasks: Task[];
  pages: Array&lt;{ id: string; title: string }&gt;;
}
```

- [ ] **Step 2: 验证类型定义无错误**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/types/collaboration.ts
git commit -m "feat: add collaboration type definitions"
```

---

### Task 3: 创建协作状态管理 Store

**Files:**
- Create: `src/store/collaborationStore.ts`

- [ ] **Step 1: 创建 Zustand store 文件**

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Team, Project, Task, TeamWithMembers, ProjectWithDetails } from '@/types/collaboration';

interface CollaborationState {
  currentTeamId: string | null;
  currentProjectId: string | null;
  teams: Team[];
  projects: Project[];
  tasks: Record&lt;string, Task[]&gt;;
  currentTeam: TeamWithMembers | null;
  currentProject: ProjectWithDetails | null;
  isLoading: boolean;

  setCurrentTeamId: (teamId: string | null) =&gt; void;
  setCurrentProjectId: (projectId: string | null) =&gt; void;
  setTeams: (teams: Team[]) =&gt; void;
  setProjects: (projects: Project[]) =&gt; void;
  setTasks: (projectId: string, tasks: Task[]) =&gt; void;
  setCurrentTeam: (team: TeamWithMembers | null) =&gt; void;
  setCurrentProject: (project: ProjectWithDetails | null) =&gt; void;
  setIsLoading: (loading: boolean) =&gt; void;

  addTeam: (team: Team) =&gt; void;
  updateTeam: (teamId: string, updates: Partial&lt;Team&gt;) =&gt; void;
  deleteTeam: (teamId: string) =&gt; void;

  addProject: (project: Project) =&gt; void;
  updateProject: (projectId: string, updates: Partial&lt;Project&gt;) =&gt; void;
  deleteProject: (projectId: string) =&gt; void;

  addTask: (task: Task) =&gt; void;
  updateTask: (taskId: string, updates: Partial&lt;Task&gt;) =&gt; void;
  deleteTask: (taskId: string) =&gt; void;
}

export const useCollaborationStore = create&lt;CollaborationState&gt;()(
  immer((set) =&gt; ({
    currentTeamId: null,
    currentProjectId: null,
    teams: [],
    projects: [],
    tasks: {},
    currentTeam: null,
    currentProject: null,
    isLoading: false,

    setCurrentTeamId: (teamId) =&gt;
      set((state) =&gt; {
        state.currentTeamId = teamId;
      }),

    setCurrentProjectId: (projectId) =&gt;
      set((state) =&gt; {
        state.currentProjectId = projectId;
      }),

    setTeams: (teams) =&gt;
      set((state) =&gt; {
        state.teams = teams;
      }),

    setProjects: (projects) =&gt;
      set((state) =&gt; {
        state.projects = projects;
      }),

    setTasks: (projectId, tasks) =&gt;
      set((state) =&gt; {
        state.tasks[projectId] = tasks;
      }),

    setCurrentTeam: (team) =&gt;
      set((state) =&gt; {
        state.currentTeam = team;
      }),

    setCurrentProject: (project) =&gt;
      set((state) =&gt; {
        state.currentProject = project;
      }),

    setIsLoading: (loading) =&gt;
      set((state) =&gt; {
        state.isLoading = loading;
      }),

    addTeam: (team) =&gt;
      set((state) =&gt; {
        state.teams.push(team);
      }),

    updateTeam: (teamId, updates) =&gt;
      set((state) =&gt; {
        const index = state.teams.findIndex((t) =&gt; t.id === teamId);
        if (index !== -1) {
          state.teams[index] = { ...state.teams[index], ...updates };
        }
      }),

    deleteTeam: (teamId) =&gt;
      set((state) =&gt; {
        state.teams = state.teams.filter((t) =&gt; t.id !== teamId);
      }),

    addProject: (project) =&gt;
      set((state) =&gt; {
        state.projects.push(project);
      }),

    updateProject: (projectId, updates) =&gt;
      set((state) =&gt; {
        const index = state.projects.findIndex((p) =&gt; p.id === projectId);
        if (index !== -1) {
          state.projects[index] = { ...state.projects[index], ...updates };
        }
      }),

    deleteProject: (projectId) =&gt;
      set((state) =&gt; {
        state.projects = state.projects.filter((p) =&gt; p.id !== projectId);
      }),

    addTask: (task) =&gt;
      set((state) =&gt; {
        if (!state.tasks[task.projectId]) {
          state.tasks[task.projectId] = [];
        }
        state.tasks[task.projectId].push(task);
      }),

    updateTask: (taskId, updates) =&gt;
      set((state) =&gt; {
        for (const projectId in state.tasks) {
          const index = state.tasks[projectId].findIndex((t) =&gt; t.id === taskId);
          if (index !== -1) {
            state.tasks[projectId][index] = { ...state.tasks[projectId][index], ...updates };
            break;
          }
        }
      }),

    deleteTask: (taskId) =&gt;
      set((state) =&gt; {
        for (const projectId in state.tasks) {
          state.tasks[projectId] = state.tasks[projectId].filter((t) =&gt; t.id !== taskId);
        }
      }),
  }))
);
```

- [ ] **Step 2: 验证类型和导入正确**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/store/collaborationStore.ts
git commit -m "feat: add collaboration zustand store"
```

---

### Task 4: 创建团队 API 路由

**Files:**
- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[teamId]/route.ts`
- Create: `src/app/api/teams/[teamId]/members/route.ts`

- [ ] **Step 1: 创建团队列表/创建 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  const userTeams = query(
    `SELECT t.* FROM teams t
     JOIN team_members tm ON t.id = tm.team_id
     WHERE tm.user_id = ?
     ORDER BY t.created_at DESC`,
    [session.userId]
  );

  const teams = userTeams.map((t) =&gt; ({
    id: t.id as string,
    name: t.name as string,
    description: t.description as string,
    ownerId: t.owner_id as string,
    createdAt: t.created_at as number,
    updatedAt: t.updated_at as number,
  }));

  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  await getDb();

  const teamId = nanoid();
  const now = Date.now();

  run(
    'INSERT INTO teams (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [teamId, name, description || null, session.userId, now, now]
  );

  const memberId = nanoid();
  run(
    'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
    [memberId, teamId, session.userId, 'owner', now]
  );

  saveDb();

  return NextResponse.json({
    id: teamId,
    name,
    description,
    ownerId: session.userId,
    createdAt: now,
    updatedAt: now,
  });
}
```

- [ ] **Step 2: 创建单个团队 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

interface RouteParams {
  params: Promise&lt;{ teamId: string }&gt;;
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const teamResult = query('SELECT * FROM teams WHERE id = ?', [teamId]);
  if (teamResult.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membersResult = query(
    `SELECT tm.*, u.name as user_name, u.avatar as user_avatar
     FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     WHERE tm.team_id = ?`,
    [teamId]
  );

  const team = teamResult[0];
  const members = membersResult.map((m) =&gt; ({
    userId: m.user_id as string,
    userName: m.user_name as string,
    userAvatar: m.user_avatar as string,
    role: m.role as string,
  }));

  return NextResponse.json({
    id: team.id,
    name: team.name,
    description: team.description,
    ownerId: team.owner_id,
    createdAt: team.created_at,
    updatedAt: team.updated_at,
    members,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description } = await request.json();

  await getDb();

  const team = query('SELECT * FROM teams WHERE id = ?', [teamId]);
  if (team.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (team[0].owner_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = Date.now();
  run(
    'UPDATE teams SET name = ?, description = ?, updated_at = ? WHERE id = ?',
    [name || team[0].name, description ?? team[0].description, now, teamId]
  );

  saveDb();

  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  const team = query('SELECT * FROM teams WHERE id = ?', [teamId]);
  if (team.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (team[0].owner_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  run('DELETE FROM teams WHERE id = ?', [teamId]);
  saveDb();

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 创建团队成员 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

interface RouteParams {
  params: Promise&lt;{ teamId: string }&gt;;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, role = 'member' } = await request.json();

  await getDb();

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, session.userId]
  );

  if (membership.length === 0 || (membership[0].role !== 'owner' &amp;&amp; membership[0].role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = query('SELECT * FROM users WHERE id = ?', [userId]);
  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existing = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );

  if (existing.length &gt; 0) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const memberId = nanoid();
  run(
    'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
    [memberId, teamId, userId, role, Date.now()]
  );

  saveDb();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await request.json();

  await getDb();

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (userId !== session.userId &amp;&amp; membership[0].role !== 'owner' &amp;&amp; membership[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
  saveDb();

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: 验证 API 路由可以编译**

Run: `npm run build`
Expected: 无编译错误

- [ ] **Step 5: 提交更改**

```bash
git add src/app/api/teams/
git commit -m "feat: add team API routes"
```

---

### Task 5: 创建项目和任务 API 路由

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/tasks/route.ts`

- [ ] **Step 1: 创建项目 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
  }

  await getDb();

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projectsResult = query(
    'SELECT * FROM projects WHERE team_id = ? ORDER BY created_at DESC',
    [teamId]
  );

  const projects = projectsResult.map((p) =&gt; ({
    id: p.id as string,
    teamId: p.team_id as string,
    name: p.name as string,
    description: p.description as string,
    createdBy: p.created_by as string,
    createdAt: p.created_at as number,
    updatedAt: p.updated_at as number,
  }));

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { teamId, name, description } = await request.json();

  if (!teamId || !name) {
    return NextResponse.json({ error: 'Team ID and name required' }, { status: 400 });
  }

  await getDb();

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projectId = nanoid();
  const now = Date.now();

  run(
    'INSERT INTO projects (id, team_id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [projectId, teamId, name, description || null, session.userId, now, now]
  );

  saveDb();

  return NextResponse.json({
    id: projectId,
    teamId,
    name,
    description,
    createdBy: session.userId,
    createdAt: now,
    updatedAt: now,
  });
}
```

- [ ] **Step 2: 创建任务 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  await getDb();

  const project = query('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (project.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [project[0].team_id, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tasksResult = query(
    'SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index ASC, created_at ASC',
    [projectId]
  );

  const tasks = tasksResult.map((t) =&gt; ({
    id: t.id as string,
    projectId: t.project_id as string,
    parentId: t.parent_id as string,
    title: t.title as string,
    description: t.description as string,
    status: t.status as string,
    priority: t.priority as string,
    dod: t.dod as string,
    assigneeId: t.assignee_id as string,
    createdBy: t.created_by as string,
    dueDate: t.due_date as number,
    orderIndex: t.order_index as number,
    createdAt: t.created_at as number,
    updatedAt: t.updated_at as number,
  }));

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, title, description, parentId, status = 'todo', priority = 'medium', dod, assigneeId, dueDate } = await request.json();

  if (!projectId || !title) {
    return NextResponse.json({ error: 'Project ID and title required' }, { status: 400 });
  }

  await getDb();

  const project = query('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (project.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [project[0].team_id, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const maxOrder = query(
    'SELECT MAX(order_index) as max_order FROM tasks WHERE project_id = ?',
    [projectId]
  );
  const orderIndex = ((maxOrder[0].max_order as number) || 0) + 1;

  const taskId = nanoid();
  const now = Date.now();

  run(
    'INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, dod, assignee_id, created_by, due_date, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [taskId, projectId, parentId || null, title, description || null, status, priority, dod || null, assigneeId || null, session.userId, dueDate || null, orderIndex, now, now]
  );

  saveDb();

  return NextResponse.json({
    id: taskId,
    projectId,
    parentId,
    title,
    description,
    status,
    priority,
    dod,
    assigneeId,
    createdBy: session.userId,
    dueDate,
    orderIndex,
    createdAt: now,
    updatedAt: now,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId, ...updates } = await request.json();

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  }

  await getDb();

  const task = query('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (task.length === 0) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const project = query('SELECT * FROM projects WHERE id = ?', [task[0].project_id]);
  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [project[0].team_id, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = Date.now();
  const updateFields: string[] = [];
  const updateValues: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(updates.description);
  }
  if (updates.status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(updates.status);
  }
  if (updates.priority !== undefined) {
    updateFields.push('priority = ?');
    updateValues.push(updates.priority);
  }
  if (updates.dod !== undefined) {
    updateFields.push('dod = ?');
    updateValues.push(updates.dod);
  }
  if (updates.assigneeId !== undefined) {
    updateFields.push('assignee_id = ?');
    updateValues.push(updates.assigneeId);
  }
  if (updates.dueDate !== undefined) {
    updateFields.push('due_date = ?');
    updateValues.push(updates.dueDate);
  }
  if (updates.orderIndex !== undefined) {
    updateFields.push('order_index = ?');
    updateValues.push(updates.orderIndex);
  }

  if (updateFields.length &gt; 0) {
    updateFields.push('updated_at = ?');
    updateValues.push(now, taskId);

    run(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
    saveDb();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  }

  await getDb();

  const task = query('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (task.length === 0) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const project = query('SELECT * FROM projects WHERE id = ?', [task[0].project_id]);
  const membership = query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [project[0].team_id, session.userId]
  );

  if (membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  run('DELETE FROM tasks WHERE id = ?', [taskId]);
  saveDb();

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 验证 API 路由可以编译**

Run: `npm run build`
Expected: 无编译错误

- [ ] **Step 4: 提交更改**

```bash
git add src/app/api/projects/ src/app/api/tasks/
git commit -m "feat: add project and task API routes"
```

---

### Task 6: 创建团队面板组件

**Files:**
- Create: `src/components/collaboration/TeamPanel.tsx`

- [ ] **Step 1: 创建团队面板组件**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Settings, Trash2 } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import type { Team } from '@/types/collaboration';

export function TeamPanel() {
  const {
    teams,
    currentTeamId,
    setCurrentTeamId,
    setTeams,
    addTeam,
    setIsLoading,
  } = useCollaborationStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  useEffect(() =&gt; {
    loadTeams();
  }, []);

  async function loadTeams() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
        }),
      });

      if (res.ok) {
        const team = await res.json();
        addTeam(team);
        setNewTeamName('');
        setNewTeamDescription('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  }

  return (
    &lt;div className="h-full flex flex-col bg-[#1a1a1a] border-r border-[#2a2a2a]"&gt;
      &lt;div className="p-4 border-b border-[#2a2a2a]"&gt;
        &lt;div className="flex items-center justify-between"&gt;
          &lt;h2 className="text-lg font-semibold text-white flex items-center gap-2"&gt;
            &lt;Users className="w-5 h-5" /&gt;
            团队
          &lt;/h2&gt;
          &lt;button
            onClick={() =&gt; setShowCreateModal(true)}
            className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
          &gt;
            &lt;Plus className="w-5 h-5 text-gray-400" /&gt;
          &lt;/button&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="flex-1 overflow-y-auto p-2"&gt;
        {teams.map((team) =&gt; (
          &lt;button
            key={team.id}
            onClick={() =&gt; setCurrentTeamId(team.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              currentTeamId === team.id
                ? 'bg-blue-600/20 border border-blue-500/30'
                : 'hover:bg-[#2a2a2a]'
            }`}
          &gt;
            &lt;div className="text-white font-medium truncate"&gt;{team.name}&lt;/div&gt;
            {team.description &amp;&amp; (
              &lt;div className="text-gray-400 text-sm truncate"&gt;{team.description}&lt;/div&gt;
            )}
          &lt;/button&gt;
        ))}
        {teams.length === 0 &amp;&amp; (
          &lt;div className="text-center text-gray-500 py-8"&gt;
            暂无团队，点击 + 创建
          &lt;/div&gt;
        )}
      &lt;/div&gt;

      {showCreateModal &amp;&amp; (
        &lt;div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"&gt;
          &lt;div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-96"&gt;
            &lt;h3 className="text-lg font-semibold text-white mb-4"&gt;创建团队&lt;/h3&gt;
            &lt;input
              type="text"
              value={newTeamName}
              onChange={(e) =&gt; setNewTeamName(e.target.value)}
              placeholder="团队名称"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-blue-500"
            /&gt;
            &lt;textarea
              value={newTeamDescription}
              onChange={(e) =&gt; setNewTeamDescription(e.target.value)}
              placeholder="团队描述（可选）"
              rows={3}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-blue-500 resize-none"
            /&gt;
            &lt;div className="flex justify-end gap-2"&gt;
              &lt;button
                onClick={() =&gt; setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              &gt;
                取消
              &lt;/button&gt;
              &lt;button
                onClick={handleCreateTeam}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              &gt;
                创建
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}
    &lt;/div&gt;
  );
}
```

- [ ] **Step 2: 验证组件无类型错误**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/components/collaboration/TeamPanel.tsx
git commit -m "feat: add team panel component"
```

---

### Task 7: 创建项目面板组件

**Files:**
- Create: `src/components/collaboration/ProjectPanel.tsx`

- [ ] **Step 1: 创建项目面板组件**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderKanban, ChevronRight } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

export function ProjectPanel() {
  const {
    currentTeamId,
    projects,
    currentProjectId,
    setCurrentProjectId,
    setProjects,
    addProject,
    setIsLoading,
  } = useCollaborationStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  useEffect(() =&gt; {
    if (currentTeamId) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [currentTeamId]);

  async function loadProjects() {
    if (!currentTeamId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects?teamId=${currentTeamId}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim() || !currentTeamId) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeamId,
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        addProject(project);
        setNewProjectName('');
        setNewProjectDescription('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }

  if (!currentTeamId) {
    return (
      &lt;div className="h-full flex items-center justify-center text-gray-500"&gt;
        请选择一个团队
      &lt;/div&gt;
    );
  }

  return (
    &lt;div className="h-full flex flex-col bg-[#0f0f0f]"&gt;
      &lt;div className="p-4 border-b border-[#2a2a2a]"&gt;
        &lt;div className="flex items-center justify-between"&gt;
          &lt;h2 className="text-lg font-semibold text-white flex items-center gap-2"&gt;
            &lt;FolderKanban className="w-5 h-5" /&gt;
            项目
          &lt;/h2&gt;
          &lt;button
            onClick={() =&gt; setShowCreateModal(true)}
            className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
          &gt;
            &lt;Plus className="w-5 h-5 text-gray-400" /&gt;
          &lt;/button&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="flex-1 overflow-y-auto p-2"&gt;
        {projects.map((project) =&gt; (
          &lt;button
            key={project.id}
            onClick={() =&gt; setCurrentProjectId(project.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2 ${
              currentProjectId === project.id
                ? 'bg-blue-600/20 border border-blue-500/30'
                : 'hover:bg-[#1a1a1a]'
            }`}
          &gt;
            &lt;ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${
              currentProjectId === project.id ? 'rotate-90' : ''
            }`} /&gt;
            &lt;div className="flex-1"&gt;
              &lt;div className="text-white font-medium truncate"&gt;{project.name}&lt;/div&gt;
              {project.description &amp;&amp; (
                &lt;div className="text-gray-400 text-sm truncate"&gt;{project.description}&lt;/div&gt;
              )}
            &lt;/div&gt;
          &lt;/button&gt;
        ))}
        {projects.length === 0 &amp;&amp; (
          &lt;div className="text-center text-gray-500 py-8"&gt;
            暂无项目，点击 + 创建
          &lt;/div&gt;
        )}
      &lt;/div&gt;

      {showCreateModal &amp;&amp; (
        &lt;div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"&gt;
          &lt;div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-96"&gt;
            &lt;h3 className="text-lg font-semibold text-white mb-4"&gt;创建项目&lt;/h3&gt;
            &lt;input
              type="text"
              value={newProjectName}
              onChange={(e) =&gt; setNewProjectName(e.target.value)}
              placeholder="项目名称"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-blue-500"
            /&gt;
            &lt;textarea
              value={newProjectDescription}
              onChange={(e) =&gt; setNewProjectDescription(e.target.value)}
              placeholder="项目描述（可选）"
              rows={3}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-blue-500 resize-none"
            /&gt;
            &lt;div className="flex justify-end gap-2"&gt;
              &lt;button
                onClick={() =&gt; setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              &gt;
                取消
              &lt;/button&gt;
              &lt;button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              &gt;
                创建
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}
    &lt;/div&gt;
  );
}
```

- [ ] **Step 2: 验证组件无类型错误**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/components/collaboration/ProjectPanel.tsx
git commit -m "feat: add project panel component"
```

---

### Task 8: 创建任务看板组件

**Files:**
- Create: `src/components/collaboration/TaskBoard.tsx`

- [ ] **Step 1: 创建任务看板组件**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import type { Task } from '@/types/collaboration';

export function TaskBoard() {
  const {
    currentProjectId,
    tasks,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    setIsLoading,
  } = useCollaborationStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDod, setNewTaskDod] = useState('');
  const [selectedParentId, setSelectedParentId] = useState&lt;string | undefined&gt;();

  const projectTasks = currentProjectId ? (tasks[currentProjectId] || []) : [];

  const todoTasks = projectTasks.filter((t) =&gt; t.status === 'todo' &amp;&amp; !t.parentId);
  const inProgressTasks = projectTasks.filter((t) =&gt; t.status === 'in-progress' &amp;&amp; !t.parentId);
  const doneTasks = projectTasks.filter((t) =&gt; t.status === 'done' &amp;&amp; !t.parentId);

  useEffect(() =&gt; {
    if (currentProjectId) {
      loadTasks();
    }
  }, [currentProjectId]);

  async function loadTasks() {
    if (!currentProjectId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks?projectId=${currentProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(currentProjectId, data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !currentProjectId) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          title: newTaskTitle,
          description: newTaskDescription,
          dod: newTaskDod,
          parentId: selectedParentId,
        }),
      });

      if (res.ok) {
        const task = await res.json();
        addTask(task);
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskDod('');
        setSelectedParentId(undefined);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  async function handleUpdateStatus(taskId: string, status: Task['status']) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });

      if (res.ok) {
        updateTask(taskId, { status });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const res = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        deleteTask(taskId);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  const getSubtasks = (parentId: string) =&gt;
    projectTasks.filter((t) =&gt; t.parentId === parentId);

  if (!currentProjectId) {
    return (
      &lt;div className="h-full flex items-center justify-center text-gray-500"&gt;
        请选择一个项目
      &lt;/div&gt;
    );
  }

  function TaskCard({ task, level = 0 }: { task: Task; level?: number }) {
    const subtasks = getSubtasks(task.id);
    const [showSubtasks, setShowSubtasks] = useState(true);

    const priorityColors = {
      low: 'text-green-400',
      medium: 'text-yellow-400',
      high: 'text-red-400',
    };

    const priorityIcons = {
      low: &lt;Circle className="w-4 h-4" /&gt;,
      medium: &lt;Clock className="w-4 h-4" /&gt;,
      high: &lt;AlertCircle className="w-4 h-4" /&gt;,
    };

    return (
      &lt;div className="mb-2" style={{ marginLeft: `${level * 16}px` }}&gt;
        &lt;div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3a3a3a] transition-colors"&gt;
          &lt;div className="flex items-start gap-2"&gt;
            &lt;button
              onClick={() =&gt; handleUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
              className="mt-0.5 flex-shrink-0"
            &gt;
              {task.status === 'done' ? (
                &lt;CheckCircle2 className="w-5 h-5 text-green-500" /&gt;
              ) : (
                &lt;Circle className="w-5 h-5 text-gray-500 hover:text-gray-300" /&gt;
              )}
            &lt;/button&gt;

            &lt;div className="flex-1 min-w-0"&gt;
              &lt;div className="flex items-center gap-2"&gt;
                &lt;span className={`${priorityColors[task.priority]}`}&gt;
                  {priorityIcons[task.priority]}
                &lt;/span&gt;
                &lt;span className={`font-medium ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}&gt;
                  {task.title}
                &lt;/span&gt;
              &lt;/div&gt;

              {task.description &amp;&amp; (
                &lt;p className="text-gray-400 text-sm mt-1"&gt;{task.description}&lt;/p&gt;
              )}

              {task.dod &amp;&amp; (
                &lt;div className="mt-2 p-2 bg-[#0f0f0f] rounded text-xs"&gt;
                  &lt;span className="text-gray-500"&gt;完成标准: &lt;/span&gt;
                  &lt;span className="text-gray-300"&gt;{task.dod}&lt;/span&gt;
                &lt;/div&gt;
              )}
            &lt;/div&gt;

            &lt;div className="flex items-center gap-1"&gt;
              {subtasks.length &gt; 0 &amp;&amp; (
                &lt;button
                  onClick={() =&gt; setShowSubtasks(!showSubtasks)}
                  className="p-1 hover:bg-[#2a2a2a] rounded"
                &gt;
                  &lt;ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showSubtasks ? 'rotate-90' : ''
                    }`}
                  /&gt;
                &lt;/button&gt;
              )}
              &lt;button
                onClick={() =&gt; handleDeleteTask(task.id)}
                className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded"
              &gt;
                &lt;Trash2 className="w-4 h-4" /&gt;
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        {showSubtasks &amp;&amp; subtasks.map((subtask) =&gt; (
          &lt;TaskCard key={subtask.id} task={subtask} level={level + 1} /&gt;
        ))}
      &lt;/div&gt;
    );
  }

  function Column({ title, tasks: columnTasks, status }: { title: string; tasks: Task[]; status: Task['status'] }) {
    return (
      &lt;div className="flex-1 min-w-0 flex flex-col"&gt;
        &lt;div className="p-3 border-b border-[#2a2a2a]"&gt;
          &lt;h3 className="font-semibold text-white flex items-center gap-2"&gt;
            {title}
            &lt;span className="text-gray-500 text-sm"&gt;({columnTasks.length})&lt;/span&gt;
          &lt;/h3&gt;
        &lt;/div&gt;
        &lt;div className="flex-1 overflow-y-auto p-3"&gt;
          {columnTasks.map((task) =&gt; (
            &lt;TaskCard key={task.id} task={task} /&gt;
          ))}
        &lt;/div&gt;
      &lt;/div&gt;
    );
  }

  return (
    &lt;div className="h-full flex flex-col bg-[#0f0f0f]"&gt;
      &lt;div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between"&gt;
        &lt;h2 className="text-lg font-semibold text-white"&gt;任务看板&lt;/h2&gt;
        &lt;button
          onClick={() =&gt; setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        &gt;
          &lt;Plus className="w-4 h-4" /&gt;
          新建任务
        &lt;/button&gt;
      &lt;/div&gt;

      &lt;div className="flex-1 flex overflow-hidden"&gt;
        &lt;div className="flex-1 border-r border-[#2a2a2a]"&gt;
          &lt;Column title="待办" tasks={todoTasks} status="todo" /&gt;
        &lt;/div&gt;
        &lt;div className="flex-1 border-r border-[#2a2a2a]"&gt;
          &lt;Column title="进行中" tasks={inProgressTasks} status="in-progress" /&gt;
        &lt;/div&gt;
        &lt;div className="flex-1"&gt;
          &lt;Column title="已完成" tasks={doneTasks} status="done" /&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      {showCreateModal &amp;&amp; (
        &lt;div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"&gt;
          &lt;div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-[500px]"&gt;
            &lt;h3 className="text-lg font-semibold text-white mb-4"&gt;新建任务&lt;/h3&gt;

            &lt;input
              type="text"
              value={newTaskTitle}
              onChange={(e) =&gt; setNewTaskTitle(e.target.value)}
              placeholder="任务标题"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-blue-500"
            /&gt;

            &lt;textarea
              value={newTaskDescription}
              onChange={(e) =&gt; setNewTaskDescription(e.target.value)}
              placeholder="任务描述（可选）"
              rows={3}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-blue-500 resize-none"
            /&gt;

            &lt;textarea
              value={newTaskDod}
              onChange={(e) =&gt; setNewTaskDod(e.target.value)}
              placeholder="完成标准（DoD）（可选）"
              rows={2}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-blue-500 resize-none"
            /&gt;

            &lt;select
              value={selectedParentId || ''}
              onChange={(e) =&gt; setSelectedParentId(e.target.value || undefined)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-blue-500"
            &gt;
              &lt;option value=""&gt;顶级任务&lt;/option&gt;
              {projectTasks.filter((t) =&gt; !t.parentId).map((t) =&gt; (
                &lt;option key={t.id} value={t.id}&gt;
                  子任务 of: {t.title}
                &lt;/option&gt;
              ))}
            &lt;/select&gt;

            &lt;div className="flex justify-end gap-2"&gt;
              &lt;button
                onClick={() =&gt; setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              &gt;
