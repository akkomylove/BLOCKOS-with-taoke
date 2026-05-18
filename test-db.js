const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'blockos.db');
console.log('DB_PATH:', DB_PATH);
console.log('exists:', fs.existsSync(DB_PATH));

async function test() {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    db = new SQL.Database(data);
    console.log('Loaded existing db');
  } else {
    db = new SQL.Database();
    console.log('Created new db');
  }

  db.run('CREATE TABLE IF NOT EXISTS test (id TEXT)');
  db.run("INSERT INTO test VALUES ('hello')");

  const result = db.exec('SELECT * FROM test');
  console.log('Query result:', JSON.stringify(result));

  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('Saved db, exists:', fs.existsSync(DB_PATH));
}

test().catch(console.error);
