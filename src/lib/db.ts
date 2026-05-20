import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'data/kb.db';

// Ensure the database's parent directory exists automatically before opening connection
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL Mode for High Performance Concurrency
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// Automatically initialize FTS5 table and sync triggers once the target articles table exists
try {
  const articlesTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles'").get();
  if (articlesTableExists) {
    const ftsTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'").get();
    if (!ftsTableExists) {
      sqlite.exec(`
        CREATE VIRTUAL TABLE articles_fts USING fts5(
          id UNINDEXED,
          title,
          content,
          tokenize='porter unicode61'
        );
      `);
    }
    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_articles_fts_insert AFTER INSERT ON articles BEGIN
        INSERT INTO articles_fts(id, title, content) 
        VALUES (new.id, new.title, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_articles_fts_update AFTER UPDATE ON articles BEGIN
        UPDATE articles_fts 
        SET title = new.title, content = new.content 
        WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_articles_fts_delete AFTER DELETE ON articles BEGIN
        DELETE FROM articles_fts WHERE id = old.id;
      END;
    `);
  }
} catch (e) {
  console.error("Error setting up FTS5 and SQLite Triggers:", e);
}

export const db = drizzle(sqlite, { schema });
