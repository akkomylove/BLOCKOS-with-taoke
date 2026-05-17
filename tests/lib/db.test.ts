import { describe, it, expect, beforeEach, vi } from 'vitest';
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

    transaction(fn: () => void): void {
      db.run('BEGIN TRANSACTION');
      try {
        fn();
        db.run('COMMIT');
      } catch (err) {
        db.run('ROLLBACK');
        throw err;
      }
    },

    saveDb() {
      return db.export();
    },
  };
}

describe('Database Operations', () => {
  let db: Database;
  let dbOps: ReturnType<typeof createDbWrapper>;

  beforeEach(async () => {
    db = await createTestDb();
    dbOps = createDbWrapper(db);
  });

  describe('query()', () => {
    it('should return empty array when no data exists', () => {
      const results = dbOps.query('SELECT * FROM users');
      expect(results).toEqual([]);
    });

    it('should query inserted data correctly', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      const results = dbOps.query('SELECT * FROM users WHERE id = ?', ['user-1']);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-1');
      expect(results[0].email).toBe('test@example.com');
    });

    it('should return multiple rows for multiple records', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'user1@example.com', 'User 1', 'google', 'google-1', Date.now()]
      );
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-2', 'user2@example.com', 'User 2', 'github', 'github-2', Date.now()]
      );

      const results = dbOps.query('SELECT * FROM users ORDER BY id');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('user-1');
      expect(results[1].id).toBe('user-2');
    });

    it('should return affected rows count from run()', () => {
      const rowsAffected = dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      expect(rowsAffected).toBe(1);
    });

    it('should return 0 for no affected rows', () => {
      const rowsAffected = dbOps.run(
        'UPDATE users SET name = ? WHERE id = ?',
        ['New Name', 'non-existent-id']
      );

      expect(rowsAffected).toBe(0);
    });

    it('should handle query with multiple parameters', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-owner', 'owner@example.com', 'Owner', 'google', 'google-1', Date.now()]
      );

      dbOps.run(
        'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        ['team-1', 'Test Team', 'user-owner', Date.now(), Date.now()]
      );

      const results = dbOps.query(
        'SELECT * FROM teams WHERE name LIKE ? AND owner_id = ?',
        ['%Test%', 'user-owner']
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Team');
    });

    it('should return null values correctly', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', null, 'google', 'google-123', Date.now()]
      );

      const results = dbOps.query('SELECT * FROM users WHERE id = ?', ['user-1']);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBeNull();
    });
  });

  describe('run()', () => {
    it('should insert data and return affected rows', () => {
      const rowsAffected = dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      expect(rowsAffected).toBe(1);
    });

    it('should update data and return affected rows', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Original Name', 'google', 'google-123', Date.now()]
      );

      const rowsAffected = dbOps.run(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Updated Name', 'user-1']
      );

      expect(rowsAffected).toBe(1);

      const results = dbOps.query('SELECT name FROM users WHERE id = ?', ['user-1']);
      expect(results[0].name).toBe('Updated Name');
    });

    it('should delete data and return affected rows', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      const rowsAffected = dbOps.run('DELETE FROM users WHERE id = ?', ['user-1']);

      expect(rowsAffected).toBe(1);

      const results = dbOps.query('SELECT * FROM users WHERE id = ?', ['user-1']);
      expect(results).toHaveLength(0);
    });

    it('should handle empty string parameters', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', '', 'google', '', Date.now()]
      );

      const results = dbOps.query('SELECT name, provider_id FROM users WHERE id = ?', ['user-1']);

      expect(results[0].name).toBe('');
      expect(results[0].provider_id).toBe('');
    });

    it('should handle numeric parameters', () => {
      const now = Date.now();
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test', 'google', '123', now]
      );

      const results = dbOps.query('SELECT created_at FROM users WHERE id = ?', ['user-1']);

      expect(results[0].created_at).toBe(now);
    });
  });

  describe('transaction()', () => {
    it('should commit successful transaction', () => {
      dbOps.transaction(() => {
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-1', 'user1@example.com', 'User 1', 'google', 'g1', Date.now()]
        );
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-2', 'user2@example.com', 'User 2', 'github', 'gh2', Date.now()]
        );
      });

      const results = dbOps.query('SELECT * FROM users ORDER BY id');
      expect(results).toHaveLength(2);
    });

    it('should rollback on error', () => {
      expect(() => {
        dbOps.transaction(() => {
          dbOps.run(
            'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['user-1', 'user1@example.com', 'User 1', 'google', 'g1', Date.now()]
          );
          dbOps.run(
            'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['user-1', 'user2@example.com', 'User 2', 'github', 'gh2', Date.now()]
          );
        });
      }).toThrow();

      const results = dbOps.query('SELECT * FROM users');
      expect(results).toHaveLength(0);
    });

    it('should rollback partial transaction on error', () => {
      expect(() => {
        dbOps.transaction(() => {
          dbOps.run(
            'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            ['team-1', 'Team 1', 'user-1', Date.now(), Date.now()]
          );
          dbOps.run(
            'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            ['team-1', 'Team 1 Duplicate', 'user-1', Date.now(), Date.now()]
          );
        });
      }).toThrow();

      const results = dbOps.query('SELECT * FROM teams');
      expect(results).toHaveLength(0);
    });

    it('should handle nested operations in transaction', () => {
      dbOps.transaction(() => {
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-owner', 'owner@example.com', 'Owner', 'google', 'g1', Date.now()]
        );

        dbOps.run(
          'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          ['team-1', 'Test Team', 'user-owner', Date.now(), Date.now()]
        );

        dbOps.run(
          'INSERT INTO projects (id, team_id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['proj-1', 'team-1', 'Test Project', 'user-owner', Date.now(), Date.now()]
        );
      });

      const users = dbOps.query('SELECT * FROM users');
      const teams = dbOps.query('SELECT * FROM teams');
      const projects = dbOps.query('SELECT * FROM projects');

      expect(users).toHaveLength(1);
      expect(teams).toHaveLength(1);
      expect(projects).toHaveLength(1);
    });

    it('should preserve data after failed transaction', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-prev', 'prev@example.com', 'Previous User', 'google', 'g1', Date.now()]
      );

      expect(() => {
        dbOps.transaction(() => {
          dbOps.run(
            'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['user-new', 'new@example.com', 'New User', 'github', 'gh1', Date.now()]
          );
          throw new Error('Intentional error');
        });
      }).toThrow();

      const results = dbOps.query('SELECT * FROM users WHERE id = ?', ['user-prev']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('user-prev');

      const failedResults = dbOps.query('SELECT * FROM users WHERE id = ?', ['user-new']);
      expect(failedResults).toHaveLength(0);
    });
  });

  describe('saveDb()', () => {
    it('should export database as buffer', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      const exported = dbOps.saveDb();

      expect(exported).toBeInstanceOf(Uint8Array);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should preserve data in exported buffer', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-2', 'test2@example.com', 'Test User 2', 'github', 'github-456', Date.now()]
      );

      const exported = dbOps.saveDb();

      const newDb = new SQL!.Database(exported);
      const results: Record<string, unknown>[] = [];
      const stmt = newDb.prepare('SELECT * FROM users ORDER BY id');
      while (stmt.step()) {
        results.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.free();

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('user-1');
      expect(results[1].id).toBe('user-2');
    });

    it('should preserve table structure in exported buffer', () => {
      const exported = dbOps.saveDb();

      const newDb = new SQL!.Database(exported);
      const results = dbOps.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'teams', 'tasks')"
      );

      const tableNames = results.map(r => r.name as string);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('teams');
      expect(tableNames).toContain('tasks');
    });
  });

  describe('Data Integrity', () => {
    it('should enforce foreign key constraints', () => {
      expect(() => {
        dbOps.run(
          'INSERT INTO teams (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          ['team-1', 'Test Team', 'non-existent-user', Date.now(), Date.now()]
        );
      }).toThrow();
    });

    it('should enforce unique constraints', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      expect(() => {
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-2', 'test@example.com', 'Another User', 'github', 'github-456', Date.now()]
        );
      }).toThrow();
    });

    it('should enforce primary key constraints', () => {
      dbOps.run(
        'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 'google', 'google-123', Date.now()]
      );

      expect(() => {
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-1', 'another@example.com', 'Another User', 'github', 'github-456', Date.now()]
        );
      }).toThrow();
    });

    it('should enforce not null constraints', () => {
      expect(() => {
        dbOps.run(
          'INSERT INTO users (id, email, name, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-1', null, 'Test User', 'google', 'google-123', Date.now()]
        );
      }).toThrow();
    });
  });
});
