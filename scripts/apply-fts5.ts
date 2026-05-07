import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve(process.cwd(), 'data', 'knowledge-base.db');
const db = new Database(dbPath);

const sql = fs.readFileSync(path.resolve(process.cwd(), 'src', 'db', 'migrations', '002_add_fts5.sql'), 'utf-8');

try {
  db.exec(sql);
  console.log('✅ FTS5 table and triggers applied successfully.');
  db.close();
} catch (err: any) {
  console.error('❌ Failed to apply FTS5:', err.message);
  db.close();
  process.exit(1);
}
