CREATE VIRTUAL TABLE IF NOT EXISTS "ArticleFts" USING fts5(
  title,
  content,
  content_rowid=rowid,
  content=Article
);

CREATE TRIGGER IF NOT EXISTS article_fts_insert AFTER INSERT ON "Article" BEGIN
  INSERT INTO "ArticleFts"(rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS article_fts_update AFTER UPDATE ON "Article" BEGIN
  UPDATE "ArticleFts" SET title = new.title, content = new.content
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS article_fts_delete AFTER DELETE ON "Article" BEGIN
  INSERT INTO "ArticleFts"("ArticleFts", rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;
