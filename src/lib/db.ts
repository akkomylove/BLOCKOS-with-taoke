import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
let dbInitError: Error | null = null;

const DB_PATH = path.join(process.cwd(), 'data', 'blockos.db');

export async function getDb() {
  if (db) return db;
  if (dbInitError) throw dbInitError;

  try {
    SQL = await initSqlJs();

    let data: Buffer | null = null;
    if (fs.existsSync(DB_PATH)) {
      data = fs.readFileSync(DB_PATH);
    }

    db = new SQL.Database(data);

    initSchema(db);

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

    CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
    CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
  `);
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
  } catch {
    // silent fail
  }
}

export function query(sql: string, params: (string | number | null)[] = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

export function run(sql: string, params: (string | number | null)[] = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
}
