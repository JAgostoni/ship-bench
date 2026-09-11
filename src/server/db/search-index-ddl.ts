// Pure DDL constant, no imports — safe for any runtime (Next, tsx, Vitest).
export const FTS5_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(
  title, summary, body_md,
  content = 'articles',
  content_rowid = 'id',
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS articles_search_ai AFTER INSERT ON articles BEGIN
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_ad AFTER DELETE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_au AFTER UPDATE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;
`;
