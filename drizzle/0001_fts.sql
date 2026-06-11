CREATE VIRTUAL TABLE `articles_fts` USING fts5(
  `title`, `content`,
  content='articles', content_rowid='id',
  tokenize='porter unicode61'
);
--> statement-breakpoint
CREATE TRIGGER `articles_ai` AFTER INSERT ON `articles` BEGIN
  INSERT INTO articles_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_ad` AFTER DELETE ON `articles` BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_au` AFTER UPDATE ON `articles` BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO articles_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
