import Database from 'better-sqlite3';

export function setupFTS(db: Database.Database): void {
  // Create FTS5 virtual table for full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(
      title, content, content='Article', content_rowid='id'
    );
  `);

  // Seed FTS index with existing article data
  db.exec(`
    INSERT INTO article_fts(rowid, title, content)
      SELECT id, title, content FROM Article;
  `);

  // Trigger to keep FTS index in sync on INSERT
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS article_fts_insert AFTER INSERT ON Article BEGIN
      INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `);

  // Trigger to keep FTS index in sync on DELETE
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS article_fts_delete AFTER DELETE ON Article BEGIN
      INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
    END;
  `);

  // Trigger to keep FTS index in sync on UPDATE
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS article_fts_update AFTER UPDATE ON Article BEGIN
      INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
      INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `);
}
