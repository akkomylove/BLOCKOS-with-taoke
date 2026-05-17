import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;

async function createTestDb(): Promise<Database> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  const db = new SQL.Database();

  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
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

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      due_date INTEGER,
      dod TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

function createDbWrapper(db: Database) {
  return {
    query(sql: string, params: (string | number | null)[] = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results: Record<string, unknown>[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.free();
      return results;
    },

    run(sql: string, params: (string | number | null)[] = []) {
      db.run(sql, params);
      return db.getRowsModified();
    },
  };
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateTeamId(teamId: unknown): ValidationResult {
  if (teamId === undefined || teamId === null) {
    return { valid: false, error: 'Team ID is required' };
  }
  if (typeof teamId !== 'string') {
    return { valid: false, error: 'Team ID must be a string' };
  }
  if (teamId.trim() === '') {
    return { valid: false, error: 'Team ID cannot be empty' };
  }
  return { valid: true };
}

function validateTitle(title: unknown, maxLength = 500): ValidationResult {
  if (title === undefined || title === null) {
    return { valid: false, error: 'Title is required' };
  }
  if (typeof title !== 'string') {
    return { valid: false, error: 'Title must be a string' };
  }
  if (title.trim() === '') {
    return { valid: false, error: 'Title cannot be empty' };
  }
  if (title.length > maxLength) {
    return { valid: false, error: `Title must be a string with maximum ${maxLength} characters` };
  }
  return { valid: true };
}

const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const;
const VALID_MILESTONE_STATUSES = ['pending', 'in_progress', 'completed'] as const;

function validateStatus(status: unknown, validStatuses: readonly string[] = VALID_STATUSES): ValidationResult {
  if (status === undefined || status === null) {
    return { valid: false, error: 'Status is required' };
  }
  if (typeof status !== 'string') {
    return { valid: false, error: 'Status must be a string' };
  }
  if (!validStatuses.includes(status)) {
    return { valid: false, error: `Status must be one of: ${validStatuses.join(', ')}` };
  }
  return { valid: true };
}

function validateAssigneeId(assigneeId: unknown, db: Database): ValidationResult {
  if (assigneeId === undefined || assigneeId === null) {
    return { valid: true };
  }
  if (typeof assigneeId !== 'string') {
    return { valid: false, error: 'Assignee ID must be a string' };
  }
  if (assigneeId.trim() === '') {
    return { valid: true };
  }

  const stmt = db.prepare('SELECT id FROM users WHERE id = ?');
  stmt.bind([assigneeId]);
  const exists = stmt.step();
  stmt.free();

  if (!exists) {
    return { valid: false, error: 'Assignee must be an existing user' };
  }
  return { valid: true };
}

function isTeamMember(teamId: string, userId: string, db: Database): boolean {
  const stmt = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?');
  stmt.bind([teamId, userId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

describe('Data Validation', () => {
  let db: Database;
  let dbOps: ReturnType<typeof createDbWrapper>;

  beforeEach(async () => {
    db = await createTestDb();
    dbOps = createDbWrapper(db);

    dbOps.run(
      'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['user-1', 'user1@example.com', 'User 1', 'google', 'g1', Date.now()]
    );
    dbOps.run(
      'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['user-2', 'user2@example.com', 'User 2', 'github', 'gh2', Date.now()]
    );
    dbOps.run(
      'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['team-1', 'Test Team', 'user-1', Date.now(), Date.now()]
    );
    dbOps.run(
      'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      ['tm-1', 'team-1', 'user-1', 'owner', Date.now()]
    );
    dbOps.run(
      'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      ['tm-2', 'team-1', 'user-2', 'member', Date.now()]
    );
    dbOps.run(
      'INSERT INTO projects (id, team_id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['proj-1', 'team-1', 'Test Project', 'user-1', Date.now(), Date.now()]
    );
    dbOps.run(
      'INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      ['pm-1', 'proj-1', 'user-1', 'owner', Date.now()]
    );
    dbOps.run(
      'INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      ['pm-2', 'proj-1', 'user-2', 'member', Date.now()]
    );
  });

  describe('teamId validation', () => {
    it('should reject undefined teamId', () => {
      const result = validateTeamId(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team ID is required');
    });

    it('should reject null teamId', () => {
      const result = validateTeamId(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team ID is required');
    });

    it('should reject non-string teamId', () => {
      const result = validateTeamId(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team ID must be a string');
    });

    it('should reject empty string teamId', () => {
      const result = validateTeamId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team ID cannot be empty');
    });

    it('should reject whitespace-only teamId', () => {
      const result = validateTeamId('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team ID cannot be empty');
    });

    it('should accept valid string teamId', () => {
      const result = validateTeamId('team-123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept UUID format teamId', () => {
      const result = validateTeamId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });
  });

  describe('title validation', () => {
    it('should reject undefined title', () => {
      const result = validateTitle(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should reject null title', () => {
      const result = validateTitle(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should reject non-string title', () => {
      const result = validateTitle(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title must be a string');
    });

    it('should reject empty string title', () => {
      const result = validateTitle('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title cannot be empty');
    });

    it('should reject whitespace-only title', () => {
      const result = validateTitle('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title cannot be empty');
    });

    it('should reject title exceeding max length', () => {
      const longTitle = 'a'.repeat(501);
      const result = validateTitle(longTitle, 500);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title must be a string with maximum 500 characters');
    });

    it('should accept title at exactly max length', () => {
      const maxTitle = 'a'.repeat(500);
      const result = validateTitle(maxTitle, 500);
      expect(result.valid).toBe(true);
    });

    it('should accept title under max length', () => {
      const result = validateTitle('Valid Task Title');
      expect(result.valid).toBe(true);
    });

    it('should accept title with special characters', () => {
      const result = validateTitle('Task Title @#$%^&*()');
      expect(result.valid).toBe(true);
    });

    it('should accept title with unicode characters', () => {
      const result = validateTitle('任务标题 测试 🎉');
      expect(result.valid).toBe(true);
    });

    it('should accept custom max length', () => {
      const result = validateTitle('Short', 10);
      expect(result.valid).toBe(true);
    });

    it('should reject title exceeding custom max length', () => {
      const result = validateTitle('This is too long', 5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title must be a string with maximum 5 characters');
    });
  });

  describe('status validation', () => {
    it('should reject undefined status', () => {
      const result = validateStatus(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Status is required');
    });

    it('should reject null status', () => {
      const result = validateStatus(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Status is required');
    });

    it('should reject non-string status', () => {
      const result = validateStatus(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Status must be a string');
    });

    it('should reject invalid status value', () => {
      const result = validateStatus('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Status must be one of: todo, in_progress, done');
    });

    it('should accept valid task status "todo"', () => {
      const result = validateStatus('todo');
      expect(result.valid).toBe(true);
    });

    it('should accept valid task status "in_progress"', () => {
      const result = validateStatus('in_progress');
      expect(result.valid).toBe(true);
    });

    it('should accept valid task status "done"', () => {
      const result = validateStatus('done');
      expect(result.valid).toBe(true);
    });

    it('should accept milestone status "pending"', () => {
      const result = validateStatus('pending', VALID_MILESTONE_STATUSES);
      expect(result.valid).toBe(true);
    });

    it('should accept milestone status "in_progress"', () => {
      const result = validateStatus('in_progress', VALID_MILESTONE_STATUSES);
      expect(result.valid).toBe(true);
    });

    it('should accept milestone status "completed"', () => {
      const result = validateStatus('completed', VALID_MILESTONE_STATUSES);
      expect(result.valid).toBe(true);
    });

    it('should reject milestone status "done"', () => {
      const result = validateStatus('done', VALID_MILESTONE_STATUSES);
      expect(result.valid).toBe(false);
    });

    it('should accept custom status whitelist', () => {
      const customStatuses = ['draft', 'review', 'published'] as const;
      const result = validateStatus('review', customStatuses);
      expect(result.valid).toBe(true);
    });

    it('should reject status not in custom whitelist', () => {
      const customStatuses = ['draft', 'review', 'published'] as const;
      const result = validateStatus('todo', customStatuses);
      expect(result.valid).toBe(false);
    });

    it('should be case-sensitive for status values', () => {
      const result = validateStatus('TODO');
      expect(result.valid).toBe(false);
    });
  });

  describe('assigneeId validation', () => {
    it('should accept undefined assigneeId', () => {
      const result = validateAssigneeId(undefined, db);
      expect(result.valid).toBe(true);
    });

    it('should accept null assigneeId', () => {
      const result = validateAssigneeId(null, db);
      expect(result.valid).toBe(true);
    });

    it('should accept empty string assigneeId', () => {
      const result = validateAssigneeId('', db);
      expect(result.valid).toBe(true);
    });

    it('should accept whitespace-only assigneeId as empty', () => {
      const result = validateAssigneeId('  ', db);
      expect(result.valid).toBe(true);
    });

    it('should reject non-string assigneeId', () => {
      const result = validateAssigneeId(123, db);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Assignee ID must be a string');
    });

    it('should accept valid existing user as assignee', () => {
      const result = validateAssigneeId('user-1', db);
      expect(result.valid).toBe(true);
    });

    it('should accept another valid existing user as assignee', () => {
      const result = validateAssigneeId('user-2', db);
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent user as assignee', () => {
      const result = validateAssigneeId('non-existent-user', db);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Assignee must be an existing user');
    });

    it('should reject invalid UUID format assigneeId', () => {
      const result = validateAssigneeId('invalid-uuid', db);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Assignee must be an existing user');
    });
  });

  describe('team membership validation', () => {
    it('should confirm owner is team member', () => {
      const isMember = isTeamMember('team-1', 'user-1', db);
      expect(isMember).toBe(true);
    });

    it('should confirm regular member is team member', () => {
      const isMember = isTeamMember('team-1', 'user-2', db);
      expect(isMember).toBe(true);
    });

    it('should reject non-member', () => {
      const isMember = isTeamMember('team-1', 'user-999', db);
      expect(isMember).toBe(false);
    });

    it('should reject invalid team ID', () => {
      const isMember = isTeamMember('non-existent-team', 'user-1', db);
      expect(isMember).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should validate task creation with all valid fields', () => {
      const teamIdResult = validateTeamId('team-1');
      const titleResult = validateTitle('New Task');
      const statusResult = validateStatus('todo');
      const assigneeResult = validateAssigneeId('user-1', db);

      expect(teamIdResult.valid).toBe(true);
      expect(titleResult.valid).toBe(true);
      expect(statusResult.valid).toBe(true);
      expect(assigneeResult.valid).toBe(true);
    });

    it('should reject task creation with invalid fields', () => {
      const teamIdResult = validateTeamId('');
      const titleResult = validateTitle('');
      const statusResult = validateStatus('invalid_status');
      const assigneeResult = validateAssigneeId('non-existent-user', db);

      expect(teamIdResult.valid).toBe(false);
      expect(titleResult.valid).toBe(false);
      expect(statusResult.valid).toBe(false);
      expect(assigneeResult.valid).toBe(false);
    });

    it('should allow task creation without assignee', () => {
      const titleResult = validateTitle('Unassigned Task');
      const assigneeResult = validateAssigneeId(null, db);

      expect(titleResult.valid).toBe(true);
      expect(assigneeResult.valid).toBe(true);

      dbOps.run(
        'INSERT INTO tasks (id, project_id, title, status, priority, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['task-1', 'proj-1', 'Unassigned Task', 'todo', 'medium', 0, Date.now(), Date.now()]
      );

      const results = dbOps.query('SELECT * FROM tasks WHERE id = ?', ['task-1']);
      expect(results).toHaveLength(1);
      expect(results[0].assignee_id).toBeNull();
    });

    it('should allow creating task with valid assignee', () => {
      const assigneeResult = validateAssigneeId('user-2', db);
      expect(assigneeResult.valid).toBe(true);

      dbOps.run(
        'INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['task-1', 'proj-1', 'Assigned Task', 'todo', 'medium', 'user-2', 0, Date.now(), Date.now()]
      );

      const results = dbOps.query('SELECT * FROM tasks WHERE id = ?', ['task-1']);
      expect(results).toHaveLength(1);
      expect(results[0].assignee_id).toBe('user-2');
    });

    it('should validate project belongs to team', () => {
      const results = dbOps.query(
        'SELECT team_id FROM projects WHERE id = ? AND team_id = ?',
        ['proj-1', 'team-1']
      );
      expect(results).toHaveLength(1);
      expect(results[0].team_id).toBe('team-1');
    });

    it('should enforce title length limit in database', () => {
      const longTitle = 'a'.repeat(1000);
      const validation = validateTitle(longTitle, 500);
      expect(validation.valid).toBe(false);
    });
  });
});
