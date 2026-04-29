import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let counter = 0;

export function getTestDbPaths(suffix?: string) {
  const id = suffix || `test-${Date.now()}-${++counter}`;
  const relative = `file:./prisma/${id}.db`;
  const absolute = path.resolve(process.cwd(), 'prisma', `${id}.db`);
  return { relative, absolute, id };
}

export function resetTestDb(suffix?: string) {
  const { absolute } = getTestDbPaths(suffix);
  const dir = path.dirname(absolute);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Unlink if exists - close any open handles first by opening/closing
  if (fs.existsSync(absolute)) {
    try {
      const db = new Database(absolute);
      db.close();
    } catch {}
    try {
      fs.unlinkSync(absolute);
    } catch {}
  }

  const db = new Database(absolute);

  // Run base migration SQL
  const migrationPath = path.resolve(process.cwd(), 'prisma', 'migrations', '20250428_init', 'migration.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(migrationSql);

  // Run FTS5 setup
  const ftsSqlPath = path.resolve(process.cwd(), 'prisma', 'fts-setup.sql');
  const ftsSql = fs.readFileSync(ftsSqlPath, 'utf-8');
  db.exec(ftsSql);

  db.close();
}

export function createTestPrisma(suffix?: string): PrismaClient {
  const { relative } = getTestDbPaths(suffix);
  const adapter = new PrismaBetterSqlite3({ url: relative });
  return new PrismaClient({ adapter });
}
