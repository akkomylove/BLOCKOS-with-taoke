import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { DEMO_USERS } from './demo-users';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
let dbInitError: Error | null = null;
let dbSeeded = false;

const DB_PATH = path.join(process.cwd(), 'data', 'blockos.db');

export async function getDb() {
  if (db) return db;
  if (dbInitError) throw dbInitError;

  try {
    if (!SQL) {
      const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      SQL = await initSqlJs({
        locateFile: () => wasmPath,
      });
    }

    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    let data: Buffer | null = null;
    if (fs.existsSync(DB_PATH)) {
      data = fs.readFileSync(DB_PATH);
    }

    db = new SQL.Database(data);

    initSchema(db);
    seedDemoUsers(db);

    return db;
  } catch (err) {
    dbInitError = err instanceof Error ? err : new Error(String(err));
    throw dbInitError;
  }
}

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
      avatar TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT,
      title TEXT,
      functions TEXT DEFAULT '[]',
      bio TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
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
      icon TEXT,
      color TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      start_date INTEGER,
      end_date INTEGER,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      due_date INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      start_date INTEGER,
      due_date INTEGER,
      dod TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      mentions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
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

    CREATE TABLE IF NOT EXISTS workflow_analyses (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      document_name TEXT NOT NULL,
      document_summary TEXT,
      workflow_roles TEXT NOT NULL,
      role_flow TEXT,
      task_schedule TEXT,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workflow_tasks (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL REFERENCES workflow_analyses(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      step_number INTEGER NOT NULL,
      role TEXT NOT NULL,
      goal TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_analyses_project ON workflow_analyses(project_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_tasks_analysis ON workflow_tasks(analysis_id);
  `);

  try {
    database.run(`ALTER TABLE tasks ADD COLUMN start_date INTEGER`);
  } catch {
    // Column may already exist, ignore error
  }
}

export function saveDb() {
  if (!db || !SQL) return;
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

export function query(sql: string, params: (string | number | null)[] = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  try {
    while (stmt.step()) {
      results.push(stmt.getAsObject() as Record<string, unknown>);
    }
  } finally {
    stmt.free();
  }
  return results;
}

export function transaction(fn: () => void): void {
  if (!db) throw new Error('Database not initialized');
  db.run('BEGIN TRANSACTION');
  try {
    fn();
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

export function run(sql: string, params: (string | number | null)[] = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  return db.getRowsModified();
}

function seedDemoUsers(database: Database) {
  if (dbSeeded) return;
  dbSeeded = true;

  for (const user of DEMO_USERS) {
    const existing = database.exec(`SELECT id FROM users WHERE id = '${user.id}'`);
    if (existing.length > 0 && existing[0].values.length > 0) continue;

    const now = Date.now();
    database.run(
      `INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.name, user.avatar || '', 'demo', user.id, now]
    );

    database.run(
      `INSERT INTO user_profiles (user_id, display_name, title, functions, bio, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.title, JSON.stringify(user.functions), '', now]
    );
  }

  try {
    seedDemoData(database);
  } catch (err) {
    console.error('[DB-SEED] seedDemoData error:', err);
  }
  try {
    saveDb();
  } catch (err) {
    console.error('[DB-SEED] saveDb error:', err);
  }
}

function seedDemoData(database: Database) {
  const adminId = 'demo-admin-001';
  const now = Date.now();

  const teamExists = database.exec(`SELECT id FROM teams WHERE id = 'demo-team-001'`);
  if (teamExists.length > 0 && teamExists[0].values.length > 0) return;

  const teamId = 'demo-team-001';
  database.run(
    `INSERT INTO teams (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [teamId, 'CircleLight 研发团队', '负责电商平台核心研发工作', adminId, now, now]
  );

  for (const user of DEMO_USERS) {
    database.run(
      `INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
      [`tm-${user.id}`, teamId, user.id, user.role === 'admin' ? 'admin' : 'member', now]
    );
  }

  const projectId = 'demo-project-001';
  const projectStart = new Date('2026-05-01').getTime();
  const projectEnd = new Date('2026-07-31').getTime();
  database.run(
    `INSERT INTO projects (id, team_id, name, description, icon, color, status, start_date, end_date, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [projectId, teamId, 'CircleLight 电商平台 v2.0', '新一代电商平台，支持多端统一体验', 'ShoppingBag', '#3B82F6', 'active', projectStart, projectEnd, adminId, now, now]
  );

  for (const user of DEMO_USERS) {
    database.run(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
      [`pm-${user.id}`, projectId, user.id, user.role === 'admin' ? 'owner' : 'member', now]
    );
  }

  const tasks = [
    { id: 'task-0', title: '需求分析与PRD撰写', desc: '整理电商平台核心功能需求，输出产品需求文档', start: '2026-05-01', end: '2026-05-10', priority: 'high', assignee: 'demo-admin-001', status: 'done' },
    { id: 'task-1', title: 'UI/UX 设计系统搭建', desc: '设计统一视觉规范，搭建组件库', start: '2026-05-06', end: '2026-05-20', priority: 'high', assignee: 'demo-emp-003', status: 'done' },
    { id: 'task-2', title: '前端架构与基础搭建', desc: '搭建 React + TypeScript 工程，配置路由与状态管理', start: '2026-05-18', end: '2026-06-02', priority: 'high', assignee: 'demo-emp-001', status: 'in_progress' },
    { id: 'task-3', title: '后端API设计与开发', desc: '设计RESTful API，实现用户/商品/订单核心接口', start: '2026-05-22', end: '2026-06-12', priority: 'high', assignee: 'demo-emp-002', status: 'in_progress' },
    { id: 'task-4', title: '数据库设计与优化', desc: '设计表结构，索引优化，读写分离方案', start: '2026-05-10', end: '2026-05-22', priority: 'medium', assignee: 'demo-emp-002', status: 'done' },
    { id: 'task-5', title: '自动化测试框架搭建', desc: '搭建单元测试、集成测试框架，编写核心用例', start: '2026-06-05', end: '2026-06-20', priority: 'medium', assignee: 'demo-emp-004', status: 'todo' },
    { id: 'task-6', title: '性能测试与调优', desc: '压测关键接口，定位瓶颈并优化', start: '2026-06-18', end: '2026-07-05', priority: 'medium', assignee: 'demo-emp-004', status: 'todo' },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const startTime = new Date(t.start).getTime();
    const endTime = new Date(t.end).getTime();
    database.run(
      `INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, start_date, due_date, order_index, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, projectId, t.title, t.desc, t.status, t.priority, t.assignee, startTime, endTime, i, now, now]
    );
  }

  const milestones = [
    { name: '第一阶段：需求与设计', desc: '完成需求分析、PRD、UI设计', due: '2026-05-20' },
    { name: '第二阶段：核心开发', desc: '完成前后端核心功能开发', due: '2026-06-15' },
    { name: '第三阶段：测试与优化', desc: '完成测试覆盖、性能调优', due: '2026-07-10' },
    { name: '第四阶段：上线部署', desc: '完成灰度发布、监控配置', due: '2026-07-31' },
  ];

  for (const m of milestones) {
    database.run(
      `INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [`ms-${m.name}`, projectId, m.name, m.desc, new Date(m.due).getTime(), now]
    );
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  SQL = null;
  dbInitError = null;
  dbSeeded = false;
}
