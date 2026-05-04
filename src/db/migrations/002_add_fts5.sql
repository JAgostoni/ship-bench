-- FTS5 virtual table and sync triggers for article search
-- Applied in Iteration 3, prepared here as part of Iteration 1 schema completeness

CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  content,
  content='articles',
  content_rowid='rowid'
);

-- Trigger to sync FTS on INSERT
CREATE TRIGGER IF NOT EXISTS articles_fts_insert
AFTER INSERT ON articles
BEGIN
  INSERT INTO articles_fts(rowid, title, content)
  VALUES (NEW.rowid, NEW.title, NEW.content);
END;

-- Trigger to sync FTS on DELETE
CREATE TRIGGER IF NOT EXISTS articles_fts_delete
AFTER DELETE ON articles
BEGIN
  DELETE FROM articles_fts WHERE rowid = OLD.rowid;
END;

-- Trigger to sync FTS on UPDATE
CREATE TRIGGER IF NOT EXISTS articles_fts_update
AFTER UPDATE ON articles
BEGIN
  DELETE FROM articles_fts WHERE rowid = OLD.rowid;
  INSERT INTO articles_fts(rowid, title, content)
  VALUES (NEW.rowid, NEW.title, NEW.content);
END;
