CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  content='article',
  tokenize='porter'
);

INSERT INTO article_fts(rowid, title, content)
SELECT id, title, content FROM "Article";

CREATE TRIGGER IF NOT EXISTS article_ai AFTER INSERT ON "Article" BEGIN
  INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS article_ad AFTER DELETE ON "Article" BEGIN
  DELETE FROM article_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS article_au AFTER UPDATE ON "Article" BEGIN
  UPDATE article_fts SET title = new.title, content = new.content WHERE rowid = new.id;
END;
