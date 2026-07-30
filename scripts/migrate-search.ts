// Migration script to add SQLite FTS5 virtual table for Article search
// Run with: ts-node scripts/migrate-search.ts
import { execSync } from 'child_process';
import prisma from '@/lib/prisma';

async function main() {
  // Create virtual table article_fts if not exists
  await prisma.$executeRaw`
    CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(
      id UNINDEXED,
      title,
      content,
      content='article',
      tokenize='porter'
    );
  `;
  // Populate initial data
  await prisma.$executeRaw`
    INSERT INTO article_fts(rowid, title, content)
    SELECT id, title, content FROM Article;
  `;
  // Triggers to keep sync
  await prisma.$executeRaw`
    CREATE TRIGGER IF NOT EXISTS article_ai AFTER INSERT ON Article BEGIN
      INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `;
  await prisma.$executeRaw`
    CREATE TRIGGER IF NOT EXISTS article_ad AFTER DELETE ON Article BEGIN
      DELETE FROM article_fts WHERE rowid = old.id;
    END;
  `;
  await prisma.$executeRaw`
    CREATE TRIGGER IF NOT EXISTS article_au AFTER UPDATE ON Article BEGIN
      UPDATE article_fts SET title = new.title, content = new.content WHERE rowid = new.id;
    END;
  `;
  console.log('FTS5 migration applied');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
