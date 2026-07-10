-- FTS5 virtual table for article title + plain content search
-- Managed outside Prisma models; bootstrapped via ensureFtsSchema() / seed.
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  article_id UNINDEXED,
  title,
  content,
  tokenize = 'unicode61'
);
