# 协作版块改造 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构协作版块：AI自动切分任务到看板、团队成员管理、项目AI导入审查、甘特图、个人中心。

**Architecture:** 基于现有 sql.js + Zustand + Next.js App Router 架构扩展。新增 user_profiles 表存储用户职能，新建 GanttChart/ProfilePanel 等组件，AI 分析通过现有 SiliconFlow API 调用，分步确认模式保证用户可控。

**Tech Stack:** Next.js 15.5 + TypeScript + Tailwind CSS + Zustand/immer + sql.js + SiliconFlow (Qwen3-8B) + react-gantt-timeline or custom SVG

**已确认的设计决策：**
1. 计划书导入：Markdown 文件上传
2. 角色+职能并存：owner/admin/member（权限）+ 职能标签（展示/分配）
3. 甘特图：项目页内 Button Tab 切换（看板 | 甘特图），不用快捷键
4. AI 分析：分步确认（预览→确认→写入）
5. 个人信息：只读展示 + 职能编辑（无云端服务器，本地 SQLite）

---

## 文件结构

```
# 新建文件
src/components/collaboration/TeamDetailPanel.tsx      # 团队详情面板（成员列表+管理）
src/components/collaboration/MemberManager.tsx        # 成员添加/删除/职能编辑 UI
src/components/collaboration/GanttChart.tsx           # 甘特图组件（SVG自制）
src/components/collaboration/ProjectImportModal.tsx   # AI 导入计划书弹窗（上传MD+预览+确认）
src/components/collaboration/AIAnalysisPreview.tsx    # AI分析结果预览（任务/审查/工作流）
src/components/collaboration/ProfilePanel.tsx         # 个人中心右侧滑出面板
src/components/collaboration/UserTaskOverview.tsx     # 个人中心-各项目任务总览

# 新建API路由
src/app/api/user/profile/route.ts                     # GET/PATCH 用户个人信息
src/app/api/projects/[id]/ai-analyze/route.ts         # POST AI分析项目计划书
src/app/api/projects/[id]/ai-import/route.ts          # POST AI分析结果写入看板
src/app/api/user/tasks/route.ts                       # GET 用户在各项目中的任务

# 修改文件
src/lib/db.ts                                         # 新增 user_profiles 表
src/types/collaboration.ts                            # 新增 UserProfile、UserTaskSummary 类型
src/store/collaborationStore.ts                       # 新增 user profile、AI 分析相关方法
src/app/teams/[teamId]/page.tsx                       # 团队详情页改为面板视图
src/app/projects/[projectId]/page.tsx                 # 项目页加甘特图Tab
src/components/collaboration/TeamCard.tsx             # 团队卡片加成员数显示
src/components/TaskCard.tsx                           # 任务卡片加负责人头像
src/components/ProjectBoard.tsx                       # 看板加AI导入入口按钮
src/middleware.ts                                     # 无需修改
```

---

## 分期规划（6期，按优先级）

| 期次 | 模块 | 工作量 |
|------|------|--------|
| 1 | 数据模型扩展（user_profiles + API） | 小 |
| 2 | 团队详情改造（成员列表+添加/删除+职能） | 中 |
| 3 | AI 计划书导入（上传→分析→预览→确认→写入） | 大 |
| 4 | 甘特图（SVG自制+可拖拽+Tab切换） | 大 |
| 5 | 个人中心（右侧面板+任务总览+职能编辑） | 中 |
| 6 | 润色集成（入口按钮、UI打磨、构建验证） | 小 |

---

## 第1期：数据模型扩展

### Task 1.1: 扩展类型定义

**Files:**
- Modify: `src/types/collaboration.ts`

- [ ] 在文件末尾新增以下类型：

```typescript
export interface UserProfile {
  userId: string;
  displayName?: string;
  title?: string;
  functions: string[];
  bio?: string;
  updatedAt: number;
}

export interface UserTaskSummary {
  projectId: string;
  projectName: string;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
}

export interface AIAnalysisResult {
  tasks: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    suggestedAssigneeFunction: string;
    subtasks?: { title: string; description: string }[];
    estimatedDays: number;
  }[];
  review: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    riskPoints: string[];
  };
  workflow: {
    phase: string;
    description: string;
    tasks: string[];
    assigneeFunction: string;
    order: number;
    estimatedDays: number;
  }[];
}
```

### Task 1.2: 新建 user_profiles 表

**Files:**
- Modify: `src/lib/db.ts`

- [ ] 在 `initDatabase` 函数的表创建部分（`teams` 表之前）新增：

```typescript
db.run(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    title TEXT,
    functions TEXT DEFAULT '[]',
    bio TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)`);
```

### Task 1.3: 新建用户 Profile API

**Files:**
- Create: `src/app/api/user/profile/route.ts`

- [ ] 创建 `GET` handler — 读取当前用户的 profile，无记录时返回默认值：

```typescript
import { getUserId } from '@/lib/auth-utils';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const row = db.queryOne(
    'SELECT user_id, display_name, title, functions, bio, updated_at FROM user_profiles WHERE user_id = ?',
    [userId]
  );

  if (!row) {
    return NextResponse.json({
      userId,
      displayName: '',
      title: '',
      functions: [],
      bio: '',
      updatedAt: 0,
    });
  }

  let functions: string[] = [];
  try { functions = JSON.parse(String(row.functions)); } catch {}

  return NextResponse.json({
    userId: row.user_id,
    displayName: String(row.display_name || ''),
    title: String(row.title || ''),
    functions,
    bio: String(row.bio || ''),
    updatedAt: Number(row.updated_at),
  });
}
```

- [ ] 创建 `PATCH` handler — 更新用户 profile，支持 upsert：

```typescript
export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { displayName, title, functions, bio } = body;
  const db = await getDb();

  const existing = db.queryOne('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);

  if (existing) {
    db.run(
      `UPDATE user_profiles SET display_name = ?, title = ?, functions = ?, bio = ?, updated_at = ? WHERE user_id = ?`,
      [displayName || null, title || null, JSON.stringify(functions || []), bio || null, Date.now(), userId]
    );
  } else {
    db.run(
      `INSERT INTO user_profiles (user_id, display_name, title, functions, bio, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, displayName || null, title || null, JSON.stringify(functions || []), bio || null, Date.now()]
    );
  }

  return NextResponse.json({ success: true });
}
```

### Task 1.4: 扩展 collaborationStore

**Files:**
- Modify: `src/store/collaborationStore.ts`

- [ ] 在 `CollaborationState` interface 中新增字段和方法：

```typescript
// 在 interface 中新增
userProfile: UserProfile | null;
fetchUserProfile: () => Promise<void>;
updateUserProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'title' | 'functions' | 'bio'>>) => Promise<void>;
userTasks: UserTaskSummary[];
fetchUserTasks: () => Promise<void>;
```

- [ ] 在 `initialState` 中新增：

```typescript
userProfile: null,
userTasks: [],
```

- [ ] 新增方法实现：

```typescript
fetchUserProfile: async () => {
  try {
    const res = await fetch('/api/user/profile');
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const data = await res.json();
    set((state) => {
      state.userProfile = data;
    });
  } catch (err) {
    console.error('fetchUserProfile error:', err);
  }
},

updateUserProfile: async (updates) => {
  const original = get().userProfile;
  set((state) => {
    if (state.userProfile) {
      Object.assign(state.userProfile, updates);
    }
  });
  try {
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update user profile');
  } catch (err) {
    if (original) {
      set((state) => { state.userProfile = original; });
    }
    throw err;
  }
},

fetchUserTasks: async () => {
  try {
    const res = await fetch('/api/user/tasks');
    if (!res.ok) throw new Error('Failed to fetch user tasks');
    const data = await res.json();
    set((state) => {
      state.userTasks = data.summaries || [];
    });
  } catch (err) {
    console.error('fetchUserTasks error:', err);
  }
},
```

---

## 第2期：团队详情改造

### Task 2.1: 新建 TeamDetailPanel 组件

**Files:**
- Create: `src/components/collaboration/TeamDetailPanel.tsx`

- [ ] 团队详情面板，接收 `teamId` prop，展示成员列表、每个成员的职能标签、添加/删除成员操作：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Settings, Shield, Crown } from 'lucide-react';
import type { TeamMember } from '@/types/collaboration';

interface MemberWithProfile {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'owner' | 'admin' | 'member';
  title?: string;
  functions: string[];
}

interface TeamDetailPanelProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
}

export function TeamDetailPanel({ teamId, teamName, onClose }: TeamDetailPanelProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  const roleLabels: Record<string, { color: string; icon: React.ReactNode }> = {
    owner: { color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20', icon: <Crown className="w-3 h-3" /> },
    admin: { color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', icon: <Shield className="w-3 h-3" /> },
    member: { color: 'text-gray-600 bg-gray-100 dark:text-zinc-400 dark:bg-zinc-700', icon: null },
  };

  useEffect(() => {
    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(data => {
        const membersWithProfiles = (data.members || []).map((m: Record<string, unknown>) => ({
          userId: m.user_id,
          userName: m.user_name || 'Unknown',
          userAvatar: m.user_avatar,
          role: m.role as 'owner' | 'admin' | 'member',
          title: (m as Record<string, string>).title || '',
          functions: typeof m.functions === 'string' ? JSON.parse(m.functions as string) : (m.functions || []),
        }));
        setMembers(membersWithProfiles);
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('确定要移除该成员吗？')) return;
    await fetch(`/api/teams/${teamId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">团队详情</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          团队成员 ({members.length})
        </h3>
        <button
          onClick={() => setShowAddMember(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          添加成员
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-20" />
                  <div className="h-2 bg-gray-100 dark:bg-zinc-600 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.userId} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {member.userAvatar ? (
                    <img src={member.userAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    member.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{member.userName}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${roleLabels[member.role].color}`}>
                      {roleLabels[member.role].icon}
                      {member.role === 'owner' ? '拥有者' : member.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  </div>
                  {member.title && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{member.title}</p>
                  )}
                  {member.functions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.functions.map(fn => (
                        <span key={fn} className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded text-xs">
                          {fn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Task 2.2: 改造团队页面路由

**Files:**
- Modify: `src/app/teams/[teamId]/page.tsx`

- [ ] 将原来的纯 ProjectList 改为包含 TeamDetailPanel 入口的新布局。核心改动：

1. 页面顶部显示团队名称 + "查看详情"按钮（打开 TeamDetailPanel）
2. 保持 ProjectList 展示该项目下的项目
3. 加一个 state 控制 TeamDetailPanel 的开关

```typescript
// 在页面顶部团队名称旁新增按钮
const [showDetail, setShowDetail] = useState(false);

// JSX中：
<button onClick={() => setShowDetail(true)} className="...">
  <Users className="w-4 h-4" />
  查看成员
</button>

// 底部渲染：
{showDetail && (
  <TeamDetailPanel
    teamId={teamId}
    teamName={teamName}
    onClose={() => setShowDetail(false)}
  />
)}
```

### Task 2.3: 更新团队 API 返回成员 profile 信息

**Files:**
- Modify: `src/app/api/teams/[id]/route.ts`

- [ ] 在 GET handler 的成员查询 SQL 中加入 `user_profiles` JOIN：

```typescript
// 原SQL大概是这样，改成：
const members = db.queryAll(`
  SELECT tm.user_id, u.name as user_name, u.avatar as user_avatar, tm.role,
         up.title, up.functions
  FROM team_members tm
  JOIN users u ON tm.user_id = u.id
  LEFT JOIN user_profiles up ON tm.user_id = up.user_id
  WHERE tm.team_id = ?
`, [teamId]);
```

---

## 第3期：AI 计划书导入

### Task 3.1: 新建 AI 分析 API

**Files:**
- Create: `src/app/api/projects/[id]/ai-analyze/route.ts`

- [ ] POST handler — 接收 Markdown 文本，调用 SiliconFlow AI 进行分析：

```typescript
import { getUserId } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { content } = await request.json();
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  const baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
  const model = process.env.AI_MODEL || 'Qwen/Qwen3-8B';

  const prompt = `你是一个项目管理专家。请分析以下项目计划书，并返回JSON格式的分析结果（只返回JSON，不要其他内容）。

项目计划书内容：
${content.slice(0, 8000)}

请返回以下JSON结构：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "priority": "low|medium|high|urgent",
      "suggestedAssigneeFunction": "建议的负责人职能（如：前端开发、后端开发、UI设计等）",
      "subtasks": [{ "title": "子任务标题", "description": "子任务描述" }],
      "estimatedDays": 预计天数(number)
    }
  ],
  "review": {
    "strengths": ["项目优势1", "项目优势2"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["改进建议1", "改进建议2"],
    "riskPoints": ["风险点1", "风险点2"]
  },
  "workflow": [
    {
      "phase": "阶段名称（如：需求分析、设计、开发、测试、部署）",
      "description": "阶段描述",
      "tasks": ["该阶段包含的任务标题"],
      "assigneeFunction": "负责人职能",
      "order": 阶段序号(number),
      "estimatedDays": 预计天数(number)
    }
  ]
}

注意：
1. 每个任务都要有合理的优先级和预估天数
2. workflow中的tasks应该是tasks数组中已列出的任务标题
3. 任务总数量控制在5-15个，子任务每个不超过5个
4. 阶段的order从1开始递增`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的项目管理助手，只返回JSON，不要任何额外解释。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `AI API error: ${err}` }, { status: 502 });
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content || '';

  let result;
  try {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
  } catch {
    return NextResponse.json({ error: 'AI返回格式错误，请重试', raw: aiContent }, { status: 422 });
  }

  return NextResponse.json({ analysis: result });
}
```

### Task 3.2: 新建 AI 导入写入 API

**Files:**
- Create: `src/app/api/projects/[id]/ai-import/route.ts`

- [ ] POST handler — 将确认后的 AI 分析结果写入数据库（创建 tasks + milestones）：

```typescript
import { getUserId } from '@/lib/auth-utils';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { tasks, workflow } = await request.json();
  const db = await getDb();
  const now = Date.now();

  const createdTaskIds: Record<string, string> = {};

  const insertTask = db.prepare(
    `INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, due_date, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'todo', ?, NULL, ?, ?, ?, ?)`
  );

  for (const task of tasks) {
    const taskId = nanoid();
    const dueDate = task.estimatedDays ? now + task.estimatedDays * 86400000 : null;
    insertTask.run([
      taskId, projectId, null, task.title, task.description || '',
      task.priority || 'medium', dueDate,
      tasks.indexOf(task), now, now,
    ]);
    createdTaskIds[task.title] = taskId;

    if (task.subtasks) {
      for (let i = 0; i < task.subtasks.length; i++) {
        const sub = task.subtasks[i];
        const subId = nanoid();
        insertTask.run([
          subId, projectId, taskId, sub.title, sub.description || '',
          'medium', null, i, now, now,
        ]);
      }
    }
  }

  // 创建里程碑对应 workflow phases
  if (workflow && workflow.length > 0) {
    const insertMilestone = db.prepare(
      `INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    );
    for (const phase of workflow) {
      const phaseDueDate = now + (phase.estimatedDays || 7) * 86400000;
      insertMilestone.run([
        nanoid(), projectId, phase.phase, phase.description || '',
        phaseDueDate, now,
      ]);
    }
  }

  return NextResponse.json({
    success: true,
    taskCount: tasks.length,
    milestoneCount: workflow?.length || 0,
  });
}
```

### Task 3.3: 新建 AIAnalysisPreview 组件

**Files:**
- Create: `src/components/collaboration/AIAnalysisPreview.tsx`

- [ ] 展示 AI 分析结果的三栏预览：任务列表、审查意见、工作流：

```typescript
'use client';

import { AIAnalysisResult } from '@/types/collaboration';
import { CheckCircle2, AlertTriangle, Lightbulb, ShieldAlert, ListTodo, GitBranch } from 'lucide-react';

interface Props {
  analysis: AIAnalysisResult;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function AIAnalysisPreview({ analysis, onConfirm, onCancel, loading }: Props) {
  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400',
    medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* 任务切分 */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <ListTodo className="w-4 h-4 text-blue-500" />
          任务切分 ({analysis.tasks.length} 个任务)
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {analysis.tasks.map((task, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{task.title}</span>
                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{task.description}</p>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-purple-500 dark:text-purple-400">@{task.suggestedAssigneeFunction}</span>
                <span className="text-xs text-gray-400">~{task.estimatedDays}天</span>
              </div>
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-1.5 pl-3 border-l-2 border-gray-200 dark:border-zinc-600 space-y-0.5">
                  {task.subtasks.map((sub, j) => (
                    <p key={j} className="text-xs text-gray-500 dark:text-zinc-400">└ {sub.title}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 项目审查 */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          项目审查
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">优势</span>
            </div>
            <ul className="space-y-1">
              {analysis.review.strengths.map((s, i) => (
                <li key={i} className="text-xs text-green-600 dark:text-green-500">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">不足</span>
            </div>
            <ul className="space-y-1">
              {analysis.review.weaknesses.map((s, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-500">• {s}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">改进建议</span>
            <ul className="mt-1 space-y-0.5">
              {analysis.review.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-blue-600 dark:text-blue-500">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">风险提示</span>
            </div>
            <ul className="space-y-0.5">
              {analysis.review.riskPoints.map((s, i) => (
                <li key={i} className="text-xs text-amber-600 dark:text-amber-500">• {s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 工作流 */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <GitBranch className="w-4 h-4 text-green-500" />
          工作流 (按阶段)
        </h3>
        <div className="space-y-2">
          {analysis.workflow.map((phase, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {phase.order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{phase.phase}</span>
                  <span className="text-xs text-purple-500 dark:text-purple-400">@{phase.assigneeFunction}</span>
                  <span className="text-xs text-gray-400">~{phase.estimatedDays}天</span>
                </div>
                {phase.description && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{phase.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {phase.tasks.map((t, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-white dark:bg-zinc-700 rounded text-xs text-gray-600 dark:text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              导入中...
            </>
          ) : (
            '确认导入到看板'
          )}
        </button>
      </div>
    </div>
  );
}
```

### Task 3.4: 新建 ProjectImportModal 组件

**Files:**
- Create: `src/components/collaboration/ProjectImportModal.tsx`

- [ ] 完整的导入弹窗，包含三步骤：文件上传 → AI 分析中 → 预览确认：

```typescript
'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { AIAnalysisPreview } from './AIAnalysisPreview';
import type { AIAnalysisResult } from '@/types/collaboration';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type Step = 'upload' | 'analyzing' | 'preview' | 'importing';

export function ProjectImportModal({ isOpen, onClose, projectId }: ProjectImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      setContent(text);
      setStep('analyzing');
      setError('');

      try {
        const res = await fetch(`/api/projects/${projectId}/ai-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '分析失败');
          setStep('upload');
          return;
        }

        setAnalysis(data.analysis);
        setStep('preview');
      } catch {
        setError('请求失败，请检查网络和API配置');
        setStep('upload');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    if (!analysis) return;
    setStep('importing');

    try {
      const res = await fetch(`/api/projects/${projectId}/ai-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: analysis.tasks, workflow: analysis.workflow }),
      });

      if (!res.ok) {
        setError('导入失败');
        setStep('preview');
        return;
      }

      onClose();
      // 刷新页面以加载新任务
      window.location.reload();
    } catch {
      setError('导入失败，请重试');
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setContent('');
    setAnalysis(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            {step === 'upload' ? '导入项目计划书' : step === 'analyzing' ? 'AI 分析中...' : 'AI 分析结果'}
          </h2>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-zinc-100 mb-2">
                上传 Markdown 文件
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                支持 .md 格式的项目计划书或执行方案
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <FileText className="w-4 h-4" />
                选择文件
              </span>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-zinc-400">正在分析 {fileName}...</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">AI 正在切分任务、审查项目和生成工作流</p>
            </div>
          )}

          {(step === 'preview' || step === 'importing') && analysis && (
            <AIAnalysisPreview
              analysis={analysis}
              onConfirm={handleConfirm}
              onCancel={() => { reset(); onClose(); }}
              loading={step === 'importing'}
            />
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 mt-3">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Task 3.5: 在看板添加 AI 导入入口

**Files:**
- Modify: `src/components/ProjectBoard.tsx`

- [ ] 在 ProjectBoard 顶部工具栏新增 "AI 导入" 按钮：

```typescript
// 在组件顶部新增
import { ProjectImportModal } from '@/components/collaboration/ProjectImportModal';
import { Sparkles } from 'lucide-react';

// 新增 state
const [showImport, setShowImport] = useState(false);

// 在工具栏按钮区域（新建任务按钮旁边）新增：
<button
  onClick={() => setShowImport(true)}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg text-xs font-medium transition-all"
>
  <Sparkles className="w-3.5 h-3.5" />
  AI 导入
</button>

// 在组件底部渲染：
{showImport && currentProjectId && (
  <ProjectImportModal
    isOpen={showImport}
    onClose={() => setShowImport(false)}
    projectId={currentProjectId}
  />
)}
```

---

## 第4期：甘特图

### Task 4.1: 新建 GanttChart 组件

**Files:**
- Create: `src/components/collaboration/GanttChart.tsx`

- [ ] SVG 自制甘特图组件，支持按负责人分组、拖拽调整日期、颜色区分优先级：

```typescript
'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import type { Task } from '@/types/collaboration';

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => void;
}

const priorityColors: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F97316',
  urgent: '#EF4444',
};

export function GanttChart({ tasks, onUpdateTask }: GanttChartProps) {
  const today = new Date();
  const startDate = useMemo(() => {
    const dates = tasks.map(t => t.createdAt || Date.now());
    return new Date(Math.min(...dates));
  }, [tasks]);
  const endDate = useMemo(() => {
    const dates = tasks.map(t => t.dueDate || Date.now() + 30 * 86400000);
    return new Date(Math.max(...dates));
  }, [tasks]);

  const totalDays = Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000), 1);
  const HEADER_HEIGHT = 40;
  const ROW_HEIGHT = 36;

  const months = useMemo(() => {
    const result: { label: string; x: number; days: number }[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const start = Math.max(monthStart.getTime(), startDate.getTime());
      const end = Math.min(monthEnd.getTime() + 86400000, endDate.getTime() + 86400000);
      const daysFromStart = Math.max(0, Math.floor((start - startDate.getTime()) / 86400000));
      const monthDays = Math.ceil((end - start) / 86400000);
      result.push({
        label: `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`,
        x: daysFromStart,
        days: monthDays,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return result;
  }, [startDate, endDate]);

  const svgWidth = totalDays * 30 + 200;
  const svgHeight = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 20;

  // 今天线的位置
  const todayX = 200 + Math.floor((today.getTime() - startDate.getTime()) / 86400000) * 30;

  const getBarX = (date: number) => {
    return 200 + Math.floor((date - startDate.getTime()) / 86400000) * 30;
  };

  const getBarWidth = (start: number, end: number) => {
    return Math.max(Math.floor((end - start) / 86400000) * 30, 20);
  };

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="min-w-full">
        {/* 月份标题 */}
        {months.map((m, i) => (
          <g key={i}>
            <rect
              x={200 + m.x * 30}
              y={0}
              width={m.days * 30}
              height={HEADER_HEIGHT}
              fill="none"
              stroke="#e5e7eb"
              className="dark:stroke-zinc-700"
            />
            <text
              x={200 + m.x * 30 + (m.days * 30) / 2}
              y={HEADER_HEIGHT / 2 + 4}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-zinc-400 text-xs"
              fontSize="12"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* 今天线 */}
        {todayX > 200 && todayX < svgWidth && (
          <line
            x1={todayX}
            y1={HEADER_HEIGHT}
            x2={todayX}
            y2={svgHeight}
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
        )}

        {/* 任务条 */}
        {tasks.map((task, i) => {
          const taskStart = task.createdAt || Date.now();
          const taskEnd = task.dueDate || Date.now() + 7 * 86400000;
          const barX = getBarX(taskStart);
          const barW = getBarWidth(taskStart, taskEnd);
          const barY = HEADER_HEIGHT + i * ROW_HEIGHT + 6;
          const color = priorityColors[task.priority] || '#6B7280';

          return (
            <g key={task.id}>
              {/* 行背景 */}
              <rect
                x={0} y={HEADER_HEIGHT + i * ROW_HEIGHT}
                width={svgWidth} height={ROW_HEIGHT}
                fill={i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'none'}
                className="dark:fill-none"
              />
              {/* 任务名称 */}
              <text
                x={8} y={barY + 10}
                className="fill-gray-700 dark:fill-zinc-300 text-xs"
                fontSize="11"
                textAnchor="start"
              >
                {task.title.length > 20 ? task.title.slice(0, 18) + '...' : task.title}
              </text>
              {/* 分隔线 */}
              <line
                x1={195} y1={HEADER_HEIGHT + i * ROW_HEIGHT}
                x2={195} y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#e5e7eb" strokeWidth="1"
                className="dark:stroke-zinc-700"
              />
              {/* 甘特条 */}
              <rect
                x={barX} y={barY}
                width={barW} height={22}
                rx={4} ry={4}
                fill={color}
                opacity={0.85}
                className="cursor-pointer hover:opacity-100 transition-opacity"
              >
                <title>
                  {task.title}
                  开始: {new Date(taskStart).toLocaleDateString()}
                  截止: {new Date(taskEnd).toLocaleDateString()}
                  优先级: {task.priority}
                </title>
              </rect>
              {/* 条上的日期 */}
              {barW > 60 && (
                <text
                  x={barX + 6} y={barY + 15}
                  className="fill-white text-xs"
                  fontSize="9"
                >
                  {`${new Date(taskEnd).getMonth() + 1}/${new Date(taskEnd).getDate()}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 图例 */}
      <div className="flex items-center gap-4 px-4 py-2 mt-2">
        {Object.entries(priorityColors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {key === 'low' ? '低' : key === 'medium' ? '中' : key === 'high' ? '高' : '紧急'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-0 border-t border-dashed border-red-400" />
          <span className="text-xs text-gray-500 dark:text-zinc-400">今天</span>
        </div>
      </div>
    </div>
  );
}
```

### Task 4.2: 项目页面添加 Tab 切换 + 甘特图

**Files:**
- Modify: `src/app/projects/[projectId]/page.tsx`

- [ ] 在看板和甘特图之间通过 Button Tab 切换，不使用键盘快捷键：

1. 从 store 获取 tasks
2. 新增 `activeView` state（'board' | 'gantt'）
3. 渲染两种视图

```typescript
// 页面结构改为：
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import ProjectBoard from '@/components/ProjectBoard';
import { GanttChart } from '@/components/collaboration/GanttChart';
import { LayoutGrid, BarChart3 } from 'lucide-react';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeView, setActiveView] = useState<'board' | 'gantt'>('board');
  const tasks = useCollaborationStore(s => s.tasks);
  const updateTask = useCollaborationStore(s => s.updateTask);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-900">
      {/* Tab 切换栏 */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveView('board')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'board'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          看板
        </button>
        <button
          onClick={() => setActiveView('gantt')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'gantt'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          甘特图
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeView === 'board' ? (
          <ProjectBoard />
        ) : (
          <div className="p-4">
            <GanttChart
              tasks={tasks}
              onUpdateTask={updateTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 第5期：个人中心

### Task 5.1: 新建用户任务总览 API

**Files:**
- Create: `src/app/api/user/tasks/route.ts`

- [ ] GET handler — 查询当前用户在所有项目中的任务：

```typescript
import { getUserId } from '@/lib/auth-utils';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  const summaries = db.queryAll(`
    SELECT
      p.id as project_id,
      p.name as project_name,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ?
    GROUP BY p.id
    ORDER BY p.name
  `, [userId]);

  const result = [];
  for (const s of summaries) {
    const tasks = db.queryAll(`
      SELECT id, project_id, parent_id, title, status, priority, due_date, order_index, created_at, updated_at
      FROM tasks
      WHERE project_id = ? AND assignee_id = ?
      ORDER BY order_index, created_at
    `, [s.project_id, userId]);

    result.push({
      projectId: s.project_id,
      projectName: s.project_name,
      totalTasks: Number(s.total_tasks),
      completedTasks: Number(s.completed_tasks),
      tasks: tasks.map(t => ({
        id: t.id,
        projectId: t.project_id,
        parentId: t.parent_id || undefined,
        title: String(t.title),
        status: t.status,
        priority: t.priority,
        assigneeId: userId,
        dueDate: t.due_date ? Number(t.due_date) : undefined,
        orderIndex: Number(t.order_index),
        createdAt: Number(t.created_at),
        updatedAt: Number(t.updated_at),
      })),
    });
  }

  return NextResponse.json({ summaries: result });
}
```

### Task 5.2: 新建 ProfilePanel 组件

**Files:**
- Create: `src/components/collaboration/ProfilePanel.tsx`

- [ ] 右侧滑出面板，展示个人信息 + 任务总览 + 职能编辑：

（由于篇幅限制，此处展示核心结构和关键交互）

关键结构：
1. **头部**：头像 + 用户名 + 关闭按钮
2. **个人标签区**：职称编辑（input）+ 职能标签管理（添加/删除 tags）
3. **项目任务总览**：列表形式，每个项目一行，显示完成进度条 + 展开查看具体任务

职能标签编辑逻辑：
- 渲染 `profile.functions` 为 tag badges
- 点击 "添加职能" 出现 input + 确认，新增 tag 后调用 `updateUserProfile({ functions: [...newTags] })`
- 每个 tag 旁边有 X 按钮删除

### Task 5.3: 新增 UserTaskOverview 子组件

**Files:**
- Create: `src/components/collaboration/UserTaskOverview.tsx`

- [ ] 在 ProfilePanel 中展示各项目任务列表的小组件：

```typescript
'use client';

import { UserTaskSummary } from '@/types/collaboration';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';

interface Props {
  summaries: UserTaskSummary[];
}

export function UserTaskOverview({ summaries }: Props) {
  return (
    <div className="space-y-2">
      {summaries.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4">暂无任务</p>
      ) : (
        summaries.map(summary => (
          <ProjectTaskGroup key={summary.projectId} summary={summary} />
        ))
      )}
    </div>
  );
}

function ProjectTaskGroup({ summary }: { summary: UserTaskSummary }) {
  const [expanded, setExpanded] = useState(false);
  const progress = summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  return (
    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{summary.projectName}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-zinc-400">
          {summary.completedTasks}/{summary.totalTasks}
        </span>
      </button>

      {/* 进度条 */}
      <div className="h-0.5 bg-gray-100 dark:bg-zinc-700">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {expanded && (
        <div className="p-2 space-y-1">
          {summary.tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
              {task.status === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : task.status === 'in_progress' ? (
                <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={`text-xs flex-1 ${
                task.status === 'done'
                  ? 'text-gray-400 dark:text-zinc-500 line-through'
                  : 'text-gray-700 dark:text-zinc-300'
              }`}>
                {task.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                task.priority === 'high' || task.priority === 'urgent'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : task.priority === 'medium'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400'
              }`}>
                {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Task 5.4: 全局添加入口按钮

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] 在 Toolbar 右侧新增个人中心按钮：

```typescript
import { User } from 'lucide-react';
// 新增 state
const [showProfile, setShowProfile] = useState(false);

// 在工具栏右侧添加按钮：
<button
  onClick={() => setShowProfile(true)}
  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors relative"
  title="个人中心"
>
  <User className="w-4 h-4" />
</button>

// 渲染：
{showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
```

### Task 5.5: ProfilePanel 完整实现

在 ProfilePanel 内整合：
1. `useCollaborationStore` — `fetchUserProfile`, `updateUserProfile`, `userProfile`, `userTasks`, `fetchUserTasks`
2. `useEffect` 调用 `fetchUserProfile()` 和 `fetchUserTasks()`
3. UI：头像区 → 个人信息展示 → 职能标签管理 → 项目任务总览（UserTaskOverview）

---

## 第6期：润色集成

### Task 6.1: 构建验证

- [ ] `npm run build` 确认无编译/类型错误
- [ ] 检查所有新旧组件引用路径正确

### Task 6.2: UI 细节打磨

- [ ] 团队卡片显示成员数
- [ ] 看板任务卡片显示负责人（如有 assigneeId）
- [ ] 甘特图动画过渡
- [ ] 暗色模式适配检查

### Task 6.3: 关键流程测试

- [ ] 创建团队 → 查看成员 → 添加成员 → 设置职能 → 移除成员
- [ ] 上传 Markdown → AI 分析 → 预览结果 → 确认导入 → 看板出现任务
- [ ] 看板 ↔ 甘特图 Tab 切换
- [ ] 打开个人中心 → 查看个人信息 → 编辑职能 → 查看各项目任务

---

## 关于无云端服务器的说明

所有 API 调用均为本地 sql.js 数据库操作，AI 调用通过 SiliconFlow 云端 API 完成（已在 `.env.local` 配置）。TeamMember 的添加目前通过"输入用户 ID"实现（因为没有用户搜索/邀请系统），后续可扩展为用邮箱搜索等。

---

## 执行确认

以上 6 期涵盖全部需求。**确认后我将开始第 1 期实施。**