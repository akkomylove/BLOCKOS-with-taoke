# BlockOS 协作模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 BlockOS 项目中实现团队协作模块，包括团队管理、项目管理、任务管理（支持嵌套）和基础评论功能。

**Architecture:** 扩展现有 sql.js 数据库 schema，新增 API 路由实现 CRUD 功能，创建 React 组件库，并使用 Zustand 管理协作状态。保持与现有 BlockOS UI 风格一致。

**Tech Stack:** Next.js 15, TypeScript, sql.js, Zustand, Tailwind CSS, lucide-react

---

## Phase 1: 数据库扩展

### Task 1: 扩展数据库 Schema

**Files:**
- Modify: `src/lib/db.ts:34-71` (initSchema 函数)

- [ ] **Step 1: 添加团队相关表**

在 `initSchema` 函数中添加以下 SQL：

```typescript
database.run(`
  -- 团队表
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 团队成员表
  CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (team_id, user_id)
  );

  -- 项目表
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 项目成员表
  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, user_id)
  );

  -- 里程碑表
  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    due_date INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );

  -- 任务表
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id TEXT,
    due_date INTEGER,
    dod TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 任务评论表
  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
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
`);
```

- [ ] **Step 2: 添加类型定义**

Create: `src/types/collaboration.ts`

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Project {
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

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate?: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  dueDate?: number;
  dod?: string;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  mentions: string[];
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 3: 运行构建验证**

Run: `npm run build`
Expected: 无错误

---

## Phase 2: 团队管理 API

### Task 2: 实现团队 CRUD API

**Files:**
- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[id]/route.ts`
- Create: `src/app/api/teams/[id]/members/route.ts`

- [ ] **Step 1: 创建团队列表和创建 API**

Create: `src/app/api/teams/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getDb();

    const teams = query(`
      SELECT t.*, tm.role as myRole
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
    `, [session.userId]);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, avatar } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    await getDb();

    const id = nanoid();
    const now = Date.now();

    run(`
      INSERT INTO teams (id, name, description, avatar, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, name.trim(), description || null, avatar || null, session.userId, now, now]);

    run(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', ?)
    `, [id, session.userId, now]);

    saveDb();

    const team = query('SELECT * FROM teams WHERE id = ?', [id])[0];

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建团队详情、更新和删除 API**

Create: `src/app/api/teams/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const membership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const team = query('SELECT * FROM teams WHERE id = ?', [id]);

    if (team.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const members = query(`
      SELECT tm.*, u.name, u.email, u.avatar
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `, [id]);

    return NextResponse.json({
      team: team[0],
      members,
      myRole: membership[0].role
    });
  } catch (error) {
    console.error('GET /api/teams/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, avatar } = body;

    await getDb();

    const membership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDb();

    const team = query('SELECT * FROM teams WHERE id = ?', [id]);

    return NextResponse.json({ team: team[0] });
  } catch (error) {
    console.error('PATCH /api/teams/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const team = query('SELECT * FROM teams WHERE id = ?', [id]);

    if (team.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team[0].owner_id !== session.userId) {
      return NextResponse.json({ error: 'Only owner can delete team' }, { status: 403 });
    }

    run('DELETE FROM teams WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teams/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 创建团队成员管理 API**

Create: `src/app/api/teams/[id]/members/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const currentRole = membership[0].role as string;
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const user = query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, user[0].id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    run(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `, [id, user[0].id, role, Date.now()]);

    saveDb();

    const member = query(`
      SELECT tm.*, u.name, u.email, u.avatar
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ? AND tm.user_id = ?
    `, [id, user[0].id]);

    return NextResponse.json({ member: member[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teams/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0 || membership[0].role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can update member roles' }, { status: 403 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const targetMembership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, userId]
    );

    if (targetMembership.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    run('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?', [role, id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/teams/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const currentRole = membership[0].role as string;

    const targetMembership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [id, userId]
    );

    if (targetMembership.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMembership[0].role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 });
    }

    if (userId !== session.userId && currentRole !== 'owner' && currentRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teams/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: 测试 API**

Run: `npm run dev` and test with curl:
```bash
curl -X GET http://localhost:3000/api/teams
```
Expected: 返回 401 (未授权) 或团队列表

---

## Phase 3: 项目管理 API

### Task 3: 实现项目 CRUD API

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Create: `src/app/api/projects/[id]/members/route.ts`

- [ ] **Step 1: 创建项目列表和创建 API**

Create: `src/app/api/projects/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    await getDb();

    let projects;
    if (teamId) {
      projects = query(`
        SELECT p.*, pm.role as myRole
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE p.team_id = ? AND pm.user_id = ?
        ORDER BY p.created_at DESC
      `, [teamId, session.userId]);
    } else {
      projects = query(`
        SELECT p.*, pm.role as myRole, t.name as teamName
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        JOIN teams t ON p.team_id = t.id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
      `, [session.userId]);
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, name, description, icon, color } = body;

    if (!teamId || !name || name.trim().length === 0) {
      return NextResponse.json({ error: 'teamId and name are required' }, { status: 400 });
    }

    await getDb();

    const teamMembership = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, session.userId]
    );

    if (teamMembership.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const id = nanoid();
    const now = Date.now();

    run(`
      INSERT INTO projects (id, team_id, name, description, icon, color, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, teamId, name.trim(), description || null, icon || null, color || null, session.userId, now, now]);

    run(`
      INSERT INTO project_members (project_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', ?)
    `, [id, session.userId, now]);

    saveDb();

    const project = query('SELECT * FROM projects WHERE id = ?', [id]);

    return NextResponse.json({ project: project[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建项目详情、更新和删除 API**

Create: `src/app/api/projects/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const project = query('SELECT * FROM projects WHERE id = ?', [id]);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const members = query(`
      SELECT pm.*, u.name, u.email, u.avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [id]);

    const milestones = query(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC',
      [id]
    );

    return NextResponse.json({
      project: project[0],
      members,
      milestones,
      myRole: membership[0].role
    });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, icon, color } = body;

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDb();

    const project = query('SELECT * FROM projects WHERE id = ?', [id]);

    return NextResponse.json({ project: project[0] });
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const project = query('SELECT * FROM projects WHERE id = ?', [id]);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0 || membership[0].role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can delete project' }, { status: 403 });
    }

    run('DELETE FROM projects WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 创建项目成员管理 API**

Create: `src/app/api/projects/[id]/members/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const currentRole = membership[0].role as string;
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const project = query('SELECT team_id FROM projects WHERE id = ?', [id]);
    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const teamMember = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [project[0].team_id, session.userId]
    );

    if (teamMember.length === 0) {
      return NextResponse.json({ error: 'Must be a team member to invite' }, { status: 403 });
    }

    const user = query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamUserCheck = query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [project[0].team_id, user[0].id]
    );

    if (teamUserCheck.length === 0) {
      return NextResponse.json({ error: 'User must be a team member first' }, { status: 400 });
    }

    const existing = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, user[0].id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User is already a project member' }, { status: 400 });
    }

    run(`
      INSERT INTO project_members (project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `, [id, user[0].id, role, Date.now()]);

    saveDb();

    const member = query(`
      SELECT pm.*, u.name, u.email, u.avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `, [id, user[0].id]);

    return NextResponse.json({ member: member[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0 || membership[0].role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can update member roles' }, { status: 403 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const targetMembership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (targetMembership.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    run('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/projects/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const currentRole = membership[0].role as string;

    const targetMembership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (targetMembership.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMembership[0].role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 });
    }

    if (userId !== session.userId && currentRole !== 'owner' && currentRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [id, userId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## Phase 4: 任务管理 API

### Task 4: 实现任务 CRUD API

**Files:**
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`
- Create: `src/app/api/tasks/[id]/comments/route.ts`

- [ ] **Step 1: 创建任务列表和创建 API**

Create: `src/app/api/tasks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');
    const parentId = searchParams.get('parentId');

    await getDb();

    if (!projectId && !assigneeId) {
      return NextResponse.json({ error: 'projectId or assigneeId is required' }, { status: 400 });
    }

    let sql = `
      SELECT t.*, u.name as assigneeName, u.avatar as assigneeAvatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (projectId) {
      sql += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (assigneeId) {
      sql += ' AND t.assignee_id = ?';
      params.push(assigneeId);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (parentId === 'null') {
      sql += ' AND t.parent_id IS NULL';
    } else if (parentId) {
      sql += ' AND t.parent_id = ?';
      params.push(parentId);
    }

    sql += ' ORDER BY t.order_index ASC, t.created_at DESC';

    const tasks = query(sql, params);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      projectId,
      parentId,
      title,
      description,
      status = 'todo',
      priority = 'medium',
      assigneeId,
      dueDate,
      dod
    } = body;

    if (!projectId || !title || title.trim().length === 0) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    await getDb();

    const projectMembership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (projectMembership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = projectMembership[0].role as string;
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Viewers cannot create tasks' }, { status: 403 });
    }

    if (parentId) {
      const parentTask = query('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [parentId, projectId]);
      if (parentTask.length === 0) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
    }

    if (assigneeId) {
      const assigneeMembership = query(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, assigneeId]
      );
      if (assigneeMembership.length === 0) {
        return NextResponse.json({ error: 'Assignee is not a project member' }, { status: 400 });
      }
    }

    const maxOrder = query(
      'SELECT MAX(order_index) as maxOrder FROM tasks WHERE project_id = ? AND parent_id IS ?',
      [projectId, parentId || null]
    );
    const orderIndex = (maxOrder[0]?.maxOrder || 0) + 1;

    const id = nanoid();
    const now = Date.now();

    run(`
      INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, due_date, dod, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      projectId,
      parentId || null,
      title.trim(),
      description || null,
      status,
      priority,
      assigneeId || null,
      dueDate || null,
      dod || null,
      orderIndex,
      now,
      now
    ]);

    saveDb();

    const task = query(`
      SELECT t.*, u.name as assigneeName, u.avatar as assigneeAvatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [id]);

    return NextResponse.json({ task: task[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建任务详情、更新和删除 API**

Create: `src/app/api/tasks/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const task = query(`
      SELECT t.*, u.name as assigneeName, u.avatar as assigneeAvatar,
             p.name as projectName, p.team_id
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `, [id]);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const projectId = task[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const children = query(
      'SELECT * FROM tasks WHERE parent_id = ? ORDER BY order_index ASC',
      [id]
    );

    const comments = query(`
      SELECT tc.*, u.name, u.avatar
      FROM task_comments tc
      JOIN users u ON tc.author_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [id]);

    return NextResponse.json({
      task: task[0],
      children,
      comments,
      myRole: membership[0].role
    });
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, status, priority, assigneeId, dueDate, dod, orderIndex } = body;

    await getDb();

    const task = query('SELECT * FROM tasks WHERE id = ?', [id]);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const projectId = task[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Viewers cannot update tasks' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (assigneeId !== undefined) {
      if (assigneeId) {
        const assigneeMembership = query(
          'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
          [projectId, assigneeId]
        );
        if (assigneeMembership.length === 0) {
          return NextResponse.json({ error: 'Assignee is not a project member' }, { status: 400 });
        }
      }
      updates.push('assignee_id = ?');
      values.push(assigneeId || null);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(dueDate || null);
    }
    if (dod !== undefined) {
      updates.push('dod = ?');
      values.push(dod);
    }
    if (orderIndex !== undefined) {
      updates.push('order_index = ?');
      values.push(orderIndex);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDb();

    const updatedTask = query(`
      SELECT t.*, u.name as assigneeName, u.avatar as assigneeAvatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [id]);

    return NextResponse.json({ task: updatedTask[0] });
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const task = query('SELECT * FROM tasks WHERE id = ?', [id]);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const projectId = task[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only admin or owner can delete tasks' }, { status: 403 });
    }

    run('DELETE FROM tasks WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 创建任务评论 API**

Create: `src/app/api/tasks/[id]/comments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const task = query('SELECT * FROM tasks WHERE id = ?', [id]);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const projectId = task[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const comments = query(`
      SELECT tc.*, u.name, u.avatar
      FROM task_comments tc
      JOIN users u ON tc.author_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [id]);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('GET /api/tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content, mentions = [] } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await getDb();

    const task = query('SELECT * FROM tasks WHERE id = ?', [id]);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const projectId = task[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const id = nanoid();
    const now = Date.now();

    run(`
      INSERT INTO task_comments (id, task_id, author_id, content, mentions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, id, session.userId, content.trim(), JSON.stringify(mentions), now, now]);

    saveDb();

    const comment = query(`
      SELECT tc.*, u.name, u.avatar
      FROM task_comments tc
      JOIN users u ON tc.author_id = u.id
      WHERE tc.id = ?
    `, [id]);

    return NextResponse.json({ comment: comment[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## Phase 5: 里程碑 API

### Task 5: 实现里程碑 API

**Files:**
- Create: `src/app/api/milestones/route.ts`
- Create: `src/app/api/milestones/[id]/route.ts`

- [ ] **Step 1: 创建里程碑列表和创建 API**

Create: `src/app/api/milestones/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const milestones = query(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC',
      [projectId]
    );

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('GET /api/milestones error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, description, dueDate } = body;

    if (!projectId || !name || name.trim().length === 0) {
      return NextResponse.json({ error: 'projectId and name are required' }, { status: 400 });
    }

    await getDb();

    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only admin or owner can create milestones' }, { status: 403 });
    }

    const id = nanoid();
    const now = Date.now();

    run(`
      INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `, [id, projectId, name.trim(), description || null, dueDate || null, now]);

    saveDb();

    const milestone = query('SELECT * FROM milestones WHERE id = ?', [id]);

    return NextResponse.json({ milestone: milestone[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/milestones error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建里程碑更新和删除 API**

Create: `src/app/api/milestones/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, query, run, saveDb } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, dueDate, status } = body;

    await getDb();

    const milestone = query('SELECT * FROM milestones WHERE id = ?', [id]);

    if (milestone.length === 0) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const projectId = milestone[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only admin or owner can update milestones' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(dueDate || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);

    run(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDb();

    const updatedMilestone = query('SELECT * FROM milestones WHERE id = ?', [id]);

    return NextResponse.json({ milestone: updatedMilestone[0] });
  } catch (error) {
    console.error('PATCH /api/milestones/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const milestone = query('SELECT * FROM milestones WHERE id = ?', [id]);

    if (milestone.length === 0) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const projectId = milestone[0].project_id;
    const membership = query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, session.userId]
    );

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const role = membership[0].role as string;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only admin or owner can delete milestones' }, { status: 403 });
    }

    run('DELETE FROM milestones WHERE id = ?', [id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/milestones/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## Phase 6: 状态管理

### Task 6: 创建 Zustand Store

**Files:**
- Create: `src/store/collaborationStore.ts`

- [ ] **Step 1: 创建协作状态 Store**

Create: `src/store/collaborationStore.ts`

```typescript
import { create } from 'zustand';
import type { Team, Project, Task, Milestone, TaskComment, TeamMember, ProjectMember } from '@/types/collaboration';

interface CollaborationState {
  teams: Team[];
  currentTeam: Team | null;
  currentTeamMembers: TeamMember[];

  projects: Project[];
  currentProject: Project | null;
  currentProjectMembers: ProjectMember[];

  tasks: Task[];
  currentTask: Task | null;
  currentTaskComments: TaskComment[];
  currentTaskChildren: Task[];

  milestones: Milestone[];

  isLoading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  createTeam: (data: { name: string; description?: string }) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;

  fetchTeamMembers: (teamId: string) => Promise<void>;
  addTeamMember: (teamId: string, email: string, role?: string) => Promise<void>;
  removeTeamMember: (teamId: string, userId: string) => Promise<void>;
  updateTeamMemberRole: (teamId: string, userId: string, role: string) => Promise<void>;

  fetchProjects: (teamId?: string) => Promise<void>;
  createProject: (data: { teamId: string; name: string; description?: string; icon?: string; color?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  fetchProjectMembers: (projectId: string) => Promise<void>;
  addProjectMember: (projectId: string, email: string, role?: string) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;

  fetchTasks: (params: { projectId?: string; assigneeId?: string; status?: string; parentId?: string }) => Promise<void>;
  createTask: (data: Partial<Task> & { projectId: string; title: string }) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setCurrentTask: (task: Task | null) => void;

  fetchTaskComments: (taskId: string) => Promise<void>;
  createTaskComment: (taskId: string, content: string, mentions?: string[]) => Promise<void>;

  fetchMilestones: (projectId: string) => Promise<void>;
  createMilestone: (data: Partial<Milestone> & { projectId: string; name: string }) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  teams: [],
  currentTeam: null,
  currentTeamMembers: [],

  projects: [],
  currentProject: null,
  currentProjectMembers: [],

  tasks: [],
  currentTask: null,
  currentTaskComments: [],
  currentTaskChildren: [],

  milestones: [],

  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ teams: data.teams, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTeam: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const teams = [...get().teams, result.team];
      set({ teams, currentTeam: result.team, isLoading: false });
      return result.team;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTeam: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const teams = get().teams.map(t => t.id === id ? result.team : t);
      set({ teams, currentTeam: result.team, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteTeam: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const teams = get().teams.filter(t => t.id !== id);
      set({ teams, currentTeam: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentTeam: (team) => {
    set({ currentTeam: team });
  },

  fetchTeamMembers: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ currentTeamMembers: data.members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTeamMember: async (teamId, email, role = 'member') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const members = [...get().currentTeamMembers, result.member];
      set({ currentTeamMembers: members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeTeamMember: async (teamId, userId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${teamId}/members?userId=${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const members = get().currentTeamMembers.filter(m => m.userId !== userId);
      set({ currentTeamMembers: members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTeamMemberRole: async (teamId, userId, role) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await get().fetchTeamMembers(teamId);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchProjects: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const url = teamId ? `/api/projects?teamId=${teamId}` : '/api/projects';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ projects: data.projects, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const projects = [...get().projects, result.project];
      set({ projects, currentProject: result.project, isLoading: false });
      return result.project;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const projects = get().projects.map(p => p.id === id ? result.project : p);
      set({ projects, currentProject: result.project, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const projects = get().projects.filter(p => p.id !== id);
      set({ projects, currentProject: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  fetchProjectMembers: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ currentProjectMembers: data.members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addProjectMember: async (projectId, email, role = 'member') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const members = [...get().currentProjectMembers, result.member];
      set({ currentProjectMembers: members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeProjectMember: async (projectId, userId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const members = get().currentProjectMembers.filter(m => m.userId !== userId);
      set({ currentProjectMembers: members, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchTasks: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const searchParams = new URLSearchParams();
      if (params.projectId) searchParams.append('projectId', params.projectId);
      if (params.assigneeId) searchParams.append('assigneeId', params.assigneeId);
      if (params.status) searchParams.append('status', params.status);
      if (params.parentId !== undefined) searchParams.append('parentId', params.parentId || 'null');

      const res = await fetch(`/api/tasks?${searchParams.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ tasks: data.tasks, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const tasks = [...get().tasks, result.task];
      set({ tasks, currentTask: result.task, isLoading: false });
      return result.task;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTask: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const tasks = get().tasks.map(t => t.id === id ? result.task : t);
      set({ tasks, currentTask: result.task, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const tasks = get().tasks.filter(t => t.id !== id);
      set({ tasks, currentTask: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentTask: (task) => {
    set({ currentTask: task });
  },

  fetchTaskComments: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({
        currentTaskComments: data.comments,
        currentTaskChildren: data.children,
        isLoading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTaskComment: async (taskId, content, mentions = []) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mentions }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const comments = [...get().currentTaskComments, result.comment];
      set({ currentTaskComments: comments, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchMilestones: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/milestones?projectId=${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ milestones: data.milestones, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createMilestone: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const milestones = [...get().milestones, result.milestone];
      set({ milestones, isLoading: false });
      return result.milestone;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateMilestone: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const milestones = get().milestones.map(m => m.id === id ? result.milestone : m);
      set({ milestones, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteMilestone: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const milestones = get().milestones.filter(m => m.id !== id);
      set({ milestones, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
```

---

## Phase 7: UI 组件

### Task 7: 创建基础 UI 组件

**Files:**
- Create: `src/components/collaboration/TeamList.tsx`
- Create: `src/components/collaboration/TeamCard.tsx`
- Create: `src/components/collaboration/CreateTeamModal.tsx`

- [ ] **Step 1: 创建团队列表组件**

Create: `src/components/collaboration/TeamList.tsx`

```typescript
'use client';

import { useCollaborationStore } from '@/store/collaborationStore';
import { TeamCard } from './TeamCard';
import { Plus } from 'lucide-react';
import { CreateTeamModal } from './CreateTeamModal';
import { useState } from 'react';

export function TeamList() {
  const { teams, fetchTeams, isLoading } = useCollaborationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useState(() => {
    fetchTeams();
  });

  if (isLoading && teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">我的团队</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          创建团队
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>还没有团队，创建一个开始吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建团队卡片组件**

Create: `src/components/collaboration/TeamCard.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Team } from '@/types/collaboration';
import { Users, Settings, Trash2 } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const router = useRouter();
  const { deleteTeam } = useCollaborationStore();

  const handleClick = () => {
    router.push(`/teams/${team.id}`);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/teams/${team.id}/settings`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个团队吗？')) {
      await deleteTeam(team.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg p-6 cursor-pointer transition-all border border-[#2a2a2a] hover:border-[#3a3a3a] group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {team.avatar ? (
            <img src={team.avatar} alt={team.name} className="w-12 h-12 rounded-lg" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {team.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{team.name}</h3>
            {team.description && (
              <p className="text-sm text-gray-400 line-clamp-2">{team.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleSettings}
            className="p-2 hover:bg-[#3a3a3a] rounded-lg transition-colors"
            title="设置"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Users size={16} />
        <span>团队成员</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建团队 Modal 组件**

Create: `src/components/collaboration/CreateTeamModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface CreateTeamModalProps {
  onClose: () => void;
}

export function CreateTeamModal({ onClose }: CreateTeamModalProps) {
  const { createTeam, isLoading } = useCollaborationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    try {
      await createTeam({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">创建团队</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              团队名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入团队名称"
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入团队描述（可选）"
              rows={3}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Task 8: 创建项目管理组件

**Files:**
- Create: `src/components/collaboration/ProjectList.tsx`
- Create: `src/components/collaboration/ProjectCard.tsx`
- Create: `src/components/collaboration/CreateProjectModal.tsx`
- Create: `src/components/collaboration/ProjectBoard.tsx`

- [ ] **Step 1: 创建项目列表和卡片组件**

Create: `src/components/collaboration/ProjectList.tsx`

```typescript
'use client';

import { useCollaborationStore } from '@/store/collaborationStore';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { useState } from 'react';
import { Plus } from 'lucide-react';

interface ProjectListProps {
  teamId: string;
}

export function ProjectList({ teamId }: ProjectListProps) {
  const { projects, fetchProjects, isLoading } = useCollaborationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useState(() => {
    fetchProjects(teamId);
  });

  const teamProjects = projects.filter(p => p.teamId === teamId);

  if (isLoading && teamProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">项目</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          创建项目
        </button>
      </div>

      {teamProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>还没有项目，创建一个开始吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          teamId={teamId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
```

Create: `src/components/collaboration/ProjectCard.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Project } from '@/types/collaboration';
import { Folder, ArrowRight } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const { deleteProject } = useCollaborationStore();

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？')) {
      await deleteProject(project.id);
    }
  };

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  const colorClass = colorClasses[project.color || 'blue'] || colorClasses.blue;

  return (
    <div
      onClick={handleClick}
      className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg p-6 cursor-pointer transition-all border border-[#2a2a2a] hover:border-[#3a3a3a] group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
            {project.icon ? (
              <span className="text-2xl">{project.icon}</span>
            ) : (
              <Folder size={24} className="text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="删除"
        >
          <span className="text-red-400 text-sm">删除</span>
        </button>
      </div>

      <div className="flex items-center justify-end text-blue-400 group-hover:text-blue-300 transition-colors">
        <span className="text-sm">打开项目</span>
        <ArrowRight size={16} className="ml-1" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建项目 Modal 和看板组件**

Create: `src/components/collaboration/CreateProjectModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface CreateProjectModalProps {
  teamId: string;
  onClose: () => void;
}

const COLORS = [
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'purple', label: '紫色' },
  { value: 'orange', label: '橙色' },
  { value: 'red', label: '红色' },
];

export function CreateProjectModal({ teamId, onClose }: CreateProjectModalProps) {
  const { createProject, isLoading } = useCollaborationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('项目名称不能为空');
      return;
    }

    try {
      await createProject({ teamId, name: name.trim(), description: description.trim(), color });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">创建项目</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              项目名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入项目描述（可选）"
              rows={3}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              颜色
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-lg bg-${c.value}-500 hover:ring-2 ring-white transition-all ${
                    color === c.value ? 'ring-2 ring-white' : ''
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Create: `src/components/collaboration/ProjectBoard.tsx`

```typescript
'use client';

import { useCollaborationStore } from '@/store/collaborationStore';
import { TaskCard } from './TaskCard';
import { CreateTaskModal } from './CreateTaskModal';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface ProjectBoardProps {
  projectId: string;
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const { tasks, fetchTasks, isLoading } = useCollaborationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  useEffect(() => {
    fetchTasks({ projectId });
  }, [projectId, fetchTasks]);

  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const rootTasks = projectTasks.filter(t => !t.parentId);

  const filteredTasks = filter === 'all'
    ? rootTasks
    : rootTasks.filter(t => t.status === filter);

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  if (isLoading && projectTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            >
              {f === 'all' ? '全部' : f === 'todo' ? '待办' : f === 'in_progress' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          创建任务
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">待办</h3>
            <span className="text-sm text-gray-400">{tasksByStatus.todo.length}</span>
          </div>
          <div className="space-y-3">
            {tasksByStatus.todo.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">进行中</h3>
            <span className="text-sm text-gray-400">{tasksByStatus.in_progress.length}</span>
          </div>
          <div className="space-y-3">
            {tasksByStatus.in_progress.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">已完成</h3>
            <span className="text-sm text-gray-400">{tasksByStatus.done.length}</span>
          </div>
          <div className="space-y-3">
            {tasksByStatus.done.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
```

### Task 9: 创建任务管理组件

**Files:**
- Create: `src/components/collaboration/TaskCard.tsx`
- Create: `src/components/collaboration/CreateTaskModal.tsx`
- Create: `src/components/collaboration/TaskDetail.tsx`

- [ ] **Step 1: 创建任务卡片组件**

Create: `src/components/collaboration/TaskCard.tsx`

```typescript
'use client';

import { Task } from '@/types/collaboration';
import { User, Calendar, Flag } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useState } from 'react';
import { TaskDetail } from './TaskDetail';

interface TaskCardProps {
  task: Task;
}

const priorityColors = {
  low: 'bg-gray-600',
  medium: 'bg-blue-600',
  high: 'bg-orange-600',
  urgent: 'bg-red-600',
};

export function TaskCard({ task }: TaskCardProps) {
  const { updateTask } = useCollaborationStore();
  const [showDetail, setShowDetail] = useState(false);

  const handleStatusChange = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    await updateTask(task.id, { status: nextStatus });
  };

  const statusLabels = {
    todo: '待办',
    in_progress: '进行中',
    done: '已完成',
  };

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg p-4 cursor-pointer transition-all border border-[#2a2a2a] hover:border-[#3a3a3a]"
      >
        <div className="flex items-start gap-3">
          <button
            onClick={handleStatusChange}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              task.status === 'done'
                ? 'bg-green-600 border-green-600'
                : task.status === 'in_progress'
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-500 hover:border-gray-400'
            }`}
          >
            {task.status === 'done' && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`text-white font-medium mb-2 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
              {task.title}
            </h4>

            {task.description && (
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Flag size={14} className={`text-${task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'orange' : 'gray'}-400`} />
                <span>{task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : task.priority === 'high' ? '高' : '紧急'}</span>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(task.dueDate).toLocaleDateString('zh-CN')}</span>
                </div>
              )}

              {task.assigneeName && (
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{task.assigneeName}</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                task.status === 'done'
                  ? 'bg-green-900/30 text-green-400'
                  : task.status === 'in_progress'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'bg-gray-900/30 text-gray-400'
              }`}>
                {statusLabels[task.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <TaskDetail task={task} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
```

- [ ] **Step 2: 创建任务 Modal 和详情组件**

Create: `src/components/collaboration/CreateTaskModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface CreateTaskModalProps {
  projectId: string;
  parentId?: string;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export function CreateTaskModal({ projectId, parentId, onClose }: CreateTaskModalProps) {
  const { createTask, isLoading } = useCollaborationStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dod, setDod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('任务标题不能为空');
      return;
    }

    try {
      await createTask({
        projectId,
        parentId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        dod: dod.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {parentId ? '创建子任务' : '创建任务'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              任务标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题"
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入任务描述（可选）"
              rows={3}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              优先级
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    priority === p.value
                      ? p.value === 'urgent'
                        ? 'bg-red-600 text-white'
                        : p.value === 'high'
                        ? 'bg-orange-600 text-white'
                        : p.value === 'medium'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              截止日期
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              完成定义 (DOD)
            </label>
            <textarea
              value={dod}
              onChange={(e) => setDod(e.target.value)}
              placeholder="定义任务完成的标准（可选）"
              rows={2}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Create: `src/components/collaboration/TaskDetail.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { X, User, Calendar, Flag, MessageSquare } from 'lucide-react';
import { Task, TaskComment } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

const PRIORITIES = {
  low: { label: '低', color: 'text-gray-400' },
  medium: { label: '中', color: 'text-blue-400' },
  high: { label: '高', color: 'text-orange-400' },
  urgent: { label: '紧急', color: 'text-red-400' },
};

const STATUSES = {
  todo: { label: '待办', color: 'bg-gray-900/30 text-gray-400' },
  in_progress: { label: '进行中', color: 'bg-blue-900/30 text-blue-400' },
  done: { label: '已完成', color: 'bg-green-900/30 text-green-400' },
};

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const {
    currentTaskComments,
    currentTaskChildren,
    fetchTaskComments,
    updateTask,
    deleteTask,
    createTaskComment,
    isLoading
  } = useCollaborationStore();

  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'subtasks'>('comments');

  useEffect(() => {
    fetchTaskComments(task.id);
  }, [task.id, fetchTaskComments]);

  const handleStatusChange = async (status: 'todo' | 'in_progress' | 'done') => {
    await updateTask(task.id, { status });
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    await updateTask(task.id, { priority });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await createTaskComment(task.id, newComment.trim());
    setNewComment('');
  };

  const handleDelete = async () => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 className="text-xl font-bold text-white">任务详情</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-2xl font-bold text-white mb-4">{task.title}</h3>

          {task.description && (
            <p className="text-gray-300 mb-6">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">状态</label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className={`w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white ${STATUSES[task.status].color}`}
              >
                {Object.entries(STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">优先级</label>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as any)}
                className={`w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white ${PRIORITIES[task.priority].color}`}
              >
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {task.dueDate && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  <Calendar size={14} className="inline mr-1" />
                  截止日期
                </label>
                <div className="text-white">
                  {new Date(task.dueDate).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            )}

            {task.assigneeName && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  <User size={14} className="inline mr-1" />
                  负责人
                </label>
                <div className="text-white">{task.assigneeName}</div>
              </div>
            )}
          </div>

          {task.dod && (
            <div className="mb-6 p-4 bg-[#2a2a2a] rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">完成定义 (DOD)</h4>
              <p className="text-white">{task.dod}</p>
            </div>
          )}

          <div className="border-t border-[#2a2a2a] pt-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                }`}
              >
                <MessageSquare size={16} className="inline mr-2" />
                评论 ({currentTaskComments.length})
              </button>
              <button
                onClick={() => setActiveTab('subtasks')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'subtasks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                }`}
              >
                子任务 ({currentTaskChildren.length})
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {currentTaskComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                      {comment.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{comment.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="添加评论..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                  >
                    发送
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'subtasks' && (
              <div className="space-y-3">
                {currentTaskChildren.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">暂无子任务</p>
                ) : (
                  currentTaskChildren.map((child) => (
                    <div key={child.id} className="p-3 bg-[#2a2a2a] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 ${
                          child.status === 'done'
                            ? 'bg-green-600 border-green-600'
                            : 'border-gray-500'
                        }`} />
                        <span className={child.status === 'done' ? 'line-through text-gray-400' : 'text-white'}>
                          {child.title}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-[#2a2a2a]">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
          >
            删除任务
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Task 10: 创建组件导出文件

**Files:**
- Create: `src/components/collaboration/index.ts`

- [ ] **Step 1: 创建组件导出文件**

Create: `src/components/collaboration/index.ts`

```typescript
export { TeamList } from './TeamList';
export { TeamCard } from './TeamCard';
export { CreateTeamModal } from './CreateTeamModal';

export { ProjectList } from './ProjectList';
export { ProjectCard } from './ProjectCard';
export { CreateProjectModal } from './CreateProjectModal';
export { ProjectBoard } from './ProjectBoard';

export { TaskCard } from './TaskCard';
export { CreateTaskModal } from './CreateTaskModal';
export { TaskDetail } from './TaskDetail';
```

---

## Phase 8: 页面路由

### Task 11: 创建团队页面

**Files:**
- Create: `src/app/teams/page.tsx`
- Create: `src/app/teams/[teamId]/page.tsx`

- [ ] **Step 1: 创建团队列表和详情页面**

Create: `src/app/teams/page.tsx`

```typescript
import { TeamList } from '@/components/collaboration';

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TeamList />
      </div>
    </div>
  );
}
```

Create: `src/app/teams/[teamId]/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useCollaborationStore } from '@/store/collaborationStore';
import { ProjectList } from '@/components/collaboration';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { currentTeam, fetchTeams, fetchTeamMembers, currentTeamMembers } = useCollaborationStore();

  useEffect(() => {
    fetchTeams();
    fetchTeamMembers(teamId);
  }, [teamId, fetchTeams, fetchTeamMembers]);

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/teams"
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            返回团队列表
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentTeam.avatar ? (
                <img src={currentTeam.avatar} alt={currentTeam.name} className="w-16 h-16 rounded-lg" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
                  {currentTeam.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-2">{currentTeam.name}</h1>
                {currentTeam.description && (
                  <p className="text-gray-400">{currentTeam.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Users size={20} />
                <span>{currentTeamMembers.length} 名成员</span>
              </div>
              <Link
                href={`/teams/${teamId}/members`}
                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
              >
                管理成员
              </Link>
            </div>
          </div>
        </div>

        <ProjectList teamId={teamId} />
      </div>
    </div>
  );
}
```

### Task 12: 创建项目页面

**Files:**
- Create: `src/app/projects/[projectId]/page.tsx`

- [ ] **Step 1: 创建项目看板页面**

Create: `src/app/projects/[projectId]/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useCollaborationStore } from '@/store/collaborationStore';
import { ProjectBoard } from '@/components/collaboration';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Folder, Calendar } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { currentProject, fetchProjects, milestones, fetchMilestones } = useCollaborationStore();

  useEffect(() => {
    fetchProjects();
    fetchMilestones(projectId);
  }, [projectId, fetchProjects, fetchMilestones]);

  useEffect(() => {
    if (currentProject) {
      fetchMilestones(projectId);
    }
  }, [currentProject, projectId, fetchMilestones]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  const colorClass = colorClasses[currentProject.color || 'blue'] || colorClasses.blue;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href={`/teams/${currentProject.teamId}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            返回团队
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
              {currentProject.icon ? (
                <span className="text-3xl">{currentProject.icon}</span>
              ) : (
                <Folder size={32} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentProject.name}</h1>
              {currentProject.description && (
                <p className="text-gray-400">{currentProject.description}</p>
              )}
            </div>
          </div>

          {milestones.length > 0 && (
            <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar size={20} />
                里程碑
              </h3>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                    <div>
                      <span className="font-medium">{milestone.name}</span>
                      {milestone.description && (
                        <p className="text-sm text-gray-400">{milestone.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {milestone.dueDate && (
                        <span className="text-sm text-gray-400">
                          {new Date(milestone.dueDate).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${
                        milestone.status === 'completed'
                          ? 'bg-green-900/30 text-green-400'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-gray-900/30 text-gray-400'
                      }`}>
                        {milestone.status === 'completed' ? '已完成' : milestone.status === 'in_progress' ? '进行中' : '待开始'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ProjectBoard projectId={projectId} />
      </div>
    </div>
  );
}
```

---

## Phase 9: 构建和测试

### Task 13: 运行构建测试

**Files:**
- None

- [ ] **Step 1: 运行 Next.js 构建**

Run: `npm run build`
Expected: 无错误

- [ ] **Step 2: 检查 TypeScript 类型**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 检查 ESLint**

Run: `npm run lint`
Expected: 无错误或警告

---

## 总结

本实现计划包含了以下阶段：

1. **Phase 1**: 数据库扩展 - 添加团队、项目、任务等表
2. **Phase 2**: 团队管理 API - CRUD 和成员管理
3. **Phase 3**: 项目管理 API - CRUD 和成员管理
4. **Phase 4**: 任务管理 API - CRUD 和嵌套支持
5. **Phase 5**: 里程碑 API - CRUD 操作
6. **Phase 6**: Zustand 状态管理 - 统一的 Store
7. **Phase 7**: UI 组件 - React 组件库
8. **Phase 8**: 页面路由 - Next.js 页面
9. **Phase 9**: 构建测试 - 验证代码质量

预计完成时间：5-7 小时
优先级：Phase 1-4 (API) → Phase 6 (Store) → Phase 7-8 (UI) → Phase 5 (里程碑) → Phase 9 (测试)
