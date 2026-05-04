-- FTS5 Virtual Table and Sync Triggers for article search
-- To be applied in Iteration 3 (search feature)

CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  content,
  content='articles',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS articles_fts_insert
AFTER INSERT ON articles
BEGIN
  INSERT INTO articles_fts(rowid, title, content)
  VALUES (NEW.rowid, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_delete
AFTER DELETE ON articles
BEGIN
  DELETE FROM articles_fts WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_update
AFTER UPDATE ON articles
BEGIN
  DELETE FROM articles_fts WHERE rowid = OLD.rowid;
  INSERT INTO articles_fts(rowid, title, content)
  VALUES (NEW.rowid, NEW.title, NEW.content);
END;
