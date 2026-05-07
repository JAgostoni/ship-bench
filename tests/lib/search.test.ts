import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchArticles } from '@/src/lib/search';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'test-knowledge-base.db');
const REAL_DB_PATH = path.resolve(process.cwd(), 'data', 'knowledge-base.db');

function setupSearchTestDb() {
  // Rename real DB out of the way
  if (fs.existsSync(REAL_DB_PATH)) {
    fs.renameSync(REAL_DB_PATH, REAL_DB_PATH + '.backup');
  }
  // Copy test DB to real path (search.ts hardcodes this path)
  fs.copyFileSync(TEST_DB_PATH, REAL_DB_PATH);
}

function restoreRealDb() {
  if (fs.existsSync(REAL_DB_PATH)) {
    fs.unlinkSync(REAL_DB_PATH);
  }
  const backupPath = REAL_DB_PATH + '.backup';
  if (fs.existsSync(backupPath)) {
    fs.renameSync(backupPath, REAL_DB_PATH);
  }
}

function createTestSearchDb() {
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });

  // Delete existing test DB to avoid duplicate constraint failures
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = new Database(TEST_DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title, content,
      content='articles', content_rowid='rowid'
    );
  `);

  const articles = [
    { id: 'art-1', title: 'Getting Started Guide', content: 'Learn how to use the knowledge base. This article covers the basics.' },
    { id: 'art-2', title: 'Troubleshooting Common Errors', content: 'Fix connection timeout errors, database locked issues, and authentication failures.' },
    { id: 'art-3', title: 'API Reference', content: 'Complete API documentation for REST endpoints, search endpoints, and article management.' },
    { id: 'art-4', title: 'Database Architecture', content: 'SQLite database schema overview with tables, indexes, and triggers.' },
    { id: 'art-5', title: 'Design Tokens', content: 'Color palette, typography scale, and spacing system for the knowledge base UI.' },
  ];

  for (const a of articles) {
    db.prepare(
      'INSERT INTO articles (id, title, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(a.id, a.title, a.content, 'published', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');
  }
  // Sync FTS
  db.exec(`INSERT OR REPLACE INTO articles_fts (rowid, title, content) SELECT rowid, title, content FROM articles`);

  db.exec(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS article_categories (article_id TEXT NOT NULL, category_id TEXT NOT NULL, PRIMARY KEY (article_id, category_id))`);

  db.close();
}

describe('searchArticles', () => {
  beforeAll(() => {
    createTestSearchDb();
    setupSearchTestDb();
  });

  afterAll(() => {
    restoreRealDb();
  });

  it('returns results matching the query', () => {
    const result = searchArticles('database');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => r.title.toLowerCase().includes('database'))).toBe(true);
  });

  it('returns results for title matches', () => {
    const result = searchArticles('Getting Started');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].id).toBe('art-1');
  });

  it('returns results for content matches', () => {
    const result = searchArticles('timeout errors');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('respects limit option', () => {
    const result = searchArticles('knowledge', { limit: 1 });
    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  it('returns empty results for non-existent term', () => {
    const result = searchArticles('zzzznonexistent');
    expect(result.results).toEqual([]);
  });

  it('handles special FTS5 characters gracefully', () => {
    const result = searchArticles('test"query');
    expect(result.query).toBe('test"query');
  });

  it('returns results with rank and snippet info', () => {
    const result = searchArticles('API');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('rank');
    expect(result.results[0]).toHaveProperty('id');
    expect(result.results[0]).toHaveProperty('title');
    expect(result.results[0]).toHaveProperty('contentSnippet');
  });
});
